"use client";

import { useCallback, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import type { SpectralMode } from "@/types/sentinel";
import { buildTileUrl } from "@/services/sentinel";

const SENTINEL_SOURCE_ID = "sentinel-source";
const SENTINEL_LAYER_ID = "sentinel-layer";

/**
 * Hook for adding/removing/updating Sentinel Hub WMS layers on the map.
 */
export function useSentinelLayers(mapRef: React.RefObject<mapboxgl.Map | null>) {
  const currentModeRef = useRef<SpectralMode | null>(null);

  /**
   * Add or update the Sentinel layer with the given mode and date.
   */
  const setLayer = useCallback(
    (mode: SpectralMode, date: string) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const tileUrl = buildTileUrl(mode, date);

      // If source already exists, update it
      if (map.getSource(SENTINEL_SOURCE_ID)) {
        // Remove existing layer and source to update tiles
        if (map.getLayer(SENTINEL_LAYER_ID)) {
          map.removeLayer(SENTINEL_LAYER_ID);
        }
        map.removeSource(SENTINEL_SOURCE_ID);
      }

      map.addSource(SENTINEL_SOURCE_ID, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 512,
        attribution: "© Copernicus Sentinel Hub",
      });

      const is3D = map.getPitch() > 0;
      map.addLayer({
        id: SENTINEL_LAYER_ID,
        type: "raster",
        source: SENTINEL_SOURCE_ID,
        slot: "middle", // Embed in middle slot of Standard style
        layout: {
          visibility: is3D ? "none" : "visible",
        },
        paint: {
          "raster-opacity": 0,
          "raster-opacity-transition": { duration: 600 },
          "raster-fade-duration": 300,
          "raster-emissive-strength": 1.0,
        },
      } as any);

      // Smooth fade-in with zoom-dependent visibility interpolation
      requestAnimationFrame(() => {
        if (map.getLayer(SENTINEL_LAYER_ID)) {
          map.setPaintProperty(SENTINEL_LAYER_ID, "raster-opacity", [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            0.85, // Default active opacity
            14,
            0, // Fade out completely at zoom >= 14
          ]);
        }
      });

      currentModeRef.current = mode;
    },
    [mapRef]
  );

  /**
   * Remove the Sentinel layer from the map.
   */
  const removeLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer(SENTINEL_LAYER_ID)) {
      // Fade out before removing
      map.setPaintProperty(SENTINEL_LAYER_ID, "raster-opacity", 0);
      setTimeout(() => {
        if (map.getLayer(SENTINEL_LAYER_ID)) {
          map.removeLayer(SENTINEL_LAYER_ID);
        }
        if (map.getSource(SENTINEL_SOURCE_ID)) {
          map.removeSource(SENTINEL_SOURCE_ID);
        }
      }, 600);
    }

    currentModeRef.current = null;
  }, [mapRef]);

  /**
   * Set the layer opacity (0-1).
   */
  const setOpacity = useCallback(
    (opacity: number) => {
      const map = mapRef.current;
      if (!map || !map.getLayer(SENTINEL_LAYER_ID)) return;
      map.setPaintProperty(SENTINEL_LAYER_ID, "raster-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        opacity,
        14,
        0,
      ]);
    },
    [mapRef]
  );

  return {
    setLayer,
    removeLayer,
    setOpacity,
    currentMode: currentModeRef.current,
  };
}
