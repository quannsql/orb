import type { Map, LngLat } from "mapbox-gl";

export interface ViewportState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapContextValue {
  map: Map | null;
  isLoaded: boolean;
  viewport: ViewportState;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  setStyle: (styleUrl: string) => void;
}

export interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggle3D: () => void;
  onResetBearing: () => void;
  is3D: boolean;
  bearing: number;
}

export interface CursorPosition {
  lngLat: LngLat | null;
  pixel: { x: number; y: number } | null;
}
