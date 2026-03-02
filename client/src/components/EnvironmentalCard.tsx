import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Droplets, Thermometer, Trees, CheckCircle2, MessageCircle, Send, Loader2, Factory, AlertTriangle, ChevronDown, Lightbulb, Info, X, Minimize2, Maximize2, Share2, Check, Map, Shield, Database, ExternalLink, Leaf, Download, Image, Link, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { getLetterGrade, getVibeLabel, computeAverage } from "@shared/grades";

interface ScoreDetail {
  value: number;
  factors: string[];
  tips?: string[];
}

interface ClimateTraceData {
  sourcesCount: number;
  totalEmissions: number;
  totalEmissionsFormatted: string;
  topSources: {
    name: string;
    sector: string;
    emissions: number | null;
    emissionsFormatted: string | null;
  }[];
  sectorBreakdown: {
    sector: string;
    count: number;
    emissions: number;
    emissionsFormatted: string;
  }[];
}

function getGradeColor(score: number): string {
  if (score >= 80) return "from-emerald-400 to-green-500";
  if (score >= 65) return "from-green-400 to-lime-500";
  if (score >= 50) return "from-yellow-400 to-amber-500";
  if (score >= 30) return "from-orange-400 to-red-400";
  return "from-red-500 to-rose-600";
}

function getGradeTextColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  if (score >= 30) return "text-orange-600";
  return "text-red-600";
}

function getGradeBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 65) return "bg-green-50 border-green-200";
  if (score >= 50) return "bg-yellow-50 border-yellow-200";
  if (score >= 30) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return "🌿";
  if (score >= 65) return "🌱";
  if (score >= 50) return "🌤";
  if (score >= 30) return "⚠️";
  return "🚨";
}

function getCategoryEmoji(key: string): string {
  const map: Record<string, string> = {
    airQuality: "💨",
    waterQuality: "💧",
    climateEmissions: "🌡️",
    greenSpace: "🌳",
    pollution: "🧹",
  };
  return map[key] || "📊";
}

function getCategoryLabel(key: string): string {
  const map: Record<string, string> = {
    airQuality: "Air Quality",
    waterQuality: "Water Quality",
    climateEmissions: "Climate & Emissions",
    greenSpace: "Green Space",
    pollution: "Pollution",
  };
  return map[key] || key;
}

function DataSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  
  const config: Record<string, { label: string; className: string }> = {
    calenviroscreen: { label: "CES 4.0", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    "climate-trace": { label: "Climate TRACE", className: "bg-teal-100 text-teal-700 border-teal-200" },
    deterministic: { label: "Data-driven", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    ai: { label: "AI estimated", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  
  const { label, className } = config[source] || config.ai!;
  
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${className}`} data-testid={`badge-source-${source}`}>
      <Database className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

interface ScoreProps {
  label: string;
  value: number;
  icon: any;
  colorClass: string;
  detail?: ScoreDetail;
  testId?: string;
  climateTraceData?: ClimateTraceData | null;
  dataSource?: string;
  sourceLink?: { label: string; url: string } | null;
}

function ScoreRow({ label, value, icon: Icon, colorClass, detail, testId, climateTraceData, dataSource, sourceLink }: ScoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const grade = getLetterGrade(value);
  
  let barColor = "bg-red-500";
  if (value >= 70) barColor = "bg-green-500";
  else if (value >= 40) barColor = "bg-yellow-500";

  const hasDetails = detail && (detail.factors?.length > 0 || detail.tips?.length);
  const hasClimateTrace = climateTraceData && climateTraceData.sourcesCount > 0;
  const isExpandable = hasDetails || hasClimateTrace;

  return (
    <div className="rounded-xl bg-secondary/30 transition-colors overflow-hidden">
      <button
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        className={`w-full p-3 text-left hover:bg-secondary/60 transition-colors ${isExpandable ? 'cursor-pointer' : 'cursor-default'}`}
        data-testid={testId}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-white shadow-sm ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm text-foreground/80 truncate">{label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <DataSourceBadge source={dataSource} />
                <span className={`font-bold text-sm ${getGradeTextColor(value)}`} data-testid={`${testId}-grade`}>{grade.letter}{grade.modifier}</span>
                <span className="text-xs text-muted-foreground">{value}</span>
                {isExpandable && (
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${barColor}`} 
              />
            </div>
          </div>
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && isExpandable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2" data-testid={`${testId}-details`}>
              {detail && detail.factors && detail.factors.length > 0 && (
                <div className="ml-11 p-2 rounded-lg bg-white/50 border border-secondary">
                  <div className="flex items-center gap-1 mb-1">
                    <Info className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Contributing Factors</span>
                  </div>
                  <ul className="space-y-1">
                    {detail.factors.map((factor, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-1">
                        <span className="text-muted-foreground mt-0.5">·</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {detail && detail.tips && detail.tips.length > 0 && (
                <div className="ml-11 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb className="w-3 h-3 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Tips</span>
                  </div>
                  <ul className="space-y-1">
                    {detail.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                        <span className="text-amber-500 mt-0.5">·</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {hasClimateTrace && (
                <div className="ml-11 p-2 rounded-lg bg-teal-50 border border-teal-200" data-testid="climate-trace-detail">
                  <div className="flex items-center gap-1 mb-2">
                    <Thermometer className="w-3 h-3 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700">Climate TRACE Emissions (50km)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-center p-1.5 bg-white rounded border border-teal-100">
                      <div className="text-sm font-bold text-foreground">{climateTraceData!.sourcesCount}</div>
                      <div className="text-xs text-muted-foreground">Sources</div>
                    </div>
                    <div className="text-center p-1.5 bg-white rounded border border-teal-100">
                      <div className="text-sm font-bold text-foreground">{climateTraceData!.totalEmissionsFormatted}</div>
                      <div className="text-xs text-muted-foreground">CO2e/yr</div>
                    </div>
                  </div>
                  {climateTraceData!.sectorBreakdown.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {climateTraceData!.sectorBreakdown.slice(0, 3).map((sector, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-teal-100 text-teal-800 border-teal-200">
                          {sector.sector}: {sector.emissionsFormatted}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {sourceLink && (
                <a href={sourceLink.url} target="_blank" rel="noopener noreferrer"
                   className="ml-11 flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  View source data on {sourceLink.label}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EnvironmentalCardProps {
  data: {
    location: string;
    summary: string;
    scores: {
      airQuality: number;
      waterQuality: number;
      climateEmissions: number;
      greenSpace: number;
      pollution: number;
    };
    scoreDetails?: {
      airQuality?: ScoreDetail;
      waterQuality?: ScoreDetail;
      climateEmissions?: ScoreDetail;
      greenSpace?: ScoreDetail;
      pollution?: ScoreDetail;
    };
    epaContext?: {
      totalFacilities: number;
      majorEmitters: number;
      facilitiesWithViolations: number;
      topIndustries: string[];
    } | null;
    aqiContext?: {
      aqi: number;
      category: string;
      station: string | null;
      dominantPollutant: string | null;
      lastUpdated: string | null;
    } | null;
    climateTraceContext?: {
      sourcesCount: number;
      totalEmissions: number;
      totalEmissionsFormatted: string;
      topSources: {
        name: string;
        sector: string;
        emissions: number | null;
        emissionsFormatted: string | null;
      }[];
      sectorBreakdown: {
        sector: string;
        count: number;
        emissions: number;
        emissionsFormatted: string;
      }[];
    } | null;
    landCoverContext?: {
      classes: {
        classId: number;
        name: string;
        color: string;
        count: number;
        percentage: number;
      }[];
      dominantClass: string;
      treePercentage: number;
      builtPercentage: number;
      waterPercentage: number;
      cropPercentage: number;
      vegetationPercentage: number;
    } | null;
    cesContext?: {
      censusTract: string;
      overallPercentile: number | null;
      pollutionBurden: { score: number | null; percentile: number | null };
      cleanupSites: { value: number | null; percentile: number | null };
      groundwaterThreats: { value: number | null; percentile: number | null };
      drinkingWater: { value: number | null; percentile: number | null };
      hazardousWaste: { value: number | null; percentile: number | null };
      impairedWaterBodies: { value: number | null; percentile: number | null };
      toxicReleases: { value: number | null; percentile: number | null };
      pesticides: { value: number | null; percentile: number | null };
    } | null;
    scoreSources?: Record<string, string>;
  };
  lat?: number;
  lng?: number;
  isLoading?: boolean;
}

interface EnvironmentalCardFullProps extends EnvironmentalCardProps {
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

function generateShareCard(
  location: string,
  scores: Record<string, number>,
  average: number,
  overallGrade: { letter: string; modifier: string },
  vibeLabel: string,
): HTMLCanvasElement {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#064e3b");
  grad.addColorStop(0.5, "#065f46");
  grad.addColorStop(1, "#047857");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(200 + i * 180, 100 + (i % 2) * 400, 120 + i * 20, 0, Math.PI * 2);
    ctx.fill();
  }

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

  ctx.beginPath();
  const r = 24;
  ctx.moveTo(gx + r, gy);
  ctx.lineTo(gx + gw - r, gy);
  ctx.quadraticCurveTo(gx + gw, gy, gx + gw, gy + r);
  ctx.lineTo(gx + gw, gy + gh - r);
  ctx.quadraticCurveTo(gx + gw, gy + gh, gx + gw - r, gy + gh);
  ctx.lineTo(gx + r, gy + gh);
  ctx.quadraticCurveTo(gx, gy + gh, gx, gy + gh - r);
  ctx.lineTo(gx, gy + r);
  ctx.quadraticCurveTo(gx, gy, gx + r, gy);
  ctx.closePath();
  ctx.fillStyle = gradeGrad;
  ctx.fill();

  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${gradeSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${overallGrade.letter}${overallGrade.modifier}`, gx + gw / 2, gy + gh / 2 - 8);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = `600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`${average}/100`, gx + gw / 2, gy + gh / 2 + 55);

  const textX = gx + gw + 40;

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

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

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText(`${vibeLabel} Environmental Score`, textX, gy + 90);

  const categories = [
    { key: "airQuality", label: "Air Quality", icon: "💨" },
    { key: "waterQuality", label: "Water Quality", icon: "💧" },
    { key: "climateEmissions", label: "Climate & Emissions", icon: "🌡️" },
    { key: "greenSpace", label: "Green Space", icon: "🌳" },
    { key: "pollution", label: "Pollution", icon: "✨" },
  ];

  const barStartY = 320;
  const barH = 44;
  const barGap = 10;
  const barMaxW = W - 200;
  const barX = 100;

  categories.forEach((cat, i) => {
    const y = barStartY + i * (barH + barGap);
    const val = scores[cat.key] || 0;
    const g = getLetterGrade(val);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    const br = barH / 2;
    ctx.moveTo(barX + br, y);
    ctx.lineTo(barX + barMaxW - br, y);
    ctx.quadraticCurveTo(barX + barMaxW, y, barX + barMaxW, y + br);
    ctx.quadraticCurveTo(barX + barMaxW, y + barH, barX + barMaxW - br, y + barH);
    ctx.lineTo(barX + br, y + barH);
    ctx.quadraticCurveTo(barX, y + barH, barX, y + br);
    ctx.quadraticCurveTo(barX, y, barX + br, y);
    ctx.closePath();
    ctx.fill();

    const fillW = Math.max((val / 100) * barMaxW, barH);
    const barColorMap: Record<string, string> = {
      A: "#10b981", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444",
    };
    ctx.fillStyle = barColorMap[g.letter] || barColorMap.C;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    const fw = Math.min(fillW, barMaxW);
    ctx.moveTo(barX + br, y);
    ctx.lineTo(barX + fw - br, y);
    ctx.quadraticCurveTo(barX + fw, y, barX + fw, y + br);
    ctx.quadraticCurveTo(barX + fw, y + barH, barX + fw - br, y + barH);
    ctx.lineTo(barX + br, y + barH);
    ctx.quadraticCurveTo(barX, y + barH, barX, y + br);
    ctx.quadraticCurveTo(barX, y, barX + br, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${cat.label}`, barX + 16, y + barH / 2);

    ctx.textAlign = "right";
    ctx.font = `bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(`${g.letter}${g.modifier}`, barX + barMaxW - 16, y + barH / 2);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText("verde", 100, H - 40);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `400 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("How does your area compare?  verde.replit.app", W - 60, H - 40);

  return canvas;
}

export function EnvironmentalCard({ data, lat, lng, isLoading, onClose, isMinimized, onToggleMinimize }: EnvironmentalCardFullProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (lat !== undefined && lng !== undefined && data?.location) {
      const params = new URLSearchParams(window.location.search);
      params.set("lat", lat.toFixed(4));
      params.set("lng", lng.toFixed(4));
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [lat, lng, data?.location]);

  const getShareText = useCallback(() => {
    const scores = data.scores;
    const average = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
    const overallGrade = getLetterGrade(average);
    const emoji = getScoreEmoji(average);

    const bestCategory = Object.entries(scores).reduce((best, [key, val]) => val > best[1] ? [key, val] as [string, number] : best, ["", 0] as [string, number]);
    const worstCategory = Object.entries(scores).reduce((worst, [key, val]) => val < worst[1] ? [key, val] as [string, number] : worst, ["", 100] as [string, number]);

    const scoreLines = Object.entries(scores).map(([key, val]) => {
      const g = getLetterGrade(val);
      return `${getCategoryEmoji(key)} ${getCategoryLabel(key)}: ${g.letter}${g.modifier}`;
    });

    return `${emoji} ${data.location} scored ${overallGrade.letter}${overallGrade.modifier} on Verde!\n\n${scoreLines.join("\n")}\n\nBest: ${getCategoryEmoji(bestCategory[0])} ${getCategoryLabel(bestCategory[0])} (${getLetterGrade(bestCategory[1]).letter}${getLetterGrade(bestCategory[1]).modifier})\nNeeds work: ${getCategoryEmoji(worstCategory[0])} ${getCategoryLabel(worstCategory[0])} (${getLetterGrade(worstCategory[1]).letter}${getLetterGrade(worstCategory[1]).modifier})\n\nHow does your area compare?`;
  }, [data]);

  const getShareUrl = useCallback(() => {
    return lat !== undefined && lng !== undefined
      ? `${window.location.origin}?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`
      : window.location.href;
  }, [lat, lng]);

  const handleShareLink = async () => {
    const shareText = getShareText();
    const shareUrl = getShareUrl();
    const average = Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Object.values(data.scores).length);
    const overallGrade = getLetterGrade(average);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.location} got ${overallGrade.letter}${overallGrade.modifier} on Verde`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // fall through
      }
    }
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShareImage = useCallback(() => {
    const scores = data.scores;
    const average = computeAverage(scores as unknown as Record<string, number>);
    const overallGrade = getLetterGrade(average);
    const vibeLabel = getVibeLabel(average);

    const canvas = generateShareCard(data.location, scores as unknown as Record<string, number>, average, overallGrade, vibeLabel);
    shareCardRef.current = canvas;
    setShowShareCard(true);
  }, [data]);

  const handleDownloadCard = useCallback(() => {
    if (!shareCardRef.current) return;
    const link = document.createElement("a");
    link.download = `verde-${data.location.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.png`;
    link.href = shareCardRef.current.toDataURL("image/png");
    link.click();
  }, [data]);

  const handleNativeShareCard = useCallback(async () => {
    if (!shareCardRef.current) return;
    const canvas = shareCardRef.current;
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const file = new File([blob], `verde-${data.location.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: getShareText(),
          url: getShareUrl(),
          files: [file],
        });
      } else {
        handleDownloadCard();
      }
    } catch (err) {
      handleDownloadCard();
    }
  }, [data, getShareText, getShareUrl, handleDownloadCard]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !lat || !lng) return;
    
    setIsAsking(true);
    setAnswer("");
    
    try {
      const response = await apiRequest("POST", "/api/ask", {
        lat,
        lng,
        location: data.location,
        question: question.trim(),
      });
      const result = await response.json();
      setAnswer(result.answer);
    } catch (error) {
      setAnswer("Sorry, I couldn't get an answer. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl w-full max-w-md animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-muted rounded-2xl"></div>
          <div className="flex-1">
            <div className="h-5 bg-muted rounded-lg w-2/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-16 bg-muted rounded-lg w-full mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const average = computeAverage(data.scores as unknown as Record<string, number>);
  const overallGrade = getLetterGrade(average);
  const vibeLabel = getVibeLabel(average);

  if (isMinimized) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl overflow-hidden"
      >
        <button
          onClick={onToggleMinimize}
          className="w-full p-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
          data-testid="button-expand-card"
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradeColor(average)} flex items-center justify-center shadow-md flex-shrink-0`}>
            <span className="text-white font-bold text-lg" data-testid="text-overall-grade">
              {overallGrade.letter}{overallGrade.modifier}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">{data.location}</div>
            <div className={`text-xs ${getGradeTextColor(average)}`}>{vibeLabel}</div>
          </div>
          <Maximize2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-md border border-white/40 rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[70vh] md:max-h-[80vh]"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary z-10" />
      
      <div className="flex items-center justify-between p-3 pt-4 border-b border-secondary/30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradeColor(average)} flex flex-col items-center justify-center shadow-lg flex-shrink-0`} data-testid="badge-overall-grade">
            <span className="text-white font-bold text-xl leading-none">{overallGrade.letter}{overallGrade.modifier}</span>
            <span className="text-white/80 text-[9px] font-medium leading-none mt-0.5">{average}/100</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold font-display text-foreground truncate" data-testid="text-location">{data.location}</h2>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold ${getGradeTextColor(average)}`}>{vibeLabel}</span>
              <span className="text-[10px] text-muted-foreground">Environmental Score</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onToggleMinimize && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleMinimize}
              className="h-8 w-8 rounded-lg"
              data-testid="button-minimize-card"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
              data-testid="button-close-card"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar">
        <div className="flex gap-1 mb-4">
          <Button
            onClick={handleShareLink}
            variant="default"
            size="sm"
            className={`flex-1 rounded-xl rounded-r-none font-semibold text-sm ${
              shareStatus === "copied"
                ? "bg-green-500 text-white"
                : "bg-primary text-white"
            }`}
            data-testid="button-share"
          >
            {shareStatus === "copied" ? (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="rounded-xl rounded-l-none border-l border-white/20 bg-primary text-white px-2"
                data-testid="button-share-dropdown"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={async () => {
                try {
                  await navigator.clipboard.writeText(getShareUrl());
                  setShareStatus("copied");
                  setTimeout(() => setShareStatus("idle"), 2500);
                } catch {}
              }}>
                <Link className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                handleShareImage();
                setTimeout(() => handleDownloadCard(), 100);
              }}>
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                handleShareImage();
                setTimeout(() => handleNativeShareCard(), 100);
              }}>
                <Image className="w-4 h-4 mr-2" />
                Share Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/20 p-3 rounded-lg border border-secondary/50 mb-4" data-testid="text-summary">
          {data.summary}
        </p>
          
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Ask about this place</span>
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAskQuestion(); }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Best hiking trails nearby?"
              className="flex-1 h-9 text-sm bg-white border-primary/20"
              disabled={isAsking}
              data-testid="input-question"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!question.trim() || isAsking}
              className="h-9 w-9"
              data-testid="button-ask"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          {answer && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 p-2 rounded bg-white border border-primary/10 text-sm text-foreground/90"
              data-testid="text-ai-answer"
            >
              {answer}
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category Scores</span>
          <span className="text-[10px] text-muted-foreground">tap to expand</span>
        </div>

        <div className="space-y-2.5">
          <ScoreRow
            label="Air Quality"
            value={data.scores.airQuality}
            icon={Wind}
            colorClass="text-sky-500"
            detail={data.scoreDetails?.airQuality}
            testId="score-air-quality"
            dataSource={data.scoreSources?.airQuality}
            sourceLink={data.aqiContext ? { label: "WAQI", url: "https://aqicn.org/here" } : null}
          />
          <ScoreRow
            label="Water Quality"
            value={data.scores.waterQuality}
            icon={Droplets}
            colorClass="text-blue-500"
            detail={data.scoreDetails?.waterQuality}
            testId="score-water-quality"
            dataSource={data.scoreSources?.waterQuality}
            sourceLink={data.cesContext ? { label: "CalEnviroScreen", url: "https://experience.arcgis.com/experience/11d2f52282a54ceebcac7428e6a4e3da" } : null}
          />
          <ScoreRow
            label="Climate & Emissions"
            value={data.scores.climateEmissions}
            icon={Thermometer}
            colorClass="text-teal-500"
            detail={data.scoreDetails?.climateEmissions}
            testId="score-climate-emissions"
            climateTraceData={data.climateTraceContext}
            dataSource={data.scoreSources?.climateEmissions}
            sourceLink={lat != null && lng != null ? { label: "Climate TRACE", url: `https://climatetrace.org/explore#lat=${lat}&lng=${lng}&zoom=10` } : null}
          />
          <ScoreRow
            label="Green Space"
            value={data.scores.greenSpace}
            icon={Trees}
            colorClass="text-green-600"
            detail={data.scoreDetails?.greenSpace}
            testId="score-green-space"
            dataSource={data.scoreSources?.greenSpace}
            sourceLink={lat != null && lng != null ? { label: "Copernicus", url: `https://browser.dataspace.copernicus.eu/?zoom=14&lat=${lat}&lng=${lng}` } : null}
          />
          <ScoreRow
            label="Pollution"
            value={data.scores.pollution}
            icon={CheckCircle2}
            colorClass="text-purple-500"
            detail={data.scoreDetails?.pollution}
            testId="score-cleanliness"
            dataSource={data.scoreSources?.pollution}
            sourceLink={lat != null && lng != null ? { label: "EPA ECHO", url: `https://echo.epa.gov/facilities/facility-search/results?lat=${lat}&lng=${lng}&radius=10` } : null}
          />
        </div>

        {data.epaContext && data.epaContext.totalFacilities > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200" data-testid="section-epa-context">
            <div className="flex items-center gap-2 mb-2">
              <Factory className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">EPA Facility Data (10 mi radius)</span>
              {lat != null && lng != null && (
                <a href={`https://echo.epa.gov/facilities/facility-search/results?lat=${lat}&lng=${lng}&radius=10`} target="_blank" rel="noopener noreferrer"
                   className="ml-auto text-xs text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-0.5">
                  EPA ECHO <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center p-2 bg-white rounded border border-amber-100">
                <div className="text-lg font-bold text-foreground">{data.epaContext.totalFacilities}</div>
                <div className="text-xs text-muted-foreground">Facilities</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-amber-100">
                <div className="text-lg font-bold text-foreground">{data.epaContext.majorEmitters}</div>
                <div className="text-xs text-muted-foreground">Major</div>
              </div>
              <div className={`text-center p-2 bg-white rounded border ${data.epaContext.facilitiesWithViolations > 0 ? 'border-red-200 bg-red-50' : 'border-amber-100'}`}>
                <div className={`text-lg font-bold ${data.epaContext.facilitiesWithViolations > 0 ? 'text-red-600' : 'text-foreground'}`}>
                  {data.epaContext.facilitiesWithViolations}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  {data.epaContext.facilitiesWithViolations > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  Violations
                </div>
              </div>
            </div>
            {data.epaContext.topIndustries && data.epaContext.topIndustries.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.epaContext.topIndustries.map((industry, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                    {industry}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {data.cesContext && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200" data-testid="section-ces-context">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">CalEnviroScreen 4.0</span>
              <span className="text-xs text-indigo-500">Tract {data.cesContext.censusTract}</span>
              <a href="https://experience.arcgis.com/experience/11d2f52282a54ceebcac7428e6a4e3da" target="_blank" rel="noopener noreferrer"
                 className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-0.5">
                View Map <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {data.cesContext.overallPercentile !== null && (
                <div className="text-center p-2 bg-white rounded border border-indigo-100">
                  <div className={`text-lg font-bold ${data.cesContext.overallPercentile > 75 ? 'text-red-600' : data.cesContext.overallPercentile > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {data.cesContext.overallPercentile.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">CES Percentile</div>
                </div>
              )}
              {data.cesContext.pollutionBurden.percentile !== null && (
                <div className="text-center p-2 bg-white rounded border border-indigo-100">
                  <div className={`text-lg font-bold ${data.cesContext.pollutionBurden.percentile > 75 ? 'text-red-600' : data.cesContext.pollutionBurden.percentile > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {data.cesContext.pollutionBurden.percentile.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Pollution Burden</div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {data.cesContext.cleanupSites.value !== null && data.cesContext.cleanupSites.value > 0 && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200" data-testid="badge-cleanup-sites">
                  {data.cesContext.cleanupSites.value.toFixed(0)} cleanup sites
                </Badge>
              )}
              {data.cesContext.groundwaterThreats.percentile !== null && data.cesContext.groundwaterThreats.percentile > 50 && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200" data-testid="badge-groundwater">
                  GW threats: {data.cesContext.groundwaterThreats.percentile.toFixed(0)}th pctl
                </Badge>
              )}
              {data.cesContext.drinkingWater.percentile !== null && data.cesContext.drinkingWater.percentile > 50 && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200" data-testid="badge-drinking-water">
                  Drinking water: {data.cesContext.drinkingWater.percentile.toFixed(0)}th pctl
                </Badge>
              )}
              {data.cesContext.hazardousWaste.percentile !== null && data.cesContext.hazardousWaste.percentile > 50 && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200" data-testid="badge-hazwaste">
                  Haz waste: {data.cesContext.hazardousWaste.percentile.toFixed(0)}th pctl
                </Badge>
              )}
              {data.cesContext.toxicReleases.percentile !== null && data.cesContext.toxicReleases.percentile > 50 && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200" data-testid="badge-toxic-releases">
                  Toxic releases: {data.cesContext.toxicReleases.percentile.toFixed(0)}th pctl
                </Badge>
              )}
            </div>
          </div>
        )}

        {data.landCoverContext && data.landCoverContext.classes.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-200" data-testid="section-land-cover">
            <div className="flex items-center gap-2 mb-2">
              <Map className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-medium text-sky-800">Land Use (1km radius)</span>
              {lat != null && lng != null && (
                <a href={`https://browser.dataspace.copernicus.eu/?zoom=14&lat=${lat}&lng=${lng}`} target="_blank" rel="noopener noreferrer"
                   className="ml-auto text-xs text-sky-500 hover:text-sky-700 transition-colors flex items-center gap-0.5">
                  Copernicus <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-white rounded border border-sky-100">
                <div className="text-lg font-bold text-green-600">{data.landCoverContext.vegetationPercentage}%</div>
                <div className="text-xs text-muted-foreground">Vegetation</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-sky-100">
                <div className="text-lg font-bold text-red-600">{data.landCoverContext.builtPercentage}%</div>
                <div className="text-xs text-muted-foreground">Built Area</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-sky-100">
                <div className="text-lg font-bold text-blue-600">{data.landCoverContext.waterPercentage}%</div>
                <div className="text-xs text-muted-foreground">Water</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.landCoverContext.classes.slice(0, 5).map((cls, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="text-xs text-foreground flex-1">{cls.name}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${Math.min(cls.percentage, 100)}%`, backgroundColor: cls.color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-10 text-right">{cls.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-sky-600 text-center">
              Dominant: {data.landCoverContext.dominantClass}
            </div>
          </div>
        )}
        
        <div className="mt-5 pt-3 border-t border-secondary/40">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Leaf className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-primary">Verde</span>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            {data.cesContext 
              ? "Scores driven by CalEnviroScreen 4.0, EPA ECHO, WAQI, Sentinel-2 & Climate TRACE."
              : "Powered by EPA ECHO, WAQI, Sentinel-2, Climate TRACE & Verde AI."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
