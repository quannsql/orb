import type { SpectralMode, EvalscriptConfig } from "@/types/sentinel";

/**
 * Sentinel-2 Evalscripts for each spectral visualization mode.
 * These run server-side in the Sentinel Hub Process API.
 */

const TRUE_COLOR_SCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  return [
    2.5 * sample.B04,
    2.5 * sample.B03,
    2.5 * sample.B02,
    sample.dataMask
  ];
}`;

const NDVI_SCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // Color ramp: red (stressed) → yellow → green (healthy)
  let r, g, b;
  if (ndvi < -0.2) {
    r = 0.8; g = 0.2; b = 0.2;       // Dark red - water/bare
  } else if (ndvi < 0.0) {
    r = 0.85; g = 0.35; b = 0.15;     // Red-orange
  } else if (ndvi < 0.1) {
    r = 0.95; g = 0.55; b = 0.15;     // Orange
  } else if (ndvi < 0.2) {
    r = 0.95; g = 0.75; b = 0.2;      // Yellow-orange
  } else if (ndvi < 0.3) {
    r = 0.9; g = 0.9; b = 0.2;        // Yellow
  } else if (ndvi < 0.4) {
    r = 0.7; g = 0.9; b = 0.2;        // Yellow-green
  } else if (ndvi < 0.5) {
    r = 0.4; g = 0.85; b = 0.2;       // Light green
  } else if (ndvi < 0.7) {
    r = 0.15; g = 0.75; b = 0.15;     // Green
  } else {
    r = 0.0; g = 0.6; b = 0.1;        // Dense vegetation
  }

  return [r, g, b, sample.dataMask];
}`;

const MOISTURE_SCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B08", "B11", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  
  // Color ramp: brown (dry) → blue (wet)
  let r, g, b;
  if (ndmi < -0.4) {
    r = 0.55; g = 0.32; b = 0.04;     // Dark brown - very dry
  } else if (ndmi < -0.2) {
    r = 0.72; g = 0.52; b = 0.20;     // Brown
  } else if (ndmi < 0.0) {
    r = 0.85; g = 0.75; b = 0.55;     // Tan
  } else if (ndmi < 0.1) {
    r = 0.78; g = 0.87; b = 0.82;     // Light gray-green
  } else if (ndmi < 0.2) {
    r = 0.58; g = 0.82; b = 0.78;     // Pale teal
  } else if (ndmi < 0.4) {
    r = 0.35; g = 0.70; b = 0.67;     // Teal
  } else {
    r = 0.01; g = 0.40; b = 0.37;     // Dark teal - very wet
  }

  return [r, g, b, sample.dataMask];
}`;

/**
 * Evalscript for Statistical API (returns raw band values, not colors).
 */
export const STATS_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "B11", "dataMask", "SCL"] }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "ndmi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(samples) {
  let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  let ndmi = (samples.B08 - samples.B11) / (samples.B08 + samples.B11);
  
  // Cloud masking via SCL (Scene Classification Layer)
  // SCL 3 = cloud shadow, 8 = cloud medium prob, 9 = cloud high prob, 10 = thin cirrus
  let isCloud = [3, 8, 9, 10].includes(samples.SCL) ? 0 : 1;
  let mask = samples.dataMask * isCloud;
  
  return {
    ndvi: [ndvi],
    ndmi: [ndmi],
    dataMask: [mask]
  };
}`;

export const EVALSCRIPTS: Record<SpectralMode, EvalscriptConfig> = {
  TRUE_COLOR: {
    name: "True Color",
    mode: "TRUE_COLOR",
    script: TRUE_COLOR_SCRIPT,
  },
  NDVI: {
    name: "NDVI - Vegetation",
    mode: "NDVI",
    script: NDVI_SCRIPT,
  },
  MOISTURE: {
    name: "NDMI - Moisture",
    mode: "MOISTURE",
    script: MOISTURE_SCRIPT,
  },
};
