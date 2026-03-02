import { getLetterGrade, getVibeLabel, computeAverage } from "@shared/grades";

// LRU cache for rendered OG images
const OG_CACHE_MAX = 200;
const OG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ogCache = new Map<string, { buffer: Buffer; timestamp: number }>();

export function getOgCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function getFromOgCache(key: string): Buffer | null {
  const entry = ogCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > OG_CACHE_TTL_MS) {
    ogCache.delete(key);
    return null;
  }
  return entry.buffer;
}

export function setInOgCache(key: string, buffer: Buffer): void {
  if (ogCache.size >= OG_CACHE_MAX) {
    const oldest = ogCache.keys().next().value;
    if (oldest !== undefined) ogCache.delete(oldest);
  }
  ogCache.set(key, { buffer, timestamp: Date.now() });
}

// Lazy-loaded canvas module
let canvasModule: typeof import("@napi-rs/canvas") | null = null;

async function getCanvas() {
  if (!canvasModule) {
    canvasModule = await import("@napi-rs/canvas");
  }
  return canvasModule;
}

function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function renderOgImage(
  location: string,
  scores: Record<string, number>,
): Promise<Buffer> {
  const { createCanvas } = await getCanvas();

  const W = 1200;
  const H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const average = computeAverage(scores);
  const overallGrade = getLetterGrade(average);
  const vibeLabel = getVibeLabel(average);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#064e3b");
  grad.addColorStop(0.5, "#065f46");
  grad.addColorStop(1, "#047857");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(200 + i * 180, 100 + (i % 2) * 400, 120 + i * 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grade box
  const gradeSize = 120;
  const gx = 100;
  const gy = 120;
  const gw = 160;
  const gh = 160;
  const gradeColorMap: Record<string, [string, string]> = {
    A: ["#10b981", "#059669"],
    B: ["#84cc16", "#65a30d"],
    C: ["#eab308", "#ca8a04"],
    D: ["#f97316", "#ea580c"],
    F: ["#ef4444", "#dc2626"],
  };
  const [gc1, gc2] = gradeColorMap[overallGrade.letter] || gradeColorMap.C;
  const gradeGrad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
  gradeGrad.addColorStop(0, gc1);
  gradeGrad.addColorStop(1, gc2);

  roundRect(ctx, gx, gy, gw, gh, 24);
  ctx.fillStyle = gradeGrad;
  ctx.fill();

  // Grade letter
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${gradeSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${overallGrade.letter}${overallGrade.modifier}`,
    gx + gw / 2,
    gy + gh / 2 - 8,
  );

  // Score number
  ctx.font = "600 14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`${average}/100`, gx + gw / 2, gy + gh / 2 + 55);

  // Location name
  const textX = gx + gw + 40;
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";

  const maxLocW = W - textX - 60;
  let locText = location;
  let locMeasure = ctx.measureText(locText);
  if (locMeasure.width > maxLocW) {
    while (ctx.measureText(locText + "...").width > maxLocW && locText.length > 10) {
      locText = locText.slice(0, -1);
    }
    locText += "...";
  }
  ctx.fillText(locText, textX, gy + 50);

  // Vibe label
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 22px sans-serif";
  ctx.fillText(`${vibeLabel} Environmental Score`, textX, gy + 90);

  // Category bars
  const categories = [
    { key: "airQuality", label: "Air Quality" },
    { key: "waterQuality", label: "Water Quality" },
    { key: "climateEmissions", label: "Climate & Emissions" },
    { key: "greenSpace", label: "Green Space" },
    { key: "pollution", label: "Pollution" },
  ];

  const barStartY = 320;
  const barH = 44;
  const barGap = 10;
  const barMaxW = W - 200;
  const barX = 100;
  const barColorMap: Record<string, string> = {
    A: "#10b981",
    B: "#84cc16",
    C: "#eab308",
    D: "#f97316",
    F: "#ef4444",
  };

  categories.forEach((cat, i) => {
    const y = barStartY + i * (barH + barGap);
    const val = scores[cat.key] || 0;
    const g = getLetterGrade(val);

    // Background track
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, barX, y, barMaxW, barH, barH / 2);
    ctx.fill();

    // Filled bar
    const fillW = Math.max((val / 100) * barMaxW, barH);
    const fw = Math.min(fillW, barMaxW);
    ctx.fillStyle = barColorMap[g.letter] || barColorMap.C;
    ctx.globalAlpha = 0.85;
    roundRect(ctx, barX, y, fw, barH, barH / 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(cat.label, barX + 16, y + barH / 2);

    // Grade
    ctx.textAlign = "right";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`${g.letter}${g.modifier}`, barX + barMaxW - 16, y + barH / 2);
  });

  // Footer
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 18px sans-serif";
  ctx.fillText("verde", 100, H - 40);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "400 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("How does your area compare?  verde.replit.app", W - 60, H - 40);

  return Buffer.from(canvas.toBuffer("image/png"));
}
