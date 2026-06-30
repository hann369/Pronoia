'use client';

// Bio-Synthetics sourcing network: ingredient/material origins arcing into
// the Pronoia hub (Berlin). Rendered client-only (maplibre needs the DOM).

import { Map, MapArc, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map';

const HUB = { name: 'Pronoia HQ · Berlin', lng: 13.405, lat: 52.52 };

const ORIGINS = [
  { name: 'Peru · Raw Cacao', lng: -75.0152, lat: -9.19 },
  { name: 'Indien · Ashwagandha', lng: 78.9629, lat: 20.5937 },
  { name: 'Japan · Matcha & Reishi', lng: 138.2529, lat: 36.2048 },
  { name: 'Neuseeland · Merino', lng: 174.886, lat: -40.9006 },
  { name: 'Portugal · Organic Textiles', lng: -8.2245, lat: 39.3999 },
  { name: 'Island · Marine Kollagen', lng: -19.0208, lat: 64.9631 },
];

const arcs = ORIGINS.map((o) => ({
  id: o.name,
  from: [o.lng, o.lat],
  to: [HUB.lng, HUB.lat],
}));

export default function SourcingMap() {
  return (
    <div
      style={{
        height: '440px',
        width: '100%',
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid var(--border, rgba(100,130,180,0.15))',
      }}
    >
      <Map center={[20, 30]} zoom={1.1} projection={{ type: 'globe' }}>
        <MapArc
          data={arcs}
          paint={{
            // maplibre paint can't read CSS variables — fixed cobalt accent
            'line-color': '#1A6AFF',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8,
          }}
        />

        <MapMarker longitude={HUB.lng} latitude={HUB.lat}>
          <MarkerContent>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#1A6AFF',
                border: '2px solid #fff',
                boxShadow: '0 0 10px rgba(26,106,255,0.8)',
              }}
            />
            <MarkerLabel
              position="top"
              className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold"
            >
              <span
                style={{
                  background: 'rgba(8,10,15,0.85)',
                  color: '#eef0f4',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                }}
              >
                {HUB.name}
              </span>
            </MarkerLabel>
          </MarkerContent>
        </MapMarker>

        {ORIGINS.map((o) => (
          <MapMarker key={o.name} longitude={o.lng} latitude={o.lat}>
            <MarkerContent>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00C48C',
                  border: '2px solid #fff',
                  boxShadow: '0 0 6px rgba(0,196,140,0.7)',
                }}
              />
              <MarkerLabel position="top">
                <span
                  style={{
                    background: 'rgba(8,10,15,0.85)',
                    color: '#a8b4c0',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.name}
                </span>
              </MarkerLabel>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
