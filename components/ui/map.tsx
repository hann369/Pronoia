"use client";

// Trimmed mapcn map for Pronoia: Map + markers + arcs (no popups/clusters/controls).
// Used by the Bio-Synthetics sourcing network visual.

import MapLibreGL, { type MarkerOptions } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// Pronoia is dark-themed: default to the dark basemap.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

type MapRef = MapLibreGL.Map;

type MapProps = {
  children?: ReactNode;
  className?: string;
  /** Map style URL; defaults to a dark basemap matching Pronoia. */
  styleUrl?: string;
  projection?: MapLibreGL.ProjectionSpecification;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, className, styleUrl = DARK_STYLE, projection, ...props },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: styleUrl,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...props,
    });

    const loadHandler = () => {
      setIsLoaded(true);
      if (projection) map.setProjection(projection);
    };

    map.on("load", loadHandler);
    setMapInstance(map);

    return () => {
      map.off("load", loadHandler);
      map.remove();
      setIsLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo(
    () => ({ map: mapInstance, isLoaded }),
    [mapInstance, isLoaded],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative h-full w-full", className)}>
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

// ── Markers ──────────────────────────────────────────────────────────────────
type MarkerContextValue = {
  marker: MapLibreGL.Marker;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
} & Omit<MarkerOptions, "element">;

function MapMarker({ longitude, latitude, children, ...markerOptions }: MapMarkerProps) {
  const { map } = useMap();

  const marker = useMemo(() => {
    return new MapLibreGL.Marker({
      ...markerOptions,
      element: document.createElement("div"),
    }).setLngLat([longitude, latitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => {
      marker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (marker.getLngLat().lng !== longitude || marker.getLngLat().lat !== latitude) {
    marker.setLngLat([longitude, latitude]);
  }

  return (
    <MarkerContext.Provider value={{ marker }}>{children}</MarkerContext.Provider>
  );
}

function MarkerContent({ children, className }: { children?: ReactNode; className?: string }) {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative", className)}>
      {children || (
        <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
      )}
    </div>,
    marker.getElement(),
  );
}

function MarkerLabel({
  children,
  className,
  position = "top",
}: {
  children: ReactNode;
  className?: string;
  position?: "top" | "bottom";
}) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
        "text-foreground text-[10px] font-medium",
        positionClasses[position],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Arcs ─────────────────────────────────────────────────────────────────────
type MapArcDatum = {
  id: string | number;
  from: [number, number];
  to: [number, number];
};

type MapArcLinePaint = NonNullable<MapLibreGL.LineLayerSpecification["paint"]>;

type MapArcProps<T extends MapArcDatum = MapArcDatum> = {
  data: T[];
  id?: string;
  curvature?: number;
  samples?: number;
  paint?: MapArcLinePaint;
};

const DEFAULT_ARC_PAINT: MapArcLinePaint = {
  "line-color": "#4285F4",
  "line-width": 2,
  "line-opacity": 0.85,
};

function buildArcCoordinates(
  from: [number, number],
  to: [number, number],
  curvature: number,
  samples: number,
): [number, number][] {
  const [x0, y0] = from;
  const [x2, y2] = to;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || curvature === 0) return [from, to];

  const mx = (x0 + x2) / 2;
  const my = (y0 + y2) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  const points: [number, number][] = [];
  const segments = Math.max(2, Math.floor(samples));
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x2;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

function MapArc<T extends MapArcDatum = MapArcDatum>({
  data,
  id: propId,
  curvature = 0.2,
  samples = 64,
  paint,
}: MapArcProps<T>) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `arc-source-${id}`;
  const layerId = `arc-layer-${id}`;

  const mergedPaint = useMemo(
    () => ({ ...DEFAULT_ARC_PAINT, ...paint }),
    [paint],
  );

  const geoJSON = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: "FeatureCollection",
      features: data.map((arc) => {
        const { from, to, ...properties } = arc;
        return {
          type: "Feature",
          properties,
          geometry: {
            type: "LineString",
            coordinates: buildArcCoordinates(from, to, curvature, samples),
          },
        };
      }),
    }),
    [data, curvature, samples],
  );

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, { type: "geojson", data: geoJSON });
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: mergedPaint,
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    source?.setData(geoJSON);
  }, [isLoaded, map, geoJSON, sourceId]);

  return null;
}

export { Map, useMap, MapMarker, MarkerContent, MarkerLabel, MapArc };
export type { MapRef, MapArcDatum };
