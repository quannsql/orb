export type SpectralMode = "TRUE_COLOR" | "NDVI" | "MOISTURE";

export interface SentinelToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface SentinelLayerConfig {
  id: string;
  label: string;
  mode: SpectralMode;
  description: string;
  legendColors: string[];
  legendLabels: string[];
  icon: string;
}

export interface TimeRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface StatisticalResult {
  interval: {
    from: string;
    to: string;
  };
  outputs: {
    data: {
      bands: {
        [key: string]: {
          stats: {
            min: number;
            max: number;
            mean: number;
            stDev: number;
            sampleCount: number;
            noDataCount: number;
          };
        };
      };
    };
  };
}

export interface PolygonStats {
  areaKm2: number;
  areaHectares: number;
  meanNDVI: number | null;
  meanMoisture: number | null;
  cloudCoverage: number | null;
  pixelCount: number;
  dateRange: TimeRange;
  loading: boolean;
  error: string | null;
}

export interface EvalscriptConfig {
  name: string;
  mode: SpectralMode;
  script: string;
}
