"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import type { ViewportState } from "@/types/map";
import { MAP_CONFIG } from "@/lib/constants";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/**
 * Custom hook for managing the Mapbox GL JS map instance.
 */
export function useMapbox(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isPerformanceMode = false
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    center: MAP_CONFIG.defaultCenter,
    zoom: MAP_CONFIG.defaultZoom,
    bearing: MAP_CONFIG.defaultBearing,
    pitch: MAP_CONFIG.defaultPitch,
  });
  const [cursorLngLat, setCursorLngLat] = useState<[number, number] | null>(
    null
  );

  const isPerfRef = useRef(isPerformanceMode);
  useEffect(() => {
    isPerfRef.current = isPerformanceMode;
  }, [isPerformanceMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      pitch: MAP_CONFIG.defaultPitch,
      bearing: MAP_CONFIG.defaultBearing,
      maxZoom: MAP_CONFIG.maxZoom,
      minZoom: MAP_CONFIG.minZoom,
      antialias: true,
      projection: "globe",
    });

    // Add atmospheric fog and configure Mapbox v3 Standard Style features
    map.on("style.load", () => {
      // 1. Set light preset to night and explicitly enable all 3D features
      // 1. Set light preset to night and explicitly disable all 3D features initially (starting in 2D)
      try {
        (map as any).setConfigProperty("basemap", "lightPreset", "night");
        (map as any).setConfigProperty("basemap", "show3dObjects", false);
        (map as any).setConfigProperty("basemap", "show3dBuildings", false);
        (map as any).setConfigProperty("basemap", "show3dTrees", false);
        (map as any).setConfigProperty("basemap", "show3dLandmarks", false);
      } catch (err) {
        console.warn("Could not set Standard style configuration properties:", err);
      }

      // Add official Mapbox satellite imagery as the base layer in the bottom slot
      if (!map.getSource("mapbox-satellite")) {
        map.addSource("mapbox-satellite", {
          type: "raster",
          url: "mapbox://mapbox.satellite",
          tileSize: 256,
        });
        map.addLayer({
          id: "mapbox-satellite-layer",
          type: "raster",
          source: "mapbox-satellite",
          slot: "middle",
          paint: {
            "raster-emissive-strength": 1.0,
          },
        } as any);
      }

      // 2. Enable 3D Terrain (Disabled by default to avoid bumpy roads/warped 3D landmarks in flat urban zones)
      /*
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({
          source: "mapbox-dem",
          exaggeration: MAP_CONFIG.terrain3DExaggeration,
        });
      }
      */

      // 3. Customize atmospheric fog for a Cyberpunk aesthetic
      map.setFog({
        color: MAP_CONFIG.fogColor,
        "high-color": MAP_CONFIG.fogHighColor,
        "horizon-blend": MAP_CONFIG.fogHorizonBlend,
        "star-intensity": MAP_CONFIG.fogStarIntensity,
        "space-color": "#0a0a0f",
      });

      // 4. Load the 3D GLTF model natively (local origin to avoid CORS errors)
      try {
        const modelUrl = typeof window !== "undefined" 
          ? window.location.origin + "/radar.glb" 
          : "/radar.glb";
          
        (map as any).addModel("glowing-antenna", modelUrl);

        // 5. Add GeoJSON source and render 3D radar markers in the middle slot
        const markerFeatures = MAP_CONFIG.markers.map((m) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: m.coordinates,
          },
          properties: {
            name: m.name,
          },
        }));

        map.addSource("cyber-markers-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: markerFeatures as any,
          },
        });

        map.addLayer({
          id: "cyber-3d-markers",
          type: "model",
          source: "cyber-markers-source",
          slot: "middle", // Place in middle slot above standard terrain but below place labels
          layout: {
            "model-id": "glowing-antenna",
          },
          paint: {
            "model-scale": [35, 35, 35], // Make scale larger so they are clearly visible
            "model-rotation": [0, 0, 90],
            "model-color": "#00f0ff", // Neon Cyan glow
            "model-color-mix-intensity": 0.85,
          },
        } as any);
      } catch (err) {
        console.error("Error loading 3D GLTF models or layers:", err);
      }
    });

    map.on("load", () => {
      setIsLoaded(true);
    });

    // Track viewport changes
    const updateViewport = () => {
      const center = map.getCenter();
      setViewport({
        center: [center.lng, center.lat],
        zoom: Math.round(map.getZoom() * 100) / 100,
        bearing: Math.round(map.getBearing() * 10) / 10,
        pitch: Math.round(map.getPitch() * 10) / 10,
      });
    };

    map.on("moveend", updateViewport);
    map.on("zoomend", updateViewport);
    map.on("pitchend", updateViewport);
    map.on("rotateend", updateViewport);

    // Track cursor position
    map.on("mousemove", (e) => {
      setCursorLngLat([e.lngLat.lng, e.lngLat.lat]);
    });

    map.on("mouseout", () => {
      setCursorLngLat(null);
    });

    let was3D = false;
    const handlePitchChange = () => {
      const pitch = map.getPitch();
      const is3D = pitch > 0;
      const shouldShow3D = is3D && !isPerfRef.current;
      if (shouldShow3D === was3D) return;
      was3D = shouldShow3D;

      try {
        (map as any).setConfigProperty("basemap", "show3dObjects", shouldShow3D);
        (map as any).setConfigProperty("basemap", "show3dBuildings", shouldShow3D);
        (map as any).setConfigProperty("basemap", "show3dTrees", shouldShow3D);
        (map as any).setConfigProperty("basemap", "show3dLandmarks", shouldShow3D);

        if (map.getLayer("mapbox-satellite-layer")) {
          map.setLayoutProperty(
            "mapbox-satellite-layer",
            "visibility",
            shouldShow3D ? "none" : "visible"
          );
        }

        if (map.getLayer("sentinel-layer")) {
          map.setLayoutProperty(
            "sentinel-layer",
            "visibility",
            shouldShow3D ? "none" : "visible"
          );
        }
      } catch (err) {
        console.warn("Error toggling 3D properties on pitch:", err);
      }
    };

    map.on("pitch", handlePitchChange);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef]);

  const flyTo = useCallback(
    (lng: number, lat: number, zoom?: number) => {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: zoom || mapRef.current.getZoom(),
        duration: 2000,
        essential: true,
      });
    },
    []
  );

  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const toggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentPitch = map.getPitch();
    map.easeTo({
      pitch: currentPitch > 0 ? 0 : 60,
      duration: 800,
    });
  }, []);

  const resetBearing = useCallback(() => {
    mapRef.current?.easeTo({ bearing: 0, duration: 500 });
  }, []);

  return {
    map: mapRef.current,
    mapRef,
    isLoaded,
    viewport,
    cursorLngLat,
    flyTo,
    zoomIn,
    zoomOut,
    toggle3D,
    resetBearing,
  };
}
