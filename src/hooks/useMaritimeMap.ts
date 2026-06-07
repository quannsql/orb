import { useEffect, useState, useRef, useCallback } from "react";
import * as mapboxgl from "mapbox-gl";
import type { ViewportState } from "@/types/map";

interface MaritimeState {
  mmsi: number;
  name: string;
  ship_type: number;
  latitude: number;
  longitude: number;
  sog: number; // Speed over ground
  cog: number; // Course over ground
  last_seen: number; // timestamp in ms
  is_stealth: boolean;
  is_military: boolean;
}

export function useMaritimeMap(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  viewport: ViewportState,
  isActive: boolean,
  isPerformanceMode = false
) {
  const [ships, setShips] = useState<Map<number, MaritimeState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stealthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of the currently subscribed bounding box to avoid spamming
  const subscribedBoundsRef = useRef<{ n: number, s: number, e: number, w: number } | null>(null);

  // Function to send subscription with current bounds
  const subscribeToBounds = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !mapRef.current) return;
    
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    const currentN = bounds.getNorth();
    const currentS = bounds.getSouth();
    const currentE = bounds.getEast();
    const currentW = bounds.getWest();

    // Check if current bounds are completely inside our subscribed bounds
    const sub = subscribedBoundsRef.current;
    if (sub) {
      if (currentN <= sub.n && currentS >= sub.s && currentE <= sub.e && currentW >= sub.w) {
        // We are still within the buffered area, no need to resubscribe
        return;
      }
    }

    // We moved outside the buffer. Calculate a new buffered bounding box (e.g., 50% larger)
    const latSpan = currentN - currentS;
    const lngSpan = currentE - currentW;
    
    const bufferLat = latSpan * 0.5;
    const bufferLng = lngSpan * 0.5;

    const newSub = {
      n: currentN + bufferLat,
      s: currentS - bufferLat,
      e: currentE + bufferLng,
      w: currentW - bufferLng,
    };
    subscribedBoundsRef.current = newSub;

    // aisstream expects [[lat_south, lon_west], [lat_north, lon_east]]
    const boundingBox = [
      [newSub.s, newSub.w],
      [newSub.n, newSub.e]
    ];

    const apiKey = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || "YOUR_API_KEY"; // Require user to set this in .env.local

    const subscriptionMessage = {
      APIKey: apiKey,
      BoundingBoxes: [boundingBox],
      FilterMessageTypes: ["PositionReport", "ShipStaticData"]
    };

    wsRef.current.send(JSON.stringify(subscriptionMessage));
  }, [mapRef]);

  // Handle WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    wsRef.current = new WebSocket("wss://stream.aisstream.io/v0/stream");
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      subscribedBoundsRef.current = null; // Reset bounds so it subscribes immediately
      subscribeToBounds();
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Auto-reconnect if still active
      if (isActive) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000); // Wait 3 seconds before reconnecting
      }
    };

    wsRef.current.onmessage = async (event) => {
      try {
        let jsonText = event.data;
        if (event.data instanceof Blob) {
          jsonText = await event.data.text();
        }
        const data = JSON.parse(jsonText);
        
        if (data.MessageType === "PositionReport") {
          const report = data.Message.PositionReport;
          const mmsi = report.UserID;
          
          setShips((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(mmsi);
            const isMilitary = existing ? existing.is_military : false;
            
            newMap.set(mmsi, {
              mmsi,
              name: existing?.name || `MMSI: ${mmsi}`,
              ship_type: existing?.ship_type || 0,
              latitude: report.Latitude,
              longitude: report.Longitude,
              sog: report.Sog,
              cog: report.Cog,
              last_seen: Date.now(),
              is_stealth: false,
              is_military: isMilitary,
            });
            return newMap;
          });
        } else if (data.MessageType === "ShipStaticData") {
          const report = data.Message.ShipStaticData;
          const mmsi = report.UserID;
          const shipType = report.Type;
          const isMilitary = shipType === 35 || shipType === 55; // 35: Military, 55: Law enforcement
          
          setShips((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(mmsi);
            if (existing) {
              newMap.set(mmsi, {
                ...existing,
                name: report.Name ? report.Name.trim() : existing.name,
                ship_type: shipType,
                is_military: isMilitary
              });
            } else {
              newMap.set(mmsi, {
                mmsi,
                name: report.Name ? report.Name.trim() : `MMSI: ${mmsi}`,
                ship_type: shipType,
                latitude: 0,
                longitude: 0,
                sog: 0,
                cog: 0,
                last_seen: Date.now(),
                is_stealth: false,
                is_military: isMilitary
              });
            }
            return newMap;
          });
        }
      } catch (err) {
        console.error("Error parsing AIS data", err);
      }
    };
  }, [isActive, subscribeToBounds]);

  useEffect(() => {
    if (isActive) {
      connectWebSocket();
    } else {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setShips(new Map());
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isActive, connectWebSocket]);

  // Re-subscribe when viewport changes
  useEffect(() => {
    if (isActive && isConnected) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        subscribeToBounds();
      }, 1000); // 1.0s debounce
    }
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    }
  }, [viewport, isActive, isConnected, subscribeToBounds]);

  const shipsRef = useRef(ships);
  useEffect(() => {
    shipsRef.current = ships;
  }, [ships]);

  // Stealth Mode Checker
  useEffect(() => {
    if (isActive) {
      stealthCheckIntervalRef.current = setInterval(() => {
        let hasChanges = false;
        const newMap = new Map(shipsRef.current);
        const now = Date.now();
        
        newMap.forEach((ship, mmsi) => {
          // If military ship hasn't been seen for > 3 minutes (180000 ms), mark as stealth
          // For testing we can use 30 seconds (30000 ms)
          if (ship.is_military && now - ship.last_seen > 180000 && !ship.is_stealth) {
            newMap.set(mmsi, { ...ship, is_stealth: true });
            hasChanges = true;
            
            // Trigger Global Event for UI alert
            const event = new CustomEvent("run-anomaly", {
              detail: { 
                anomalyDetected: true,
                threatLevel: "HIGH",
                confidenceScore: 90,
                analysis: `- MILITARY VESSEL ENTERED STEALTH MODE\n- MMSI: ${ship.mmsi} | Name: ${ship.name}\n- Last known coordinates: ${ship.latitude.toFixed(4)}, ${ship.longitude.toFixed(4)}\n- Radar cross-section lost.`
              }
            });
            document.dispatchEvent(event);
          }
          
          // Clean up old civilian ships (> 15 minutes)
          if (!ship.is_military && now - ship.last_seen > 900000) {
            newMap.delete(mmsi);
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          setShips(newMap);
        }
      }, 10000); // Check every 10 seconds
    } else {
      if (stealthCheckIntervalRef.current) clearInterval(stealthCheckIntervalRef.current);
    }

    return () => {
      if (stealthCheckIntervalRef.current) clearInterval(stealthCheckIntervalRef.current);
    };
  }, [isActive]);

  // Update MapBox Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isActive) return;

    const sourceId = "maritime-source";
    const layerId = "maritime-layer";

    if (!map.hasImage("ship-civilian")) {
      const img1 = new Image(24, 24);
      img1.onload = () => { if (map.hasImage("ship-civilian")) return; map.addImage("ship-civilian", img1); };
      img1.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="1"><path d="M4,10L12,2L20,10L18,22H6L4,10Z" /></svg>');
    }
    if (!map.hasImage("ship-military")) {
      const img2 = new Image(24, 24);
      img2.onload = () => { if (map.hasImage("ship-military")) return; map.addImage("ship-military", img2); };
      img2.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1"><path d="M3,12L12,2L21,12L19,22H5L3,12Z" /></svg>');
    }

    const shipArray = Array.from(ships.values())
      .filter(s => s.latitude !== 0 && s.longitude !== 0)
      .filter(s => !isPerformanceMode || s.is_military);

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: shipArray.map((s) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s.longitude, s.latitude],
        },
        properties: {
          mmsi: s.mmsi,
          name: s.name,
          rotation: s.cog || 0,
          isMilitary: s.is_military,
          isStealth: s.is_stealth,
          icon: s.is_military ? "ship-military" : "ship-civilian",
          sog: s.sog,
          ship_type: s.ship_type,
          last_seen: s.last_seen
        },
      })),
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: layerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-rotate": ["get", "rotation"],
          "icon-allow-overlap": true,
          "icon-size": 0.6,
        },
        paint: {
          "icon-opacity": ["case", ["get", "isStealth"], 0.5, 1],
        }
      });
      
      let popup: mapboxgl.Popup | null = null;
      let currentClickedMmsi: number | null = null;
      
      const updatePopupHTML = (props: any, aiState: "waiting" | "calculating" | "done" | "error", analysis?: string) => {
        const isMilitary = props.isMilitary;
        const isStealth = props.isStealth;
        const color = isStealth ? "#9ca3af" : isMilitary ? "#ef4444" : "#3b82f6";
        const stealthBadge = isStealth ? `<span style="background:#000; color:#ef4444; border: 1px solid #ef4444; padding:1px 4px; border-radius:2px; font-size:9px; margin-left:4px" class="animate-pulse">STEALTH / DARK MODE</span>` : "";

        let aiSection = "";
        if (aiState === "calculating") {
          aiSection = `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed ${color}33; color:#a855f7" class="animate-pulse">[AI] CALCULATING TRAJECTORY...</div>`;
        } else if (aiState === "done" && analysis) {
          aiSection = `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed ${color}33; color:#a855f7; font-size:9px; line-height:1.4;"><strong>[GROK 4.3 TACTICAL]</strong><br/>${analysis}</div>`;
        } else if (aiState === "error") {
          aiSection = `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed ${color}33; color:#ef4444;">[AI] TRAJECTORY CALC FAILED</div>`;
        }

        return `
          <div style="background:rgba(0,0,0,0.9); border:1px solid ${color}; color:white; padding:10px; font-family:monospace; font-size:11px; border-radius:4px; min-width:175px; max-width:250px;">
            <div style="color:${color}; font-weight:bold; font-size:13px; margin-bottom:2px;">${props.name} ${stealthBadge}</div>
            <div style="color:#737373; font-size:10px;">MMSI: ${props.mmsi}</div>
            <hr style="border-color:${color}33; margin:5px 0;">
            <div style="color:#737373;">Type: <span style="color:white">${props.ship_type}</span></div>
            <div style="color:#737373;">Speed: <span style="color:white">${props.sog} knots</span></div>
            <div style="color:#737373;">Course: <span style="color:white">${props.rotation}°</span></div>
            <div style="color:#525252; font-size:9px; margin-top:4px">Last seen: ${Math.round((Date.now() - props.last_seen)/1000)}s ago</div>
            ${aiSection}
          </div>
        `;
      };

      const drawPredictionLine = (coordinates: number[][], color: string) => {
        if (!map) return;
        const lineGeoJson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coordinates
            }
          }]
        };
        if (map.getSource("maritime-prediction-source")) {
          (map.getSource("maritime-prediction-source") as mapboxgl.GeoJSONSource).setData(lineGeoJson);
        } else {
          map.addSource("maritime-prediction-source", { type: "geojson", data: lineGeoJson });
          map.addLayer({
            id: "maritime-prediction-layer",
            type: "line",
            source: "maritime-prediction-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": color,
              "line-width": 2,
              "line-dasharray": [2, 4],
              "line-opacity": 0.8
            }
          });
        }
      };

      const removePredictionLine = () => {
        if (map && map.getSource("maritime-prediction-source")) {
          (map.getSource("maritime-prediction-source") as mapboxgl.GeoJSONSource).setData({
            type: "FeatureCollection", features: []
          });
        }
      };

      const handleClick = async (e: any) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        const mmsi = props.mmsi;
        currentClickedMmsi = mmsi;
        
        // Remove existing popup if any
        if (popup) {
          popup.remove();
        }

        popup = new mapboxgl.Popup({ 
          closeButton: false, 
          closeOnClick: true, 
          className: "cyber-popup",
          maxWidth: "300px"
        });

        // Add close event listener to clean up the line when clicking outside
        popup.on("close", () => {
           currentClickedMmsi = null;
           removePredictionLine();
        });

        popup.setLngLat(coordinates).setHTML(updatePopupHTML(props, "calculating")).addTo(map);

        // Clear existing line
        removePredictionLine();

        try {
          const res = await fetch("/api/ai/predict-trajectory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mmsi: props.mmsi,
              name: props.name,
              lat: coordinates[1],
              lng: coordinates[0],
              sog: props.sog,
              cog: props.rotation,
              shipType: props.ship_type,
              isMilitary: props.isMilitary
            })
          });
          const data = await res.json();
          
          if (currentClickedMmsi !== mmsi) return; // User closed popup or clicked another ship

          if (data && data.predictedPath) {
            const fullPath = [[coordinates[0], coordinates[1]], ...data.predictedPath];
            drawPredictionLine(fullPath, props.isMilitary ? "#ef4444" : "#a855f7");
            if (popup && popup.isOpen()) popup.setHTML(updatePopupHTML(props, "done", data.analysis));
          } else {
            if (popup && popup.isOpen()) popup.setHTML(updatePopupHTML(props, "error"));
          }
        } catch (err) {
          if (currentClickedMmsi === mmsi && popup && popup.isOpen()) {
             popup.setHTML(updatePopupHTML(props, "error"));
          }
        }
      };

      const handleMouseEnter = () => {
        if (map) map.getCanvas().style.cursor = "pointer";
      };

      const handleMouseLeave = () => {
        if (map) map.getCanvas().style.cursor = "";
      };

      map.on("click", layerId, handleClick);
      map.on("mouseenter", layerId, handleMouseEnter);
      map.on("mouseleave", layerId, handleMouseLeave);
      
      (map as any)._maritimeHoverCleanup = () => {
        map.off("click", layerId, handleClick);
        map.off("mouseenter", layerId, handleMouseEnter);
        map.off("mouseleave", layerId, handleMouseLeave);
        if (popup) popup.remove();
        removePredictionLine();
      };
    }

    return () => {
      // We don't cleanup here immediately because useEffect triggers on every update. 
      // Cleanup is handled when isActive becomes false.
    };
  }, [mapRef, ships, isActive, isPerformanceMode]);

  // Clean up layer on deactivate
  useEffect(() => {
    if (!isActive) {
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        if ((map as any)._maritimeHoverCleanup) {
          (map as any)._maritimeHoverCleanup();
        }
        if (map.getLayer("maritime-layer")) map.removeLayer("maritime-layer");
        if (map.getSource("maritime-source")) map.removeSource("maritime-source");
      }
    }
  }, [isActive, mapRef]);

  return { ships, isConnected };
}
