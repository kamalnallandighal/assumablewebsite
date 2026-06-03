'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Listing } from '../../lib/listings/types';
import type { Bbox } from '../../lib/listings/filters';
import { formatMoney } from '../../lib/format';

export interface PropertiesMapHandle {
  flyToBbox(b: Bbox): void;
  flyTo(center: [number, number], zoom?: number): void;
}

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Optional bbox to restore from URL on mount. After mount, the map owns
  // its viewport and only emits changes via onBoundsChange.
  initialBbox?: Bbox | null;
  // Fallback fit target when no initialBbox: use these listings' extent.
  fitListings?: readonly Listing[];
  onBoundsChange?: (b: Bbox) => void;
  // Hovered marker for sync from sidebar (Phase 1.4).
  hoveredId?: string | null;
  // Emitted when the user hovers a price-pill marker.
  onHover?: (id: string | null) => void;
}

const PHOENIX_CENTER: [number, number] = [-112.074, 33.448];
const SOURCE_ID = 'listings-src';
const CLUSTERS_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';

function toGeoJSON(items: readonly Listing[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: items.map((l) => ({
      type: 'Feature',
      properties: { id: l.id, price: l.price, loanType: l.loanType ?? null },
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] }
    }))
  };
}

function computeFit(items: readonly { lat: number; lng: number }[]): mapboxgl.LngLatBounds | null {
  if (items.length === 0) return null;
  const b = new mapboxgl.LngLatBounds();
  for (const i of items) b.extend([i.lng, i.lat]);
  return b;
}

export const PropertiesMap = forwardRef<PropertiesMapHandle, Props>(function PropertiesMap(
  {
    listings,
    selectedId,
    onSelect,
    initialBbox,
    fitListings,
    onBoundsChange,
    hoveredId,
    onHover
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onBoundsRef = useRef(onBoundsChange);
  onBoundsRef.current = onBoundsChange;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useImperativeHandle(
    ref,
    () => ({
      flyToBbox(b) {
        const map = mapRef.current;
        if (!map) return;
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]]
          ],
          { padding: 60, maxZoom: 15 }
        );
      },
      flyTo(center, zoom) {
        mapRef.current?.flyTo({ center, zoom: zoom ?? 13 });
      }
    }),
    []
  );

  // Mount map. initialBbox / fitListings are read once — passing different
  // values later does not re-center (the user owns the viewport after init).
  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: PHOENIX_CENTER,
      zoom: 10
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      loadedRef.current = true;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50
      });

      map.addLayer({
        id: CLUSTERS_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0F1623',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: { 'text-color': '#ffffff' }
      });

      // Click cluster → zoom to expansion level
      map.on('click', CLUSTERS_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTERS_LAYER] });
        const cluster = features[0];
        if (!cluster) return;
        const clusterId = cluster.properties?.cluster_id;
        const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const coords = (cluster.geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom ?? map.getZoom() + 1 });
        });
      });
      map.on('mouseenter', CLUSTERS_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', CLUSTERS_LAYER, () => {
        map.getCanvas().style.cursor = '';
      });

      // Hide DOM markers that the cluster source has rolled up.
      map.on('idle', refreshClusterVisibility);

      // Initial fit + data sync (deferred to next tick so source is registered).
      syncSource();
      refreshClusterVisibility();

      if (initialBbox) {
        map.fitBounds(
          [
            [initialBbox[0], initialBbox[1]],
            [initialBbox[2], initialBbox[3]]
          ],
          { padding: 40, animate: false }
        );
      } else if (fitListings && fitListings.length > 0) {
        const b = computeFit(fitListings);
        if (b) map.fitBounds(b, { padding: 60, animate: false, maxZoom: 14 });
      }
    });

    const emitBounds = () => {
      const b = map.getBounds();
      if (!b) return;
      const out: Bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      onBoundsRef.current?.(out);
    };

    map.on('moveend', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(emitBounds, 300);
    });

    mapRef.current = map;
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Push current listings into the GeoJSON source (and rebuild DOM markers).
  const syncSource = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(toGeoJSON(listings));
  };

  // For each cluster currently in the source, mark its leaf IDs as clustered
  // and hide their DOM markers. Markers not in any cluster stay visible.
  const refreshClusterVisibility = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const clusters = map.querySourceFeatures(SOURCE_ID, { filter: ['has', 'point_count'] });
    if (clusters.length === 0) {
      for (const [, m] of markersRef.current) m.getElement().style.display = '';
      return;
    }
    const clustered = new Set<string>();
    let pending = clusters.length;
    const apply = () => {
      for (const [id, m] of markersRef.current) {
        m.getElement().style.display = clustered.has(id) ? 'none' : '';
      }
    };
    for (const cluster of clusters) {
      const clusterId = cluster.properties?.cluster_id;
      if (clusterId == null) {
        pending--;
        if (pending === 0) apply();
        continue;
      }
      src.getClusterLeaves(clusterId, Infinity, 0, (err, leaves) => {
        if (!err && leaves) {
          for (const leaf of leaves) {
            const id = leaf.properties?.id;
            if (typeof id === 'string') clustered.add(id);
          }
        }
        pending--;
        if (pending === 0) apply();
      });
    }
  };

  // Sync markers + source when listings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const live = new Set(listings.map((l) => l.id));
    for (const [id, m] of markersRef.current) {
      if (!live.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
    for (const l of listings) {
      if (markersRef.current.has(l.id)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'price-pill';
      if (l.id === selectedId) el.classList.add('selected');
      const dotClass = l.loanType
        ? `price-pill-dot price-pill-dot-${l.loanType.toLowerCase()}`
        : 'price-pill-dot';
      el.innerHTML = `<span class="${dotClass}"></span>${formatMoney(l.price)}`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(l.id);
      });
      el.addEventListener('mouseenter', () => onHoverRef.current?.(l.id));
      el.addEventListener('mouseleave', () => onHoverRef.current?.(null));
      const marker = new mapboxgl.Marker(el).setLngLat([l.lng, l.lat]).addTo(map);
      markersRef.current.set(l.id, marker);
    }
    syncSource();
    refreshClusterVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Selection styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('selected', id === selectedId);
    }
  }, [selectedId]);

  // Hover styling (Phase 1.4)
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('hovered', id === hoveredId);
    }
  }, [hoveredId]);

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-line text-center p-6">
        <div className="text-sm text-muted max-w-sm">
          Map requires{' '}
          <code className="px-1 py-0.5 bg-paper rounded text-ink">NEXT_PUBLIC_MAPBOX_TOKEN</code>.
          <br />
          Add it to <code className="px-1 py-0.5 bg-paper rounded text-ink">.env.local</code> (see{' '}
          <code className="px-1 py-0.5 bg-paper rounded text-ink">.env.local.example</code>).
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
});
