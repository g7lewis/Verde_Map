/**
 * Automated Social Posting Script for Verde Map
 *
 * Picks a random location from locations.json (not posted in last 30 days),
 * analyzes it via the Verde API, then posts to X and/or Bluesky.
 *
 * Usage:
 *   npx tsx scripts/post-spotlight.ts              # Post to both platforms
 *   npx tsx scripts/post-spotlight.ts --dry-run     # Preview without posting
 *   npx tsx scripts/post-spotlight.ts --platform=x  # X only
 *   npx tsx scripts/post-spotlight.ts --platform=bluesky  # Bluesky only
 *
 * Required env vars:
 *   VERDE_API_URL        - Base URL of Verde API (e.g. https://verde.replit.app)
 *   X_API_KEY            - X API consumer key
 *   X_API_SECRET         - X API consumer secret
 *   X_ACCESS_TOKEN       - X API access token
 *   X_ACCESS_SECRET      - X API access token secret
 *   BLUESKY_HANDLE       - Bluesky handle (e.g. verde.bsky.social)
 *   BLUESKY_APP_PASSWORD - Bluesky app password
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

// --- Types ---

interface Location {
  name: string;
  lat: number;
  lng: number;
  tags: string[];
  interest: string;
}

interface PostHistoryEntry {
  name: string;
  lat: number;
  lng: number;
  postedAt: string;
  platforms: string[];
}

interface AnalysisResult {
  location: string;
  scores: {
    airQuality: number;
    waterQuality: number;
    climateEmissions: number;
    greenSpace: number;
    pollution: number;
  };
  epaContext?: {
    totalFacilities: number;
    facilitiesWithViolations: number;
  };
}

// --- Grade helpers ---

function getLetterGrade(score: number): string {
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 77) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 50) return "C";
  if (score >= 45) return "C-";
  if (score >= 40) return "D+";
  if (score >= 30) return "D";
  if (score >= 20) return "D-";
  return "F";
}

// --- CLI args ---

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const platformArg = args.find((a) => a.startsWith("--platform="));
const platform = platformArg ? platformArg.split("=")[1] : "both";

// --- Paths ---

const LOCATIONS_PATH = path.join(import.meta.dirname, "locations.json");
const HISTORY_PATH = path.join(import.meta.dirname, "post-history.json");

// --- History management ---

function loadHistory(): PostHistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
    }
  } catch {
    // corrupt file, start fresh
  }
  return [];
}

function saveHistory(history: PostHistoryEntry[]): void {
  // Prune entries older than 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pruned = history.filter(
    (h) => new Date(h.postedAt).getTime() > cutoff,
  );
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(pruned, null, 2));
}

// --- Location selection ---

function pickLocation(): Location {
  const locations: Location[] = JSON.parse(
    fs.readFileSync(LOCATIONS_PATH, "utf-8"),
  );
  const history = loadHistory();
  const recentNames = new Set(history.map((h) => h.name));

  const eligible = locations.filter((loc) => !recentNames.has(loc.name));
  if (eligible.length === 0) {
    console.log(
      "All locations posted recently, picking from full list",
    );
    return locations[Math.floor(Math.random() * locations.length)];
  }

  return eligible[Math.floor(Math.random() * eligible.length)];
}

// --- API analysis ---

async function analyzeLocation(
  lat: number,
  lng: number,
): Promise<AnalysisResult> {
  const apiUrl = process.env.VERDE_API_URL;
  if (!apiUrl) throw new Error("VERDE_API_URL env var not set");

  const response = await fetch(`${apiUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });

  if (!response.ok) {
    throw new Error(`Analysis API returned ${response.status}`);
  }

  return response.json();
}

// --- Post formatting ---

function formatPost(
  location: Location,
  analysis: AnalysisResult,
): { text: string; url: string } {
  const { scores } = analysis;
  const avg = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.values(scores).length,
  );
  const overall = getLetterGrade(avg);

  const air = getLetterGrade(scores.airQuality);
  const water = getLetterGrade(scores.waterQuality);
  const climate = getLetterGrade(scores.climateEmissions);
  const green = getLetterGrade(scores.greenSpace);
  const clean = getLetterGrade(scores.pollution);

  const url = `verde.replit.app?lat=${location.lat.toFixed(2)}&lng=${location.lng.toFixed(2)}`;

  // EPA line (only if data available)
  let epaLine = "";
  if (analysis.epaContext && analysis.epaContext.totalFacilities > 0) {
    const { totalFacilities, facilitiesWithViolations } = analysis.epaContext;
    epaLine = facilitiesWithViolations > 0
      ? `\n${totalFacilities} EPA facilities nearby, ${facilitiesWithViolations} with violations`
      : `\n${totalFacilities} EPA facilities nearby`;
  }

  const text = [
    `\u{1f30d} ${analysis.location} scored ${overall} on Verde!`,
    `\u{1f4a8} Air: ${air} | \u{1f4a7} Water: ${water} | \u{1f321}\u{fe0f} Climate: ${climate}`,
    `\u{1f333} Green: ${green} | \u{2728} Pollution: ${clean}`,
    epaLine,
    `Check your area \u{2192} ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { text, url };
}

// --- X (Twitter) posting via OAuth 1.0a ---

async function postToX(text: string): Promise<void> {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    throw new Error("Missing X API credentials (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)");
  }

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const requestData = {
    url: "https://api.x.com/2/tweets",
    method: "POST" as const,
  };

  const token = { key: accessToken, secret: accessSecret };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(requestData.url, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API ${response.status}: ${body}`);
  }

  const result = await response.json();
  console.log(`[X] Posted tweet: ${result.data?.id}`);
}

// --- Bluesky posting via AT Protocol ---

async function postToBluesky(text: string, url: string): Promise<void> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;

  if (!handle || !appPassword) {
    throw new Error("Missing Bluesky credentials (BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)");
  }

  // Create session
  const sessionRes = await fetch(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    },
  );

  if (!sessionRes.ok) {
    throw new Error(`Bluesky auth failed: ${sessionRes.status}`);
  }

  const session = await sessionRes.json();

  // Build facets for the URL link
  const facets: any[] = [];
  const urlStart = text.indexOf(url);
  if (urlStart >= 0) {
    // Convert character offset to byte offset (UTF-8)
    const encoder = new TextEncoder();
    const byteStart = encoder.encode(text.slice(0, urlStart)).length;
    const byteEnd = byteStart + encoder.encode(url).length;

    facets.push({
      index: { byteStart, byteEnd },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: `https://${url}`,
        },
      ],
    });
  }

  // Create post record
  const postRes = await fetch(
    "https://bsky.social/xrpc/com.atproto.repo.createRecord",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: {
          $type: "app.bsky.feed.post",
          text,
          facets,
          createdAt: new Date().toISOString(),
          embed: {
            $type: "app.bsky.embed.external",
            external: {
              uri: `https://${url}`,
              title: "Verde - Environmental Scores",
              description: "Check environmental quality scores for any location",
            },
          },
        },
      }),
    },
  );

  if (!postRes.ok) {
    const body = await postRes.text();
    throw new Error(`Bluesky post failed: ${postRes.status}: ${body}`);
  }

  const result = await postRes.json();
  console.log(`[Bluesky] Posted: ${result.uri}`);
}

// --- Main ---

async function main() {
  console.log(
    `Verde Spotlight ${dryRun ? "(DRY RUN) " : ""}| Platform: ${platform}`,
  );

  // Pick location
  const location = pickLocation();
  console.log(
    `Selected: ${location.name} (${location.lat}, ${location.lng})`,
  );
  console.log(`Interest: ${location.interest}`);

  // Analyze
  console.log("Analyzing...");
  const analysis = await analyzeLocation(location.lat, location.lng);
  console.log(`Location resolved: ${analysis.location}`);

  // Format post
  const { text, url } = formatPost(location, analysis);

  console.log("\n--- Post Preview ---");
  console.log(text);
  console.log(`--- ${text.length} chars ---\n`);

  if (dryRun) {
    console.log("Dry run complete. No posts sent.");
    return;
  }

  const platforms: string[] = [];

  // Post to X
  if (platform === "both" || platform === "x") {
    try {
      await postToX(text);
      platforms.push("x");
    } catch (err) {
      console.error("[X] Failed:", err);
    }
  }

  // Post to Bluesky
  if (platform === "both" || platform === "bluesky") {
    try {
      await postToBluesky(text, url);
      platforms.push("bluesky");
    } catch (err) {
      console.error("[Bluesky] Failed:", err);
    }
  }

  // Update history
  if (platforms.length > 0) {
    const history = loadHistory();
    history.push({
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      postedAt: new Date().toISOString(),
      platforms,
    });
    saveHistory(history);
    console.log(`History updated (${platforms.join(", ")})`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
