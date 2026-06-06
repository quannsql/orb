"use client";

import { useEffect, useRef, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import type { Feature, Polygon, GeoJsonProperties } from "geojson";
import GlowButton from "@/components/ui/GlowButton";

interface DrawToolsProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  onPolygonCreated: (feature: Feature<Polygon, GeoJsonProperties>) => void;
  onPolygonDeleted: () => void;
  className?: string;
}

/**
 * Polygon drawing tool integration using @mapbox/mapbox-gl-draw.
 * Loaded dynamically to avoid SSR issues.
 */
export default function DrawTools({
  mapRef,
  isMapLoaded,
  onPolygonCreated,
  onPolygonDeleted,
  className = "",
}: DrawToolsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRef = useRef<any>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let drawInstance: any = null;
    const map = mapRef.current;

    const setupDraw = async () => {
      if (!map || !isMapLoaded || isInitialized.current) return;

      // Dynamic import to avoid SSR
      const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;
      await import("@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css");

      if (!isMounted) return; // Prevent memory leak if unmounted while loading

      drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "simple_select",
        styles: [
          // Polygon fill
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "fill-color": "rgba(255, 255, 255, 0.08)",
              "fill-outline-color": "rgba(255, 255, 255, 0.4)",
            },
          },
          // Polygon outline
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "line-color": "#ffffff",
              "line-width": 2,
              "line-dasharray": [2, 2],
            },
          },
          // Vertex points
          {
            id: "gl-draw-polygon-and-line-vertex-active",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            paint: {
              "circle-radius": 5,
              "circle-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-stroke-color": "rgba(255, 255, 255, 0.4)",
            },
          },
          // Line connecting vertices
          {
            id: "gl-draw-line",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
            paint: {
              "line-color": "#ffffff",
              "line-width": 2,
            },
          },
          // Midpoint vertices
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: ["all", ["==", "meta", "midpoint"], ["==", "$type", "Point"]],
            paint: {
              "circle-radius": 3,
              "circle-color": "rgba(255, 255, 255, 0.6)",
            },
          },
        ],
      });

      map.addControl(drawInstance, "top-left");
      drawRef.current = drawInstance;
      isInitialized.current = true;

      const handleCreate = (e: any) => {
        const polygon = e.features[0] as Feature<Polygon, GeoJsonProperties>;
        if (polygon) onPolygonCreated(polygon);
      };

      const handleUpdate = (e: any) => {
        const polygon = e.features[0] as Feature<Polygon, GeoJsonProperties>;
        if (polygon) onPolygonCreated(polygon);
      };

      const handleDelete = () => {
        onPolygonDeleted();
      };

      map.on("draw.create", handleCreate);
      map.on("draw.update", handleUpdate);
      map.on("draw.delete", handleDelete);

      // Store cleanup on instance so we can call it on unmount
      drawInstance._cleanupListeners = () => {
        map.off("draw.create", handleCreate);
        map.off("draw.update", handleUpdate);
        map.off("draw.delete", handleDelete);
      };
    };

    setupDraw();

    return () => {
      isMounted = false;
      if (drawInstance && map) {
        if (drawInstance._cleanupListeners) {
          drawInstance._cleanupListeners();
        }
        try {
          map.removeControl(drawInstance);
        } catch (e) {
          console.warn("Error removing draw control", e);
        }
      }
      drawRef.current = null;
      isInitialized.current = false;
    };
  }, [mapRef, isMapLoaded, onPolygonCreated, onPolygonDeleted]);

  const startDrawing = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.changeMode("draw_polygon");
    }
  }, []);

  const deleteAll = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      onPolygonDeleted();
    }
  }, [onPolygonDeleted]);

  return (
    <div className={`fixed z-30 flex flex-col gap-1.5 transition-all duration-300 ${className}`} id="draw-tools">
      <GlowButton
        onClick={startDrawing}
        size="sm"
        variant="white"
        id="draw-polygon-btn"
      >
        ▣ Draw
      </GlowButton>
      <GlowButton
        onClick={deleteAll}
        size="sm"
        variant="ghost"
        className="!text-neutral-400 hover:!text-white"
        id="delete-polygon-btn"
      >
        ✕ Clear
      </GlowButton>
    </div>
  );
}
