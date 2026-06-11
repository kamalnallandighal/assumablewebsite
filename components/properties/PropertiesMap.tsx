'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Listing } from '../../lib/listings/types';
import type { Bbox } from '../../lib/listings/filters';
import { formatMoney, formatMoneyCompact } from '../../lib/format';

type BasemapMode = 'streets' | 'satellite';

const BASEMAP_STYLES: Record<BasemapMode, string> = {
  // Mapbox Standard: subtle 3D, soft colors, refined label hierarchy.
  // Falls back gracefully on older mapbox-gl versions.
  streets: 'mapbox://styles/mapbox/standard',
  // Satellite with road + city labels overlaid.
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
};

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

// Hard zoom threshold. Below: cluster bubbles only. At/above: price pills only.
// Matches the pattern used by Zillow / Trulia / Realtor — users expect zooming
// in past the cluster zoom to reveal individual listings.
//
// Set to 11 (not 12) because with our current 16-listing mock the initial
// fitBounds lands around zoom 9-10. Threshold of 11 means pills appear after
// a single zoom-in step, which feels responsive. Once ARMLS data lands at
// 27K listings, push this up to 12-13 so clusters keep working at city scale.
const MARKER_ZOOM_THRESHOLD = 11;

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
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const listingsRef = useRef<readonly Listing[]>(listings);
  listingsRef.current = listings;
  const [basemap, setBasemap] = useState<BasemapMode>('streets');
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

  // ---- Hover-preview popup helpers ----
  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const miniCardHtml = (l: Listing): string => {
    const street = l.address.split(',')[0] ?? l.address;
    const photo = l.photo
      ? `<img src="${escapeHtml(l.photo)}" alt="" loading="lazy" />`
      : `<div class="map-preview-photo-skel"></div>`;
    return `
      <div class="map-preview-card">
        ${photo}
        <div class="map-preview-info">
          <div class="map-preview-price">${escapeHtml(formatMoney(l.price))}</div>
          <div class="map-preview-address">${escapeHtml(street)}</div>
          <div class="map-preview-specs">${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sqft</div>
        </div>
      </div>
    `;
  };

  const showPopup = (
    map: mapboxgl.Map,
    lngLat: [number, number],
    cardsHtml: string
  ) => {
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: true,
        maxWidth: 'none',
        anchor: 'bottom',
        offset: 18,
        className: 'map-preview-popup'
      });
    }
    popupRef.current
      .setLngLat(lngLat)
      .setHTML(`<div class="map-preview-stack">${cardsHtml}</div>`)
      .addTo(map);
  };

  const hidePopup = () => {
    popupRef.current?.remove();
  };

  // ---- Layer setup (called on first load + after every style swap) ----
  const installCustomLayers = (map: mapboxgl.Map) => {
    if (map.getSource(SOURCE_ID)) return; // already installed for this style

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      // Source-side clustering ends at the same zoom we flip render modes —
      // so the source never has cluster features at marker zooms, and vice
      // versa. Single source of truth.
      clusterMaxZoom: MARKER_ZOOM_THRESHOLD,
      clusterRadius: 50
    });

    map.addLayer({
      id: CLUSTERS_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        // Steward sage green — matches the brand primary / CTA color.
        'circle-color': '#3D5A4F',
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 24, 50, 30],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.95
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
        'text-size': 13
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
    map.on('mouseenter', CLUSTERS_LAYER, (e) => {
      map.getCanvas().style.cursor = 'pointer';

      // Build a stacked-card preview of the leaves inside this cluster.
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties?.cluster_id;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!src || clusterId == null) return;

      src.getClusterLeaves(clusterId, 25, 0, (err, leaves) => {
        if (err || !leaves) return;
        const ids = new Set(
          leaves.map((l) => l.properties?.id).filter((id): id is string => typeof id === 'string')
        );
        const matches = listingsRef.current.filter((l) => ids.has(l.id));
        if (matches.length === 0) return;
        const html = matches.slice(0, 5).map(miniCardHtml).join('');
        const more =
          matches.length > 5
            ? `<div class="map-preview-more">+ ${matches.length - 5} more</div>`
            : '';
        showPopup(map, coords, html + more);
      });
    });
    map.on('mouseleave', CLUSTERS_LAYER, () => {
      map.getCanvas().style.cursor = '';
      hidePopup();
    });

    syncSource();
    applyViewMode();
  };

  // Mount map. initialBbox / fitListings are read once — passing different
  // values later does not re-center (the user owns the viewport after init).
  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLES.streets,
      center: PHOENIX_CENTER,
      zoom: 10,
      attributionControl: false
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-left'
    );
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      loadedRef.current = true;
      installCustomLayers(map);
      // Re-add custom layers + reapply view mode after any style swap.
      map.on('style.load', () => {
        installCustomLayers(map);
        applyViewMode();
      });
      // Single synchronous handler — flips between cluster bubbles and price
      // pills the moment we cross MARKER_ZOOM_THRESHOLD.
      map.on('zoom', applyViewMode);

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

  // Apply the hard zoom-threshold view mode synchronously on every zoom event.
  // No async, no race — one boolean gates both layers.
  //   zoom < threshold → cluster bubbles visible, DOM markers hidden
  //   zoom ≥ threshold → cluster bubbles hidden, DOM markers visible
  const applyViewMode = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const showMarkers = map.getZoom() >= MARKER_ZOOM_THRESHOLD;

    if (map.getLayer(CLUSTERS_LAYER)) {
      map.setLayoutProperty(
        CLUSTERS_LAYER,
        'visibility',
        showMarkers ? 'none' : 'visible'
      );
    }
    if (map.getLayer(CLUSTER_COUNT_LAYER)) {
      map.setLayoutProperty(
        CLUSTER_COUNT_LAYER,
        'visibility',
        showMarkers ? 'none' : 'visible'
      );
    }

    // Class-based toggle is more reliable than inline style.display swaps —
    // some browsers / mapbox marker wrappers leak inline styles in ways that
    // make `display = ''` fall back wrong.
    for (const [, m] of markersRef.current) {
      m.getElement().classList.toggle('price-pill-hidden', !showMarkers);
    }

    // Closing any open popup avoids a stale preview hanging over the wrong
    // layer during the transition.
    hidePopup();
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
      el.innerHTML = `<span class="${dotClass}"></span>${formatMoneyCompact(l.price)}`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(l.id);
      });
      el.addEventListener('mouseenter', () => {
        onHoverRef.current?.(l.id);
        const current = listingsRef.current.find((x) => x.id === l.id);
        if (current) showPopup(map, [l.lng, l.lat], miniCardHtml(current));
      });
      el.addEventListener('mouseleave', () => {
        onHoverRef.current?.(null);
        hidePopup();
      });
      const marker = new mapboxgl.Marker(el).setLngLat([l.lng, l.lat]).addTo(map);
      markersRef.current.set(l.id, marker);
    }
    syncSource();
    // Newly-added markers default to display='', so apply current view mode
    // immediately to hide them if we're below the zoom threshold.
    applyViewMode();
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

  // Swap basemap when the toggle changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setStyle(BASEMAP_STYLES[basemap]);
    // installCustomLayers re-runs via the 'style.load' handler wired in mount.
  }, [basemap]);

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

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Basemap toggle — top-right, mirrors Google Maps' Map/Satellite chip */}
      <div className="absolute top-4 right-4 z-10 bg-paper rounded-pill shadow-md border border-line flex overflow-hidden">
        <button
          type="button"
          onClick={() => setBasemap('streets')}
          aria-pressed={basemap === 'streets'}
          className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
            basemap === 'streets'
              ? 'bg-ink text-paper'
              : 'text-ink hover:bg-cream'
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setBasemap('satellite')}
          aria-pressed={basemap === 'satellite'}
          className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
            basemap === 'satellite'
              ? 'bg-ink text-paper'
              : 'text-ink hover:bg-cream'
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
});
