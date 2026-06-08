import { cacheGet, cacheSet } from "@/lib/redis";
import { queryGrok } from "@/lib/grok";

declare global {
  var backgroundWorkerStarted: boolean | undefined;
}

const DEFAULT_ALERTS = [
  {
    id: "SENTINEL-8192",
    title: "PROACTIVE ALERT: Hostile Interception in Strait of Hormuz",
    hotspot: "Strait of Hormuz",
    type: "Naval Interception / Blockade threat",
    lng: 56.25,
    lat: 26.56,
    threatLevel: "CRITICAL",
    analysis: "A foreign naval patrol group has established unauthorized checkpoints and boarded a British-flagged oil carrier in international waters. Coastal missile defense batteries in the sector have been activated. Coalition navies have raised their posture to high readiness, deploying two guided-missile destroyers to secure the shipping lane.",
    impact: "Transit capacity through the Strait is down 75%. Crude oil futures spiked +4.8% instantly. All commercial tankers are advised to anchor or divert around the Cape of Good Hope, adding 12-14 days transit time.",
    status: "ACTIVE ACTION REQUIRED",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5m ago
  },
  {
    id: "SENTINEL-4096",
    title: "PROACTIVE ALERT: Air & Maritime Blockade Drills in Taiwan Strait",
    hotspot: "Taiwan Strait",
    type: "Military Blockade Exercise",
    lng: 120.0,
    lat: 24.5,
    threatLevel: "CRITICAL",
    analysis: "Amphibious task forces, supported by air superiority fighters, have declared a major multi-domain exclusion zone cutting off the northern Taiwan Strait. Signal interference has been reported on civilian aviation frequencies. Command centers are monitoring potential satellite blackout drills.",
    impact: "Semiconductor shipping out of Hsinchu is halted. Air carriers are rerouting around eastern Taiwan airspace, causing severe regional flight delays and disrupting high-tech component supply lines.",
    status: "ACTIVE ACTION REQUIRED",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15m ago
  },
  {
    id: "SENTINEL-2048",
    title: "PROACTIVE ALERT: Red Sea USV Strike near Bab-el-Mandeb",
    hotspot: "Bab-el-Mandeb Strait",
    type: "Unmanned Attack Vessel strike",
    lng: 43.33,
    lat: 12.60,
    threatLevel: "CRITICAL",
    analysis: "An explosive unmanned surface vessel (USV) has successfully detonated against a Suez-bound commercial container ship. Multiple maritime drone signatures remain active in the area. Air warfare assets have intercepted three low-altitude suicide drones over the strait.",
    impact: "Suez Canal transit drops by 80% as major shipping lines divert to the African route. Container spot freight rates from Asia to Europe surge by 40% in 24 hours.",
    status: "ACTIVE ACTION REQUIRED",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45m ago
  },
  {
    id: "SENTINEL-1024",
    title: "PROACTIVE ALERT: High-intensity Electronic Jamming in Suwalki Gap",
    hotspot: "Suwalki Gap",
    type: "Electronic Warfare (EW) Anomaly",
    lng: 23.3,
    lat: 54.1,
    threatLevel: "HIGH",
    analysis: "High-power GPS and Galileo signal degradation has disabled precision navigation across the Polish-Lithuanian border. Air traffic control reports multiple commercial flights reverting to backup inertial navigation. Signals are sourced to a mobile jamming battalion in Kaliningrad.",
    impact: "NATO enhanced Forward Presence battlegroups are deployed. Civil flights are warned of severe navigational safety risks in the Baltic aviation corridor.",
    status: "ACTIVE MONITORING",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
  },
  {
    id: "SENTINEL-512",
    title: "PROACTIVE ALERT: Northern Sea Route Restricted Exercises",
    hotspot: "Arctic Passage",
    type: "Arctic Maritime Access Denial",
    lng: 70.0,
    lat: 75.0,
    threatLevel: "ELEVATED",
    analysis: "Arctic command units have deployed nuclear-powered icebreakers and cruisers to establish restricted military zones. Foreign commercial vessels are required to seek Russian transit permits and take Russian pilots, citing safety drills.",
    impact: "Alternate Arctic trade corridors are effectively closed. Marine insurance companies have suspended coverage for non-escorted commercial transits in the Kara Sea.",
    status: "STANDBY MONITORING",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4h ago
  }
];

// Pre-seeded Butterfly Simulation outcomes
const BUTTERFLY_PRESETS = [
  {
    scenario: "Military block of shipping channels, shutting down oil transport and raising regional combat alert.",
    lng: 56.25,
    lat: 26.56,
    result: {
      military: {
        status: "CRITICAL",
        report: "• Naval combat readiness upgraded to DEFCON 2 for coalition assets.\n• Anti-ship cruise missile (ASCM) batteries detected active on coastal ridges.\n• Air operations launched from nearby carrier strike groups to enforce air patrol corridors.",
        exclusionRadiusKm: 150
      },
      economic: {
        status: "CRITICAL",
        report: "• Crude oil supply deficit of 18 million barrels per day triggered immediately.\n• Spot freight insurance premiums increase by 450% for Persian Gulf transits.\n• Supply chains for industrial gas and energy-dependent chemicals face severe delays.",
        disruptedPorts: ["Port of Fujairah", "Jebel Ali Port", "Mina Salman"]
      },
      social: {
        status: "TENSE",
        report: "• Energy price riots feared in importing developing nations.\n• Domestic defense mobilization drills initiated in regional countries.\n• Increased cyber-espionage and hacktivist threats targeting regional port automation systems.",
        refugeeRisk: "MEDIUM"
      },
      summary: "A military blockade of the Strait of Hormuz immediately halts 20% of global petroleum transit, causing oil prices to spike +15% and triggering emergency reserves distribution. Coalition forces deploy warships to establish convoy escorts, risking direct naval confrontation.",
      mapVisuals: {
        impactZone: { lng: 56.25, lat: 26.56, radiusKm: 150 },
        redirectedRoutes: [
          {
            name: "Hormuz Bypass Route",
            path: [
              [56.25, 26.56],
              [55.0, 25.0],
              [53.5, 24.2],
              [51.5, 24.5]
            ]
          }
        ],
        migrationVectors: [
          {
            from: [56.25, 26.56],
            to: [59.0, 24.0],
            intensity: "HIGH"
          }
        ]
      }
    }
  },
  {
    scenario: "Naval drills block semiconductor exports, threatening global electronic supply chains.",
    lng: 120.0,
    lat: 24.5,
    result: {
      military: {
        status: "CRITICAL",
        report: "• Anti-submarine patrol aircraft active along the northern airspace boundary.\n• Amphibious landing drills launched with over 30 vessel task forces.\n• Sea-mine laying operations detected at key chokepoints near Keelung.",
        exclusionRadiusKm: 200
      },
      economic: {
        status: "CRITICAL",
        report: "• Global semiconductor assembly lines face 85% supply contraction within 72 hours.\n• Supply shortages for high-end microchips (3nm/5nm) projected to delay electronics exports globally by 9 months.\n• Spot prices for DRAM and NAND flash memory jump +35%.",
        disruptedPorts: ["Port of Kaohsiung", "Port of Keelung", "Port of Taichung"]
      },
      social: {
        status: "UNSTABLE",
        report: "• Tech stock panic selling wipes out $1.2T in global market capitalization.\n• Fuel and food rationing contingency plans activated locally.\n• Public protests demanding safety corridors for commercial maritime traffic.",
        refugeeRisk: "HIGH"
      },
      summary: "Naval blockades in the Taiwan Strait disrupt crucial shipping lanes for global tech hardware, causing microchip shortages that choke automotive, smartphone, and defense supply chains. Global tech markets face historic crashes as ports freeze all export shipments.",
      mapVisuals: {
        impactZone: { lng: 120.0, lat: 24.5, radiusKm: 200 },
        redirectedRoutes: [
          {
            name: "Taiwan East Bypass",
            path: [
              [119.5, 22.0],
              [122.5, 22.5],
              [123.0, 25.0],
              [121.5, 26.5]
            ]
          }
        ],
        migrationVectors: [
          {
            from: [120.0, 24.5],
            to: [123.5, 26.0],
            intensity: "HIGH"
          }
        ]
      }
    }
  },
  {
    scenario: "Geopolitical event causing supply chain disruptions and political shifts.",
    lng: 43.33,
    lat: 12.60,
    result: {
      military: {
        status: "CRITICAL",
        report: "• Air defense batteries in the Red Sea engage multiple suicide drones.\n• Combined maritime forces establish active military convoy escorts for cargo ships.\n• Drone launch facilities on western coastal hills are targeted by air strikes.",
        exclusionRadiusKm: 120
      },
      economic: {
        status: "CRITICAL",
        report: "• Cargo ships rerouted around South Africa add $1.5M in fuel costs per transit.\n• Container transport delays from Asia to Europe increase by 14 days.\n• Port of Rotterdam and major North Sea ports experience severe shipping congestion.",
        disruptedPorts: ["Port of Aden", "Port of Hodeidah", "Port Sudan"]
      },
      social: {
        status: "TENSE",
        report: "• Rising food and shipping fuel inflation sparks protests in importing regions.\n• Evacuation of non-essential civilian personnel from nearby diplomatic sites.\n• Maritime labor unions threaten crew strikes over hazardous sailing conditions.",
        refugeeRisk: "MEDIUM"
      },
      summary: "Drone and USV strikes in the Bab-el-Mandeb Strait force major container liners to halt Red Sea transit, cutting off the primary trade link between Asia and Europe. Freight rates surge and supply chains suffer multi-week bottlenecks as vessels take the long African detour.",
      mapVisuals: {
        impactZone: { lng: 43.33, lat: 12.6, radiusKm: 120 },
        redirectedRoutes: [
          {
            name: "Cape of Good Hope Bypass",
            path: [
              [43.33, 12.60],
              [40.0, 10.0],
              [35.0, 0.0],
              [20.0, -15.0]
            ]
          }
        ],
        migrationVectors: [
          {
            from: [43.33, 12.60],
            to: [47.0, 9.5],
            intensity: "MEDIUM"
          }
        ]
      }
    }
  }
];

// Start background preloader and cyclic monitoring
export async function initBackgroundWorker() {
  if (global.backgroundWorkerStarted) {
    return;
  }
  global.backgroundWorkerStarted = true;
  console.log("[ORB Backend] Starting Background Data Preloader Worker...");

  try {
    const historyKey = "sentinel:alerts:history";
    const cachedHistory = await cacheGet<any[]>(historyKey);

    // 1. Seed alerts history if missing
    if (!cachedHistory || cachedHistory.length === 0) {
      console.log("[ORB Backend] Cache is empty. Seeding default high-fidelity alerts...");
      await cacheSet(historyKey, DEFAULT_ALERTS, 604800); // 7 days TTL
    }

    // 2. Seed Preset Butterfly Simulations
    for (const preset of BUTTERFLY_PRESETS) {
      const roundLng = Number(preset.lng.toFixed(2));
      const roundLat = Number(preset.lat.toFixed(2));
      const normalizedScenario = preset.scenario.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
      const cacheKey = `butterfly:cache:${normalizedScenario}:${roundLng}:${roundLat}`;

      const cachedSim = await cacheGet(cacheKey);
      if (!cachedSim) {
        console.log(`[ORB Backend] Seeding preset simulation for key: ${cacheKey}`);
        await cacheSet(cacheKey, preset.result, 86400 * 7); // 7 days TTL
      }
    }

    // 3. Start periodic background sweep every 5 minutes (300000ms)
    // Runs in the background without blocking the Node request
    setInterval(async () => {
      console.log("[ORB Backend Background Worker] Running periodic OSINT and Sentinel sweep...");
      try {
        const token = process.env.APIFY_API_TOKEN;
        let tweets: string[] = [];

        // Attempt apify fetch if configured
        if (token && !token.startsWith("apify_api_YOUR_TOKEN")) {
          const handles = ["visegrad24", "warsurv", "KobeissiLetter", "OSINTtechnical", "IntelAirForce", "defense_ae"];
          try {
            const res = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${token}&maxItems=5`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                twitterHandles: handles,
                maxItems: 5,
                sort: "Latest",
                tweetLanguage: "en",
                addParentTweets: false
              })
            });
            if (res.ok) {
              const items = await res.json();
              if (Array.isArray(items)) {
                tweets = items
                  .filter((item: any) => item.text)
                  .map((item: any) => `@${item.user?.username || "OSINT"}: "${item.text.replace(/\n/g, " ")}"`);
              }
            }
          } catch (e) {
            console.error("[ORB Backend Background Worker] Apify fetch error during sweep:", e);
          }
        }

        const history = await cacheGet<any[]>(historyKey) || [];
        const recentHotspots = Array.from(new Set(history.map((h: any) => h.hotspot).filter(Boolean))).slice(0, 5);

        let promptDirective = "";
        if (tweets.length > 0) {
          promptDirective = `
CRITICAL DIRECTIVE:
1. You MUST analyze the following real-time OSINT tweets collected from key military/economic accounts:
${tweets.map(t => `- ${t}`).join("\n")}
2. Select the most critical ongoing geopolitical, military, or supply chain anomaly described in these tweets.
3. Extract the hotspot/location, the category/type of crisis, the tactical situation, and the supply chain/geopolitical impact directly from the tweets.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of the hotspot/event mentioned in the tweets and return it.
5. You MUST NOT select any of these recently reported hotspots to avoid redundancy: ${JSON.stringify(recentHotspots)}. Choose another topic/location from the tweets if there is a conflict.
`;
        } else {
          promptDirective = `
CRITICAL DIRECTIVE:
1. Since no live OSINT tweets are currently available, you MUST identify an ongoing or recent (2025/2026) REAL-WORLD geopolitical conflict, military standoff, border tension, or critical supply chain disruption globally.
2. Select a highly dynamic, realistic, and specific hotspot/location anywhere on Earth. Do NOT restrict yourself to a fixed list of common locations. It can be any region, country border, strait, ocean, canal, or port (e.g. Red Sea, North Sea, Baltic borders, South America borders, Aegean Sea, Cyprus, Arctic Passage, Gulf of Aden, Panama Canal, DMZ, Gibraltar, Suez Canal, Strait of Hormuz, Taiwan Strait, South China Sea, etc.), representing a genuine global flashpoint.
3. You MUST NOT select any of these recently reported hotspots to avoid redundancy: ${JSON.stringify(recentHotspots)}. Choose a completely different region/country.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of this event/hotspot and return it.
`;
        }

        const systemPrompt = `You are the central processor for ORB Autonomous Proactive Sentinels.
Analyze the following source intelligence and detect any critical geopolitical, economic, or military anomaly.

${promptDirective}

Generate a realistic, professional, and slightly alarming military/economic analyst report using the grok-4.3 model.
Focus on:
1. Geopolitical fallout: Border closures or hostile patrols.
2. Economic impact: Disrupted commodities, supply chain delay rates, shipping detour routes.
3. Military threat level.

Return your response ONLY as a valid JSON object matching the following structure (no backticks, no markdown formatting):
{
  "id": "SWE-XXXX",
  "title": "PROACTIVE ALERT: Sudden Escalation at [Hotspot Name]",
  "hotspot": "[Hotspot Name]",
  "type": "[Event Category / Type of Crisis]",
  "lng": [longitude],
  "lat": [latitude],
  "threatLevel": "CRITICAL | HIGH | ELEVATED",
  "analysis": "A concise paragraph explaining the tactical situation...",
  "impact": "1-2 sentences outlining the specific supply chain / geopolitical bottleneck impact...",
  "status": "ACTIVE ACTION REQUIRED"
}`;

        const responseText = await queryGrok(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Analyze OSINT signals and generate the proactive sentinel report." }
          ],
          true
        );

        let cleanedText = responseText.trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const resultJson = JSON.parse(jsonMatch[0]);
          resultJson.id = `SENTINEL-${Math.floor(1000 + Math.random() * 9000)}`;
          resultJson.timestamp = new Date().toISOString();

          // Append to cache
          let history = await cacheGet<any[]>(historyKey) || [];
          history = [resultJson, ...history].slice(0, 15);
          await cacheSet(historyKey, history, 604800);
          console.log(`[ORB Backend Background Worker] Generated and cached new alert: ${resultJson.title}`);
        }
      } catch (err: any) {
        console.error("[ORB Backend Background Worker] Sweep cycle error:", err.message);
      }
    }, 300000);

  } catch (error) {
    console.error("[ORB Backend] Failed to initialize background preloader:", error);
  }
}
