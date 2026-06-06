import type { SentinelLayerConfig } from "@/types/sentinel";

// ═══════════════════════════════════════════════════════════
// Map Configuration
// ═══════════════════════════════════════════════════════════

export const MAP_CONFIG = {
  defaultCenter: [106.8456, -6.2088] as [number, number], // Jakarta
  defaultZoom: 11,
  defaultPitch: 0,
  defaultBearing: 0,
  style: "mapbox://styles/mapbox/standard",
  maxZoom: 20,
  minZoom: 2,
  terrain3DExaggeration: 1.5,
  fogColor: "#050515", // Dark cyberpunk sky color
  fogHighColor: "#b026ff", // Neon Purple upper atmosphere
  fogHorizonBlend: 0.05, // Sharp neon line blend
  fogStarIntensity: 0.35, // Glowing starry background
  markers: [
    { name: "Command Center Hub", coordinates: [106.8456, -6.2088] },
    { name: "Sector Alpha Tower", coordinates: [106.8272, -6.1754] },
    { name: "SCBD Data Link", coordinates: [106.8166, -6.2297] }
  ] as { name: string; coordinates: [number, number] }[]
} as const;

// ═══════════════════════════════════════════════════════════
// Sentinel Hub Configuration
// ═══════════════════════════════════════════════════════════

export const SENTINEL_CONFIG = {
  tokenUrl:
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
  processUrl: "https://sh.dataspace.copernicus.eu/api/v1/process",
  statisticalUrl: "https://sh.dataspace.copernicus.eu/api/v1/statistics",
  wmsBaseUrl: "https://sh.dataspace.copernicus.eu/ogc/wms",
  collectionId: "sentinel-2-l2a",
  defaultResolution: [10, 10] as [number, number],
  tokenRefreshBufferMs: 5 * 60 * 1000, // Refresh 5 min before expiry
} as const;

// ═══════════════════════════════════════════════════════════
// Spectral Layer Definitions
// ═══════════════════════════════════════════════════════════

export const SPECTRAL_LAYERS: SentinelLayerConfig[] = [
  {
    id: "true-color",
    label: "True Color",
    mode: "TRUE_COLOR",
    description: "Natural color satellite imagery (RGB)",
    legendColors: [],
    legendLabels: [],
    icon: "🌍",
  },
  {
    id: "ndvi",
    label: "NDVI — Vegetation",
    mode: "NDVI",
    description: "Normalized Difference Vegetation Index. Measures plant health.",
    legendColors: [
      "#d73027",
      "#fc8d59",
      "#fee08b",
      "#d9ef8b",
      "#91cf60",
      "#1a9850",
    ],
    legendLabels: ["-1.0", "-0.2", "0.0", "0.2", "0.5", "1.0"],
    icon: "🌿",
  },
  {
    id: "moisture",
    label: "NDMI — Moisture",
    mode: "MOISTURE",
    description:
      "Normalized Difference Moisture Index. Detects water content in vegetation.",
    legendColors: [
      "#8c510a",
      "#d8b365",
      "#f6e8c3",
      "#c7eae5",
      "#5ab4ac",
      "#01665e",
    ],
    legendLabels: ["-1.0", "-0.4", "0.0", "0.2", "0.5", "1.0"],
    icon: "💧",
  },
];

// ═══════════════════════════════════════════════════════════
// UI Theme Constants
// ═══════════════════════════════════════════════════════════

export const GLOW_COLORS = {
  cyan: {
    primary: "#00f0ff",
    shadow: "rgba(0, 240, 255, 0.4)",
    shadowLight: "rgba(0, 240, 255, 0.15)",
    bg: "rgba(0, 240, 255, 0.08)",
  },
  green: {
    primary: "#00ff41",
    shadow: "rgba(0, 255, 65, 0.4)",
    shadowLight: "rgba(0, 255, 65, 0.15)",
    bg: "rgba(0, 255, 65, 0.08)",
  },
  purple: {
    primary: "#b026ff",
    shadow: "rgba(176, 38, 255, 0.4)",
    shadowLight: "rgba(176, 38, 255, 0.15)",
    bg: "rgba(176, 38, 255, 0.08)",
  },
  pink: {
    primary: "#ff006e",
    shadow: "rgba(255, 0, 110, 0.4)",
    shadowLight: "rgba(255, 0, 110, 0.15)",
    bg: "rgba(255, 0, 110, 0.08)",
  },
  amber: {
    primary: "#ffbe0b",
    shadow: "rgba(255, 190, 11, 0.4)",
    shadowLight: "rgba(255, 190, 11, 0.15)",
    bg: "rgba(255, 190, 11, 0.08)",
  },
} as const;

// ═══════════════════════════════════════════════════════════
// Time Travel Configuration
// ═══════════════════════════════════════════════════════════

export const TIME_CONFIG = {
  minYear: 2015,
  maxYear: new Date().getFullYear(),
  defaultStepDays: 30,
  stepOptions: [
    { label: "Weekly", days: 7 },
    { label: "Monthly", days: 30 },
    { label: "Quarterly", days: 90 },
    { label: "Yearly", days: 365 },
  ],
  autoPlayIntervalMs: 1500,
} as const;

// ═══════════════════════════════════════════════════════════
// Ticker Events (simulated)
// ═══════════════════════════════════════════════════════════

export const TICKER_EVENTS = [
  "SAT-2A :: Sentinel-2A pass detected over SECTOR 7G [106.84°E, 6.21°S]",
  "NDVI ALERT :: Vegetation anomaly detected — ZONE ALPHA Δ-0.34",
  "THERMAL :: Surface temperature spike +4.2°C in grid [Q7-R12]",
  "MOISTURE :: Flood risk index elevated to 0.87 — SECTOR 4D",
  "ORBIT :: Next acquisition window in T-02:34:18",
  "PROCESSING :: Cloud-free composite generated — 97.3% coverage",
  "SYSTEM :: Sentinel Hub API latency 142ms — nominal",
  "GEO-FENCE :: Polygon boundary breach detected at waypoint BRAVO",
  "SPECTRAL :: Band B08 calibration drift 0.002 — within tolerance",
  "ARCHIVE :: Historical mosaic 2024-Q3 indexed — 847 tiles",
] as const;
