'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Listing } from '../../lib/listings/types';
import { formatMoney } from '../../lib/format';

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PHOENIX_CENTER: [number, number] = [-112.074, 33.448];

export function PropertiesMap({ listings, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: PHOENIX_CENTER,
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [token]);

  // Sync markers when listings change
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
      const marker = new mapboxgl.Marker(el).setLngLat([l.lng, l.lat]).addTo(map);
      markersRef.current.set(l.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Selection styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('selected', id === selectedId);
    }
  }, [selectedId]);

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
}
