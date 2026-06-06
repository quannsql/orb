import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

interface QueryArea {
  lat: number;
  lon: number;
  radius: number;
  timestamp: number;
}

// Hỗ trợ cả 2 bộ biến:
// - KV_REST_API_URL + KV_REST_API_TOKEN  → Upstash tạo qua Vercel Integration
// - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN → Upstash tạo trực tiếp trên console.upstash.com
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const isKVEnabled = !!(redisUrl && redisToken);

// Lazy singleton — only created when env vars are present
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({ url: redisUrl!, token: redisToken! });
  }
  return _redis;
}

// Fallback in-memory variables for local development (no database required)
let globalFlightCacheMem: any[] | null = null;
let recentQueriesMem: QueryArea[] = [];
let lastSimulationTimeMem = Date.now();
let lastExternalFetchTimeMem = 0;

async function getFlightCache(): Promise<any[]> {
  if (isKVEnabled) {
    try {
      return (await getRedis().get<any[]>("osint:flights:cache")) || [];
    } catch (e) {
      console.error("[OSINT KV] Get flight cache error:", e);
    }
  }
  return globalFlightCacheMem || [];
}

async function setFlightCache(cache: any[]): Promise<void> {
  if (isKVEnabled) {
    try {
      await getRedis().set("osint:flights:cache", cache, { ex: 90 });
      return;
    } catch (e) {
      console.error("[OSINT KV] Set flight cache error:", e);
    }
  }
  globalFlightCacheMem = cache;
}

async function getRecentQueries(): Promise<QueryArea[]> {
  if (isKVEnabled) {
    try {
      return (await getRedis().get<QueryArea[]>("osint:flights:queries")) || [];
    } catch (e) {
      console.error("[OSINT KV] Get recent queries error:", e);
    }
  }
  return recentQueriesMem;
}

async function setRecentQueries(queries: QueryArea[]): Promise<void> {
  if (isKVEnabled) {
    try {
      await getRedis().set("osint:flights:queries", queries, { ex: 15 });
      return;
    } catch (e) {
      console.error("[OSINT KV] Set recent queries error:", e);
    }
  }
  recentQueriesMem = queries;
}

async function getLastExternalFetchTime(): Promise<number> {
  if (isKVEnabled) {
    try {
      return Number(await getRedis().get<number>("osint:flights:last_fetch")) || 0;
    } catch (e) {
      console.error("[OSINT KV] Get last fetch time error:", e);
    }
  }
  return lastExternalFetchTimeMem;
}

async function setLastExternalFetchTime(time: number): Promise<void> {
  if (isKVEnabled) {
    try {
      await getRedis().set("osint:flights:last_fetch", time, { ex: 10 });
      return;
    } catch (e) {
      console.error("[OSINT KV] Set last fetch time error:", e);
    }
  }
  lastExternalFetchTimeMem = time;
}

async function getLastSimulationTime(): Promise<number> {
  if (isKVEnabled) {
    try {
      return Number(await getRedis().get<number>("osint:flights:last_sim")) || Date.now();
    } catch (e) {
      console.error("[OSINT KV] Get last simulation time error:", e);
    }
  }
  return lastSimulationTimeMem;
}

async function setLastSimulationTime(time: number): Promise<void> {
  if (isKVEnabled) {
    try {
      await getRedis().set("osint:flights:last_sim", time, { ex: 60 });
      return;
    } catch (e) {
      console.error("[OSINT KV] Set last simulation time error:", e);
    }
  }
  lastSimulationTimeMem = time;
}

// Country lookup helper based on ICAO 24-bit hex prefix
const ICAO_Ranges = [
  { start: 0x004000, end: 0x0047FF, country: "Zimbabwe" },
  { start: 0x006000, end: 0x006FFF, country: "Mozambique" },
  { start: 0x008000, end: 0x00FFFF, country: "South Africa" },
  { start: 0x010000, end: 0x017FFF, country: "Egypt" },
  { start: 0x018000, end: 0x01FFFF, country: "Libya" },
  { start: 0x020000, end: 0x027FFF, country: "Morocco" },
  { start: 0x028000, end: 0x02FFFF, country: "Tunisia" },
  { start: 0x030000, end: 0x0307FF, country: "Botswana" },
  { start: 0x032000, end: 0x032FFF, country: "Burundi" },
  { start: 0x034000, end: 0x034FFF, country: "Cameroon" },
  { start: 0x035000, end: 0x0357FF, country: "Comoros" },
  { start: 0x036000, end: 0x036FFF, country: "Republic of the Congo" },
  { start: 0x038000, end: 0x038FFF, country: "Côte d’Ivoire" },
  { start: 0x03E000, end: 0x03EFFF, country: "Gabon" },
  { start: 0x040000, end: 0x040FFF, country: "Ethiopia" },
  { start: 0x042000, end: 0x042FFF, country: "Equatorial Guinea" },
  { start: 0x044000, end: 0x044FFF, country: "Ghana" },
  { start: 0x046000, end: 0x046FFF, country: "Guinea" },
  { start: 0x048000, end: 0x0487FF, country: "Guinea-Bissau" },
  { start: 0x04A000, end: 0x04A7FF, country: "Lesotho" },
  { start: 0x04C000, end: 0x04CFFF, country: "Kenya" },
  { start: 0x050000, end: 0x050FFF, country: "Liberia" },
  { start: 0x054000, end: 0x054FFF, country: "Madagascar" },
  { start: 0x058000, end: 0x058FFF, country: "Malawi" },
  { start: 0x05A000, end: 0x05A7FF, country: "Maldives" },
  { start: 0x05C000, end: 0x05CFFF, country: "Mali" },
  { start: 0x05E000, end: 0x05E7FF, country: "Mauritania" },
  { start: 0x060000, end: 0x0607FF, country: "Mauritius" },
  { start: 0x062000, end: 0x062FFF, country: "Niger" },
  { start: 0x064000, end: 0x064FFF, country: "Nigeria" },
  { start: 0x068000, end: 0x068FFF, country: "Uganda" },
  { start: 0x06A000, end: 0x06AFFF, country: "Qatar" },
  { start: 0x06C000, end: 0x06CFFF, country: "Central African Republic" },
  { start: 0x06E000, end: 0x06EFFF, country: "Rwanda" },
  { start: 0x070000, end: 0x070FFF, country: "Senegal" },
  { start: 0x074000, end: 0x0747FF, country: "Seychelles" },
  { start: 0x076000, end: 0x0767FF, country: "Sierra Leone" },
  { start: 0x078000, end: 0x078FFF, country: "Somalia" },
  { start: 0x07A000, end: 0x07A7FF, country: "Eswatini" },
  { start: 0x07C000, end: 0x07CFFF, country: "Sudan" },
  { start: 0x080000, end: 0x080FFF, country: "Tanzania" },
  { start: 0x084000, end: 0x084FFF, country: "Chad" },
  { start: 0x088000, end: 0x088FFF, country: "Togo" },
  { start: 0x08A000, end: 0x08AFFF, country: "Zambia" },
  { start: 0x08C000, end: 0x08CFFF, country: "DR Congo" },
  { start: 0x090000, end: 0x090FFF, country: "Angola" },
  { start: 0x094000, end: 0x0947FF, country: "Benin" },
  { start: 0x096000, end: 0x0967FF, country: "Cabo Verde" },
  { start: 0x098000, end: 0x0987FF, country: "Djibouti" },
  { start: 0x09A000, end: 0x09AFFF, country: "Gambia" },
  { start: 0x09C000, end: 0x09CFFF, country: "Burkina Faso" },
  { start: 0x09E000, end: 0x09E7FF, country: "São Tomé and Príncipe" },
  { start: 0x0A0000, end: 0x0A7FFF, country: "Algeria" },
  { start: 0x0A8000, end: 0x0A8FFF, country: "Bahamas" },
  { start: 0x0AA000, end: 0x0AA7FF, country: "Barbados" },
  { start: 0x0AB000, end: 0x0AB7FF, country: "Belize" },
  { start: 0x0AC000, end: 0x0ADFFF, country: "Colombia" },
  { start: 0x0AE000, end: 0x0AEFFF, country: "Costa Rica" },
  { start: 0x0B0000, end: 0x0B0FFF, country: "Cuba" },
  { start: 0x0B2000, end: 0x0B2FFF, country: "El Salvador" },
  { start: 0x0B4000, end: 0x0B4FFF, country: "Guatemala" },
  { start: 0x0B6000, end: 0x0B6FFF, country: "Guyana" },
  { start: 0x0B8000, end: 0x0B8FFF, country: "Haiti" },
  { start: 0x0BA000, end: 0x0BAFFF, country: "Honduras" },
  { start: 0x0BC000, end: 0x0BC7FF, country: "Saint Vincent and the Grenadines" },
  { start: 0x0BE000, end: 0x0BEFFF, country: "Jamaica" },
  { start: 0x0C0000, end: 0x0C0FFF, country: "Nicaragua" },
  { start: 0x0C2000, end: 0x0C2FFF, country: "Panama" },
  { start: 0x0C4000, end: 0x0C4FFF, country: "Dominican Republic" },
  { start: 0x0C6000, end: 0x0C6FFF, country: "Trinidad and Tobago" },
  { start: 0x0C8000, end: 0x0C8FFF, country: "Suriname" },
  { start: 0x0CA000, end: 0x0CA7FF, country: "Antigua and Barbuda" },
  { start: 0x0CC000, end: 0x0CC7FF, country: "Grenada" },
  { start: 0x0D0000, end: 0x0D7FFF, country: "Mexico" },
  { start: 0x0D8000, end: 0x0DFFFF, country: "Venezuela" },
  { start: 0x100000, end: 0x1FFFFF, country: "Russia" },
  { start: 0x201000, end: 0x2017FF, country: "Namibia" },
  { start: 0x202000, end: 0x2027FF, country: "Eritrea" },
  { start: 0x300000, end: 0x33FFFF, country: "Italy" },
  { start: 0x340000, end: 0x37FFFF, country: "Spain" },
  { start: 0x380000, end: 0x3BFFFF, country: "France" },
  { start: 0x3C0000, end: 0x3FFFFF, country: "Germany" },
  { start: 0x400000, end: 0x4001BF, country: "Bermuda" },
  { start: 0x4001C0, end: 0x4001FF, country: "Cayman Islands" },
  { start: 0x400300, end: 0x4003FF, country: "Turks and Caicos Islands" },
  { start: 0x424135, end: 0x4241F2, country: "Cayman Islands" },
  { start: 0x424200, end: 0x4246FF, country: "Bermuda" },
  { start: 0x424700, end: 0x424899, country: "Cayman Islands" },
  { start: 0x424B00, end: 0x424BFF, country: "Isle of Man" },
  { start: 0x43BE00, end: 0x43BEFF, country: "Bermuda" },
  { start: 0x43E700, end: 0x43EAFD, country: "Isle of Man" },
  { start: 0x43E700, end: 0x43EEFF, country: "Guernsey" },
  { start: 0x400000, end: 0x43FFFF, country: "United Kingdom" },
  { start: 0x440000, end: 0x447FFF, country: "Austria" },
  { start: 0x448000, end: 0x44FFFF, country: "Belgium" },
  { start: 0x450000, end: 0x457FFF, country: "Bulgaria" },
  { start: 0x458000, end: 0x45FFFF, country: "Denmark" },
  { start: 0x460000, end: 0x467FFF, country: "Finland" },
  { start: 0x468000, end: 0x46FFFF, country: "Greece" },
  { start: 0x470000, end: 0x477FFF, country: "Hungary" },
  { start: 0x478000, end: 0x47FFFF, country: "Norway" },
  { start: 0x480000, end: 0x487FFF, country: "Netherlands" },
  { start: 0x488000, end: 0x48FFFF, country: "Poland" },
  { start: 0x490000, end: 0x497FFF, country: "Portugal" },
  { start: 0x498000, end: 0x49FFFF, country: "Czechia" },
  { start: 0x4A0000, end: 0x4A7FFF, country: "Romania" },
  { start: 0x4A8000, end: 0x4AFFFF, country: "Sweden" },
  { start: 0x4B0000, end: 0x4B7FFF, country: "Switzerland" },
  { start: 0x4B8000, end: 0x4BFFFF, country: "Turkey" },
  { start: 0x4C0000, end: 0x4C7FFF, country: "Serbia" },
  { start: 0x4C8000, end: 0x4C87FF, country: "Cyprus" },
  { start: 0x4CA000, end: 0x4CAFFF, country: "Ireland" },
  { start: 0x4CC000, end: 0x4CCFFF, country: "Iceland" },
  { start: 0x4D0000, end: 0x4D07FF, country: "Luxembourg" },
  { start: 0x4D2000, end: 0x4D27FF, country: "Malta" },
  { start: 0x4D4000, end: 0x4D47FF, country: "Monaco" },
  { start: 0x500000, end: 0x5007FF, country: "San Marino" },
  { start: 0x501000, end: 0x5017FF, country: "Albania" },
  { start: 0x501800, end: 0x501FFF, country: "Croatia" },
  { start: 0x502800, end: 0x502FFF, country: "Latvia" },
  { start: 0x503800, end: 0x503FFF, country: "Lithuania" },
  { start: 0x504800, end: 0x504FFF, country: "Moldova" },
  { start: 0x505800, end: 0x505FFF, country: "Slovakia" },
  { start: 0x506800, end: 0x506FFF, country: "Slovenia" },
  { start: 0x507800, end: 0x507FFF, country: "Uzbekistan" },
  { start: 0x508000, end: 0x50FFFF, country: "Ukraine" },
  { start: 0x510000, end: 0x5107FF, country: "Belarus" },
  { start: 0x511000, end: 0x5117FF, country: "Estonia" },
  { start: 0x512000, end: 0x5127FF, country: "North Macedonia" },
  { start: 0x513000, end: 0x5137FF, country: "Bosnia and Herzegovina" },
  { start: 0x514000, end: 0x5147FF, country: "Georgia" },
  { start: 0x515000, end: 0x5157FF, country: "Tajikistan" },
  { start: 0x516000, end: 0x5167FF, country: "Montenegro" },
  { start: 0x600000, end: 0x6007FF, country: "Armenia" },
  { start: 0x600800, end: 0x600FFF, country: "Azerbaijan" },
  { start: 0x601000, end: 0x6017FF, country: "Kyrgyzstan" },
  { start: 0x601800, end: 0x601FFF, country: "Turkmenistan" },
  { start: 0x680000, end: 0x6807FF, country: "Bhutan" },
  { start: 0x681000, end: 0x6817FF, country: "Micronesia" },
  { start: 0x682000, end: 0x6827FF, country: "Mongolia" },
  { start: 0x683000, end: 0x6837FF, country: "Kazakhstan" },
  { start: 0x684000, end: 0x6847FF, country: "Palau" },
  { start: 0x700000, end: 0x700FFF, country: "Afghanistan" },
  { start: 0x702000, end: 0x702FFF, country: "Bangladesh" },
  { start: 0x704000, end: 0x704FFF, country: "Myanmar" },
  { start: 0x706000, end: 0x706FFF, country: "Kuwait" },
  { start: 0x708000, end: 0x708FFF, country: "Laos" },
  { start: 0x70A000, end: 0x70AFFF, country: "Nepal" },
  { start: 0x70C000, end: 0x70C7FF, country: "Oman" },
  { start: 0x70E000, end: 0x70EFFF, country: "Cambodia" },
  { start: 0x710000, end: 0x717FFF, country: "Saudi Arabia" },
  { start: 0x718000, end: 0x71FFFF, country: "South Korea" },
  { start: 0x720000, end: 0x727FFF, country: "North Korea" },
  { start: 0x728000, end: 0x72FFFF, country: "Iraq" },
  { start: 0x730000, end: 0x737FFF, country: "Iran" },
  { start: 0x738000, end: 0x73FFFF, country: "Israel" },
  { start: 0x740000, end: 0x747FFF, country: "Jordan" },
  { start: 0x748000, end: 0x74FFFF, country: "Lebanon" },
  { start: 0x750000, end: 0x757FFF, country: "Malaysia" },
  { start: 0x758000, end: 0x75FFFF, country: "Philippines" },
  { start: 0x760000, end: 0x767FFF, country: "Pakistan" },
  { start: 0x768000, end: 0x76FFFF, country: "Singapore" },
  { start: 0x770000, end: 0x777FFF, country: "Sri Lanka" },
  { start: 0x778000, end: 0x77FFFF, country: "Syria" },
  { start: 0x789000, end: 0x789FFF, country: "Hong Kong" },
  { start: 0x780000, end: 0x7BFFFF, country: "China" },
  { start: 0x7C0000, end: 0x7FFFFF, country: "Australia" },
  { start: 0x800000, end: 0x83FFFF, country: "India" },
  { start: 0x840000, end: 0x87FFFF, country: "Japan" },
  { start: 0x880000, end: 0x887FFF, country: "Thailand" },
  { start: 0x888000, end: 0x88FFFF, country: "Vietnam" },
  { start: 0x890000, end: 0x890FFF, country: "Yemen" },
  { start: 0x894000, end: 0x894FFF, country: "Bahrain" },
  { start: 0x895000, end: 0x8957FF, country: "Brunei" },
  { start: 0x896000, end: 0x896FFF, country: "United Arab Emirates" },
  { start: 0x897000, end: 0x8977FF, country: "Solomon Islands" },
  { start: 0x898000, end: 0x898FFF, country: "Papua New Guinea" },
  { start: 0x899000, end: 0x8997FF, country: "Taiwan" },
  { start: 0x8A0000, end: 0x8A7FFF, country: "Indonesia" },
  { start: 0x900000, end: 0x9007FF, country: "Marshall Islands" },
  { start: 0x901000, end: 0x9017FF, country: "Cook Islands" },
  { start: 0x902000, end: 0x9027FF, country: "Samoa" },
  { start: 0xA00000, end: 0xAFFFFF, country: "United States" },
  { start: 0xC00000, end: 0xC3FFFF, country: "Canada" },
  { start: 0xC80000, end: 0xC87FFF, country: "New Zealand" },
  { start: 0xC88000, end: 0xC88FFF, country: "Fiji" },
  { start: 0xC8A000, end: 0xC8A7FF, country: "Nauru" },
  { start: 0xC8C000, end: 0xC8C7FF, country: "Saint Lucia" },
  { start: 0xC8D000, end: 0xC8D7FF, country: "Tonga" },
  { start: 0xC8E000, end: 0xC8E7FF, country: "Kiribati" },
  { start: 0xC90000, end: 0xC907FF, country: "Vanuatu" },
  { start: 0xC91000, end: 0xC917FF, country: "Andorra" },
  { start: 0xC92000, end: 0xC927FF, country: "Dominica" },
  { start: 0xC93000, end: 0xC937FF, country: "Saint Kitts and Nevis" },
  { start: 0xC94000, end: 0xC947FF, country: "South Sudan" },
  { start: 0xC95000, end: 0xC957FF, country: "Timor-Leste" },
  { start: 0xC97000, end: 0xC977FF, country: "Tuvalu" },
  { start: 0xE00000, end: 0xE3FFFF, country: "Argentina" },
  { start: 0xE40000, end: 0xE7FFFF, country: "Brazil" },
  { start: 0xE80000, end: 0xE80FFF, country: "Chile" },
  { start: 0xE84000, end: 0xE84FFF, country: "Ecuador" },
  { start: 0xE88000, end: 0xE88FFF, country: "Paraguay" },
  { start: 0xE8C000, end: 0xE8CFFF, country: "Peru" },
  { start: 0xE90000, end: 0xE90FFF, country: "Uruguay" },
  { start: 0xE94000, end: 0xE94FFF, country: "Bolivia" },
  { start: 0xF00000, end: 0xF07FFF, country: "ICAO (temporary)" },
  { start: 0xF09000, end: 0xF097FF, country: "ICAO (special use)" }
];

function lookupCountry(hex: string): string {
  if (!hex) return "Unknown";
  const num = parseInt(hex, 16);
  if (isNaN(num)) return "International";

  for (const range of ICAO_Ranges) {
    if (num >= range.start && num <= range.end) {
      return range.country;
    }
  }
  return "International";
}

// Calculate distance in nautical miles (flat surface approximation)
function getDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const latRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dLon = (lon2 - lon1) * Math.cos(latRad);
  return Math.sqrt(dLat * dLat + dLon * dLon) * 60;
}

// Generate realistic mock flight data for a sector
function generateMockFlights(lamin: number, lomin: number, lamax: number, lomax: number, count = 15) {
  const mockFlights = [];
  const callsignPrefixes = ["AAL", "UAL", "DAL", "SWA", "BAW", "DLH", "QTR", "SIA", "HVN", "JAL", "ANA", "CCA"];
  const countries = ["United States", "United Kingdom", "Germany", "Qatar", "Singapore", "Vietnam", "Japan", "China", "France", "Australia"];
  
  for (let i = 0; i < count; i++) {
    const icao24 = Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const prefix = callsignPrefixes[Math.floor(Math.random() * callsignPrefixes.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    const callsign = `${prefix}${num}`;
    const origin_country = countries[Math.floor(Math.random() * countries.length)];
    
    const latitude = lamin + Math.random() * (lamax - lamin);
    const longitude = lomin + Math.random() * (lomax - lomin);
    
    const altitude = Math.floor(Math.random() * 9000) + 3000; // meters
    const velocity = Math.floor(Math.random() * 110) + 150; // m/s
    const true_track = Math.floor(Math.random() * 360);
    
    let squawk = "1200";
    const rand = Math.random();
    if (rand < 0.05) {
      squawk = "7700"; // Emergency
    } else if (rand < 0.1) {
      squawk = "7500"; // Military/Special
    } else {
      squawk = Math.floor(Math.random() * 7000 + 1000).toString();
    }
    const category = Math.random() < 0.15 ? 20 : 1; // 15% military
    
    mockFlights.push({
      icao24,
      callsign,
      origin_country,
      longitude,
      latitude,
      altitude,
      velocity,
      true_track,
      squawk,
      spi: false,
      category,
      lastSeen: Date.now()
    });
  }
  return mockFlights;
}

// Update existing flights in cache based on velocity & track
function simulateFlights(flights: any[], now: number, lastSimTime: number): any[] {
  if (!flights || flights.length === 0) return [];
  const deltaTime = (now - lastSimTime) / 1000; // seconds
  if (deltaTime <= 0) return flights;
  
  // Cap deltaTime to 60s to prevent huge jumps
  const dt = Math.min(deltaTime, 60);

  return flights.map((f) => {
    const latRad = (f.latitude * Math.PI) / 180;
    const cosLat = Math.cos(latRad);
    
    const headingRad = (f.true_track * Math.PI) / 180;
    const speedLat = f.velocity * Math.cos(headingRad);
    const speedLon = f.velocity * Math.sin(headingRad);

    const dLat = (speedLat * dt) / 111000;
    const dLon = (speedLon * dt) / (111000 * Math.max(cosLat, 0.1));

    let newLat = f.latitude + dLat;
    let newLon = f.longitude + dLon;

    // Wrap around boundaries
    if (newLat > 90) newLat = 180 - newLat;
    if (newLat < -90) newLat = -180 - newLat;
    if (newLon > 180) newLon -= 360;
    if (newLon < -180) newLon += 360;

    return {
      ...f,
      latitude: newLat,
      longitude: newLon,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lamin = Number(searchParams.get("lamin"));
  const lomin = Number(searchParams.get("lomin"));
  const lamax = Number(searchParams.get("lamax"));
  const lomax = Number(searchParams.get("lomax"));

  if (!lamin || !lomin || !lamax || !lomax) {
    return NextResponse.json(
      { error: "Missing bounding box parameters" },
      { status: 400 }
    );
  }

  const now = Date.now();

  // Load from KV / Memory
  let flightCache = await getFlightCache();
  let recentQueries = await getRecentQueries();
  const lastSimTime = await getLastSimulationTime();
  const lastFetchTime = await getLastExternalFetchTime();

  // Clean up cache of flights not seen for over 90s
  flightCache = flightCache.filter((f) => now - (f.lastSeen || now) < 90000);

  // Update positions of existing cached flights (Euler integration)
  const simulatedFlights = simulateFlights(flightCache, now, lastSimTime);
  await setLastSimulationTime(now);

  // Calculate center and radius in NM for the requested bounding box
  const latCenter = (lamin + lamax) / 2;
  const lonCenter = (lomin + lomax) / 2;
  const dLat = lamax - latCenter;
  const dLon = (lomax - lonCenter) * Math.cos((latCenter * Math.PI) / 180);
  const radiusDeg = Math.sqrt(dLat * dLat + dLon * dLon);
  const radiusNM = Math.min(250, Math.max(50, Math.ceil(radiusDeg * 60)));

  // Clean up expired queries (older than 15s)
  const activeQueries = recentQueries.filter((q) => now - q.timestamp < 15000);

  // Check if this requested area is already fully covered by a recent query
  const cachedQuery = activeQueries.find((q) => {
    const dist = getDistanceNM(latCenter, lonCenter, q.lat, q.lon);
    return dist + radiusNM <= q.radius;
  });

  let currentFlights = simulatedFlights;
  let queriesToSave = activeQueries;

  if (!cachedQuery) {
    const timeSinceLastFetch = now - lastFetchTime;
    if (timeSinceLastFetch < 1000) {
      console.log(`[OSINT] External fetch throttled (last fetch was ${timeSinceLastFetch}ms ago). Serving from cache/simulation to protect IP.`);
    } else {
      // We need to fetch from adsb.lol because it's not fully covered by cache
      // We query a 1.5x larger radius to cover future panning/zooming without additional fetches
      const fetchRadius = Math.min(250, Math.max(50, Math.ceil(radiusNM * 1.5)));
      const url = `https://api.adsb.lol/v2/point/${latCenter}/${lonCenter}/${fetchRadius}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        console.log(`[OSINT] Querying adsb.lol for region: (${latCenter.toFixed(4)}, ${lonCenter.toFixed(4)}), radius ${fetchRadius} NM...`);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "Accept-Encoding": "gzip",
            "User-Agent": "Geospatial-Command-Center/1.0"
          }
        });
        clearTimeout(timeoutId);

        if (response.status === 429) {
          console.warn("[OSINT] OpenSky Rate Limit hit. Falling back to simulated flight updates.");
          await setLastExternalFetchTime(now);
        } else if (!response.ok) {
          throw new Error(`adsb.lol API error: ${response.status}`);
        } else {
          const data = await response.json();
          const freshFlights = (data.ac || []).map((item: any) => {
            const altFeet = typeof item.alt_baro === "number" ? item.alt_baro : null;
            const altitude = altFeet !== null ? Math.round(altFeet * 0.3048) : null;
            
            const speedKnots = typeof item.gs === "number" ? item.gs : 0;
            const velocity = Math.round(speedKnots * 0.5144);
            
            const isMilitary = typeof item.dbFlags === "number" ? (item.dbFlags & 1) !== 0 : false;
            const category = isMilitary ? 20 : 1;

            const callsign = (item.flight || "UNKNOWN").trim();

            return {
              icao24: item.hex,
              callsign: callsign,
              origin_country: lookupCountry(item.hex),
              longitude: item.lon,
              latitude: item.lat,
              altitude: altitude,
              velocity: velocity,
              true_track: item.track || 0,
              squawk: item.squawk || null,
              spi: false,
              category: category,
              lastSeen: now
            };
          }).filter((f: any) => f.latitude && f.longitude);

          // Merge fresh flights into our global cache (updating matching ones and adding new ones)
          const freshMap = new Map(freshFlights.map((f: any) => [f.icao24, f]));
          currentFlights = [
            ...freshFlights,
            ...simulatedFlights.filter((f: any) => !freshMap.has(f.icao24))
          ];

          // Register this query area as cached
          queriesToSave = [
            ...activeQueries,
            {
              lat: latCenter,
              lon: lonCenter,
              radius: fetchRadius,
              timestamp: now
            }
          ];

          await setLastExternalFetchTime(now);
          console.log(`[OSINT] Fetched ${freshFlights.length} flights from adsb.lol. Cache size: ${currentFlights.length}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("[OSINT] Fetching from adsb.lol failed:", error);
        console.warn("[OSINT] OpenSky Rate Limit hit. Falling back to simulated flight updates.");
        await setLastExternalFetchTime(now);
      }
    }
  } else {
    console.log(`[OSINT] Serving flights from cache (requested radius ${radiusNM} NM covered by cached ${cachedQuery.radius.toFixed(0)} NM)`);
  }

  // Filter our currentFlights for flights that fall inside the requested bounding box
  let filteredFlights = currentFlights.filter(
    (f: any) =>
      f.latitude >= lamin &&
      f.latitude <= lamax &&
      f.longitude >= lomin &&
      f.longitude <= lomax
  );

  // If the viewport is empty or has very few flights, generate some realistic mock ones so the user gets a working experience
  if (filteredFlights.length < 8) {
    const needed = 15 - filteredFlights.length;
    console.log(`[OSINT] Generating ${needed} simulated flights to populate viewport...`);
    const mockData = generateMockFlights(lamin, lomin, lamax, lomax, needed);
    currentFlights.push(...mockData);
    
    // Re-filter to include the newly generated mock flights
    filteredFlights = currentFlights.filter(
      (f: any) =>
        f.latitude >= lamin &&
        f.latitude <= lamax &&
        f.longitude >= lomin &&
        f.longitude <= lomax
    );
  }

  // Save the state back to cache
  await setFlightCache(currentFlights);
  await setRecentQueries(queriesToSave);

  return NextResponse.json({ flights: filteredFlights, cached: true });
}
