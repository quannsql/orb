import { useEffect, useState, useRef, useCallback } from "react";
import * as mapboxgl from "mapbox-gl";
import type { ViewportState } from "@/types/map";

interface FlightState {
  icao24: string;
  callsign: string;
  registration: string | null;
  aircraft_type: string | null;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number | null;
  alt_geom: number | null;
  velocity: number;
  vert_rate: number | null;
  true_track: number;
  squawk: string | null;
  squawk_alert: "EMERGENCY" | "RADIO_FAIL" | "HIJACK" | null;
  emergency: string | null;
  spi: boolean;
  category: number;
  is_interesting: boolean;
  is_pia: boolean;
  is_ladd: boolean;
  signal_quality: number | null;
  seen: number | null;
}

export function useOsintMap(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  viewport: ViewportState,
  isActive: boolean
) {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchFlights = useCallback(async () => {
    if (!mapRef.current || !isActive) return;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    setIsScanning(true);
    try {
      const res = await fetch(`/api/osint/flights?lamin=${bounds.getSouth()}&lomin=${bounds.getWest()}&lamax=${bounds.getNorth()}&lomax=${bounds.getEast()}`);
      if (!res.ok) throw new Error("Failed to fetch flights");
      
      const data = await res.json();
      setFlights(data.flights || []);
      setLastScanTime(new Date());
      
      // Update MapBox Layer
      updateMapLayer(data.flights || []);
    } catch (err) {
      console.error("OSINT Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  }, [isActive, mapRef]);

  const updateMapLayer = useCallback((flightData: FlightState[]) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = "osint-flights-source";
    const layerId = "osint-flights-layer";

    // Add custom plane icons if they don't exist
    if (!map.hasImage("plane-civilian")) {
      const img1 = new Image(24, 24);
      img1.onload = () => { if (map.hasImage("plane-civilian")) return; map.addImage("plane-civilian", img1); };
      img1.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00f0ff" stroke="#ffffff" stroke-width="0.5"><path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" /></svg>');
    }
    if (!map.hasImage("plane-military")) {
      const img2 = new Image(24, 24);
      img2.onload = () => { if (map.hasImage("plane-military")) return; map.addImage("plane-military", img2); };
      img2.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff0055" stroke="#ffffff" stroke-width="0.5"><path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" /></svg>');
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: flightData.map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.longitude, f.latitude],
        },
        properties: {
          icao24: f.icao24,
          callsign: f.callsign,
          registration: f.registration || "",
          aircraft_type: f.aircraft_type || "",
          rotation: f.true_track || 0,
          isMilitary:
            f.category === 20 ||
            f.squawk_alert === "HIJACK" ||
            f.is_interesting,
          isEmergency: f.squawk_alert === "EMERGENCY" || !!f.emergency,
          icon:
            f.squawk_alert === "HIJACK" || f.category === 20 ? "plane-military"
            : "plane-civilian",
          origin_country: f.origin_country || "Unknown",
          altitude: f.altitude,
          alt_geom: f.alt_geom,
          velocity: f.velocity,
          vert_rate: f.vert_rate ?? "",
          squawk: f.squawk || "----",
          squawk_alert: f.squawk_alert || "",
          emergency: f.emergency || "",
          is_pia: f.is_pia,
          is_ladd: f.is_ladd,
          seen: f.seen ?? "",
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
          "icon-size": 0.8,
        },
      });
      
      // Add a label layer for the callsign
      map.addLayer({
        id: `${layerId}-labels`,
        type: "symbol",
        source: sourceId,
        layout: {
          "text-field": ["get", "callsign"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-size": 10,
        },
        paint: {
          "text-color": [
            "case",
            ["get", "isEmergency"], "#ffdd00",
            ["get", "isMilitary"], "#ff0055",
            "#00f0ff"
          ],
        },
      });

      // Hover interaction logic
      let popup: mapboxgl.Popup | null = null;

      const handleMouseEnter = (e: any) => {
        map.getCanvas().style.cursor = "pointer";
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const isEmergency = props.isEmergency;
        const isMilitary = props.isMilitary;
        const color = isEmergency ? "#ffdd00" : isMilitary ? "#ff0055" : "#00f0ff";

        // Vertical rate indicator
        const vr = Number(props.vert_rate);
        const vrIcon = !props.vert_rate ? "" : vr > 200 ? " ↑" : vr < -200 ? " ↓" : " →";
        const vrStr = props.vert_rate ? `${vr > 0 ? "+" : ""}${Math.round(vr)} ft/min${vrIcon}` : "---";

        // Special badges
        const alertBadge = props.squawk_alert
          ? `<span style="background:${isEmergency?"#ffdd00":"#ff0055"}; color:black; padding:1px 4px; border-radius:2px; font-size:9px; font-weight:bold; margin-left:4px">${props.squawk_alert}</span>`
          : "";
        const piaBadge  = props.is_pia  ? `<span style="background:#7c3aed; color:white; padding:1px 4px; border-radius:2px; font-size:9px; margin-left:4px">PIA</span>` : "";
        const laddBadge = props.is_ladd ? `<span style="background:#1d4ed8; color:white; padding:1px 4px; border-radius:2px; font-size:9px; margin-left:4px">LADD</span>` : "";
        const stealthBadge = !props.altitude ? `<span style="background:#ff0055; color:black; padding:1px 4px; border-radius:2px; font-size:9px; margin-left:4px">STEALTH</span>` : "";

        const typeStr = props.aircraft_type ? ` <span style="color:#737373">(${props.aircraft_type})</span>` : "";
        const regStr  = props.registration  ? `<div style="color:#737373; font-size:10px;">${props.registration}</div>` : "";
        const seenStr = props.seen !== "" ? `<div style="color:#525252; font-size:9px;">Signal: ${props.seen}s ago</div>` : "";

        const altDisplay = props.altitude
          ? `${props.altitude}m` + (props.alt_geom && props.alt_geom !== props.altitude ? ` <span style="color:#525252">(GPS: ${props.alt_geom}m)</span>` : "")
          : '<span style="color:#ff0055">STEALTH</span>';

        const html = `
          <div style="background:rgba(0,0,0,0.9); border:1px solid ${color}; color:white; padding:10px; font-family:monospace; font-size:11px; border-radius:4px; min-width:175px; max-width:220px;">
            <div style="color:${color}; font-weight:bold; font-size:13px; margin-bottom:2px;">${props.callsign}${typeStr}${alertBadge}${piaBadge}${laddBadge}${stealthBadge}</div>
            ${regStr}
            <hr style="border-color:${color}33; margin:5px 0;">
            <div style="color:#737373;">Country: <span style="color:white">${props.origin_country}</span></div>
            <div style="color:#737373;">Altitude: <span style="color:white">${altDisplay}</span></div>
            <div style="color:#737373;">Speed: <span style="color:white">${props.velocity ? props.velocity + ' m/s' : '---'}</span></div>
            <div style="color:#737373;">V/S: <span style="color:${vr>200?'#4ade80':vr<-200?'#f87171':'white'}">${vrStr}</span></div>
            <div style="color:#737373;">Squawk: <span style="color:white">${props.squawk}</span></div>
            ${seenStr}
          </div>
        `;

        if (!popup) {
          popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "cyber-popup"
          });
        }
        
        popup.setLngLat(coordinates).setHTML(html).addTo(map);
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        if (popup) {
          popup.remove();
        }
      };

      map.on("mouseenter", layerId, handleMouseEnter);
      map.on("mouseleave", layerId, handleMouseLeave);
      
      // Cleanup for this specific layer's events can be attached to the map instance temporarily
      (map as any)._osintHoverCleanup = () => {
        map.off("mouseenter", layerId, handleMouseEnter);
        map.off("mouseleave", layerId, handleMouseLeave);
        if (popup) popup.remove();
      };
    }
  }, [mapRef, flights]);

  // Handle polling and viewport changes
  useEffect(() => {
    if (isActive) {
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        fetchFlights();
      } else {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
          fetchFlights();
        }, 1500); // 1.5 second debounce on viewport change
      }
      
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fetchFlights, 15000); // 15 seconds
    } else {
      isFirstLoadRef.current = true;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      setFlights([]);
      
      // Cleanup layer
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        if ((map as any)._osintHoverCleanup) {
          (map as any)._osintHoverCleanup();
        }
        if (map.getLayer("osint-flights-layer-labels")) map.removeLayer("osint-flights-layer-labels");
        if (map.getLayer("osint-flights-layer")) map.removeLayer("osint-flights-layer");
        if (map.getSource("osint-flights-source")) map.removeSource("osint-flights-source");
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [isActive, fetchFlights, mapRef, viewport]);

  return { flights, isScanning, lastScanTime, forceScan: fetchFlights };
}
