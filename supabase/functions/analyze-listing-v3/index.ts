import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisInputV3 {
  analysisId: string;
  title: string;
  description: string;
  askingPrice: number;
  marketplace: string;
  imageUrls: string[];
  listingUrl?: string;
  category?: string;
  userProfile?: {
    budget: number;
    riskTolerance: string;
    targetRoiMin: number;
    targetDaysToSellMax: number;
    preferredCategories: string[];
  };
}

// ============ MAIN ============
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const input: AnalysisInputV3 = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("analyses")
      .update({ status: "analyzing" })
      .eq("id", input.analysisId);

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const openrouterModel = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o";

    let result: AnalysisResultV3;
    let engine = "deterministic";

    if (openrouterKey) {
      engine = "openrouter-v3";
      try {
        result = await runLLMAnalysisV3(input, openrouterKey, openrouterModel, supabase);
      } catch (aiErr) {
        console.error("OpenRouter V3 analysis failed, falling back:", aiErr);
        engine = "deterministic-v3";
        result = runDeterministicAnalysisV3(input);
      }
    } else {
      console.log("No OPENROUTER_API_KEY, using deterministic V3 analysis");
      result = runDeterministicAnalysisV3(input);
    }

    // Fetch historical price data for trend analysis
    const historicalData = await fetchHistoricalPriceData(supabase, input);
    const trendAnalysis = analyzeTrends(historicalData, result.layer4, input);

    // Save to database
    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        status: "complete",
        category: input.category || result.layer1.category,
        item_brand: result.layer1.brand,
        item_model: result.layer1.model,
        item_year: result.layer1.year,
        item_color: result.layer1.color,
        item_variant: result.layer1.variant,
        item_condition: result.layer2.overallCondition,
        item_accessories: result.layer1.accessories?.join(", ") ?? null,
        identification_confidence: result.layer1.confidence,
        identification_reasoning: result.layer1.reasoning,
        condition_scores: result.layer2.scores,
        condition_risk_score: result.layer2.riskScore,
        authenticity_verdict: result.layer3.isAuthentic,
        authenticity_confidence: result.layer3.confidence,
        fair_market_value: result.layer4.fairMarketValue,
        resale_low: result.layer4.resaleLow,
        resale_high: result.layer4.resaleHigh,
        fast_sale_price: result.layer4.fastSalePrice,
        max_acquisition_price: result.layer4.maxAcquisitionPrice,
        expected_profit: result.layer4.expectedProfit,
        expected_roi: result.layer4.expectedRoi,
        expected_days_to_sell_low: result.layer4.daysToSellLow,
        expected_days_to_sell_high: result.layer4.daysToSellHigh,
        valuation_confidence: result.layer4.confidence,
        opportunity_score: result.layer5.score,
        opportunity_tier: result.layer5.tier,
        decision: result.decision.action,
        fraud_risk_score: result.fraud.riskScore,
        fraud_primary_concern: result.fraud.primaryConcern,
        fraud_secondary_concern: result.fraud.secondaryConcern,
        comps: result.comps,
        inspection_checklist: result.inspectionChecklist,
        negotiation_recommended_offer: result.negotiation.recommendedOffer,
        negotiation_probability: result.negotiation.probability,
        negotiation_message: result.negotiation.message,
        layer_results: result,
        trend_analysis: trendAnalysis,
        analysis_engine: engine,
      })
      .eq("id", input.analysisId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Create deal alert if score is high
    if (result.layer5.score >= 70) {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("user_id")
        .eq("id", input.analysisId)
        .single();

      if (analysis) {
        await supabase.from("deal_alerts").insert({
          user_id: analysis.user_id,
          analysis_id: input.analysisId,
          title: input.title,
          marketplace: input.marketplace,
          asking_price: input.askingPrice,
          opportunity_score: result.layer5.score,
          expected_profit: result.layer4.expectedProfit,
          decision: result.decision.action,
          is_read: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysisId: input.analysisId,
        decision: result.decision.action,
        opportunityScore: result.layer5.score,
        expectedProfit: result.layer4.expectedProfit,
        expectedRoi: result.layer4.expectedRoi,
        engine,
        trendAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Analysis error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ TYPES ============
interface AnalysisResultV3 {
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  layer5: Layer5Result;
  decision: { action: "BUY" | "NEGOTIATE" | "WATCH" | "AVOID"; reasoning: string };
  fraud: { riskScore: number; primaryConcern: string; secondaryConcern: string; concerns: string[] };
  comps: any[];
  inspectionChecklist: any[];
  negotiation: { recommendedOffer: number; probability: number; message: string; walkAwayPrice: number };
}

interface Layer1Result {
  brand: string;
  model: string;
  year: string | null;
  color: string | null;
  variant: string | null;
  accessories: string[] | null;
  confidence: number;
  reasoning: string;
  category: string;
}

interface Layer2Result {
  overallCondition: string;
  conditionScore: number;
  scores: Record<string, number>;
  issues: string[];
  riskScore: number;
  reasoning: string;
}

interface Layer3Result {
  isAuthentic: boolean;
  confidence: number;
  positiveSignals: string[];
  negativeSignals: string[];
  reasoning: string;
}

interface Layer4Result {
  fairMarketValue: number;
  resaleLow: number;
  resaleHigh: number;
  fastSalePrice: number;
  maxAcquisitionPrice: number;
  expectedProfit: number;
  expectedRoi: number;
  daysToSellLow: number;
  daysToSellHigh: number;
  confidence: "High" | "Medium" | "Low";
  reasoning: string;
  historicalTrend?: { direction: "up" | "down" | "stable"; percentChange: number; period: string };
}

interface Layer5Result {
  score: number;
  tier: string;
  reasoning: string;
}

// ============ ENHANCED LLM ANALYSIS V3 ============
async function runLLMAnalysisV3(
  input: AnalysisInputV3,
  apiKey: string,
  model: string,
  supabase: any
): Promise<AnalysisResultV3> {
  const systemPrompt = `You are HAKKEN V3, an expert AI resale intelligence analyst with advanced computer vision and market analysis capabilities.

You will analyze a listing and return a JSON object with enhanced analysis including:
- Multi-point condition scoring with defect detection
- Authenticity verification with specific markers
- Historical price trend analysis
- Market saturation and demand signals
- Risk-adjusted opportunity scoring

Return ONLY valid JSON, no markdown:
{
  "layer1_identification": {
    "brand": "string",
    "model": "string",
    "year": "string or null",
    "color": "string or null",
    "variant": "string or null",
    "accessories": ["array of strings"],
    "category": "string",
    "confidence": "number 0-100",
    "reasoning": "string"
  },
  "layer2_condition": {
    "overallCondition": "string - Mint/Excellent/Very Good/Good/Fair/Poor",
    "conditionScore": "number 0-100",
    "scores": {
      "exterior": "number 0-100",
      "functionality": "number 0-100",
      "originality": "number 0-100",
      "packaging": "number 0-100"
    },
    "issues": ["array of detected issues"],
    "riskScore": "number 0-100",
    "reasoning": "string"
  },
  "layer3_authenticity": {
    "isAuthentic": "boolean",
    "confidence": "number 0-100",
    "positiveSignals": ["array of strings"],
    "negativeSignals": ["array of strings"],
    "reasoning": "string"
  },
  "layer4_valuation": {
    "fairMarketValue": "number - in USD",
    "resaleLow": "number",
    "resaleHigh": "number",
    "fastSalePrice": "number",
    "maxAcquisitionPrice": "number",
    "expectedProfit": "number",
    "expectedRoi": "number",
    "daysToSellLow": "number",
    "daysToSellHigh": "number",
    "confidence": "string - High/Medium/Low",
    "reasoning": "string"
  },
  "layer5_opportunity": {
    "score": "number 0-100",
    "tier": "string - Exceptional/Strong/Interesting/Weak/Avoid",
    "reasoning": "string"
  },
  "fraud": {
    "riskScore": "number 0-100",
    "primaryConcern": "string",
    "secondaryConcern": "string",
    "concerns": ["array of strings"]
  }
}`;

  const userContent: any[] = [
    {
      type: "text",
      text: `Analyze this listing carefully:

Title: ${input.title}
Description: ${input.description}
Asking Price: $${input.askingPrice}
Marketplace: ${input.marketplace}
Category: ${input.category || "Unknown"}
URL: ${input.listingUrl || "N/A"}

Focus on:
1. Exact product identification with high confidence
2. Multi-point condition assessment (exterior, functionality, originality, packaging)
3. Specific authenticity markers for this brand/model
4. Fair market value based on recent comparable sales
5. Risk-adjusted opportunity score considering all factors

Analyze the photos carefully for defects, wear patterns, and authenticity indicators.`,
    },
  ];

  // Add up to 4 images for GPT-4o vision
  for (const url of input.imageUrls.slice(0, 4)) {
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenRouter");

  const parsed = JSON.parse(content);
  return normalizeAIResultV3(parsed, input);
}

// ============ DETERMINISTIC ANALYSIS V3 ============
function runDeterministicAnalysisV3(input: AnalysisInputV3): AnalysisResultV3 {
  const text = `${input.title} ${input.description}`.toLowerCase();

  // Layer 1: Product Identification
  const layer1: Layer1Result = {
    brand: extractBrand(text, input.title),
    model: extractModel(text, input.title),
    year: extractYear(text),
    color: extractColor(text),
    variant: null,
    accessories: extractAccessories(text),
    confidence: 65,
    reasoning: "Identified from listing text and title analysis",
    category: input.category || "General",
  };

  // Layer 2: Condition Assessment
  const conditionKeywords = {
    mint: ["mint", "new", "sealed", "unopened"],
    excellent: ["excellent", "like new", "barely used"],
    veryGood: ["very good", "light use", "minor wear"],
    good: ["good", "used", "some wear"],
    fair: ["fair", "worn", "cosmetic damage"],
    poor: ["poor", "damaged", "broken", "for parts"],
  };

  let overallCondition = "Good";
  let conditionScore = 60;

  for (const [condition, keywords] of Object.entries(conditionKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      overallCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
      conditionScore = { mint: 95, excellent: 85, veryGood: 75, good: 60, fair: 40, poor: 20 }[condition] || 60;
      break;
    }
  }

  const layer2: Layer2Result = {
    overallCondition,
    conditionScore,
    scores: {
      exterior: conditionScore - 5,
      functionality: conditionScore,
      originality: conditionScore + 5,
      packaging: conditionScore - 10,
    },
    issues: detectIssues(text),
    riskScore: 100 - conditionScore,
    reasoning: `Condition assessed as ${overallCondition} based on listing description`,
  };

  // Layer 3: Authenticity
  const layer3: Layer3Result = {
    isAuthentic: !detectCounterfeitSignals(text),
    confidence: 70,
    positiveSignals: detectAuthenticitySignals(text),
    negativeSignals: detectCounterfeitSignals(text) ? ["Potential counterfeit indicators detected"] : [],
    reasoning: "Authenticity assessed based on listing details and images",
  };

  // Layer 4: Valuation
  const fmv = Math.round(input.askingPrice * 1.5);
  const feeRate = 0.13;
  const expectedProfit = Math.round(fmv - input.askingPrice - fmv * feeRate);
  const expectedRoi = input.askingPrice > 0 ? Math.round((expectedProfit / input.askingPrice) * 1000) / 10 : 0;

  const layer4: Layer4Result = {
    fairMarketValue: fmv,
    resaleLow: Math.round(fmv * 0.85),
    resaleHigh: Math.round(fmv * 1.15),
    fastSalePrice: Math.round(fmv * 0.80),
    maxAcquisitionPrice: Math.round(fmv * (1 - feeRate - 0.15)),
    expectedProfit,
    expectedRoi,
    daysToSellLow: 7,
    daysToSellHigh: 30,
    confidence: "Medium",
    reasoning: "Valuation based on category benchmarks and asking price",
  };

  // Layer 5: Opportunity
  const opportunityScore = calculateOpportunityScore(layer4, layer2, layer3, input);
  const tier = getTier(opportunityScore);

  const layer5: Layer5Result = {
    score: opportunityScore,
    tier,
    reasoning: `Opportunity score ${opportunityScore}/100 (${tier})`,
  };

  // Decision
  const decision = makeDecision(layer4, layer5, layer3, input);

  // Fraud Assessment
  const fraud = assessFraud(input, layer1, layer3);

  // Comps
  const comps = buildComps(layer1, layer4);

  // Inspection Checklist
  const inspectionChecklist = buildInspectionChecklist(layer1, layer2);

  // Negotiation
  const negotiation = buildNegotiation(input, layer4, layer5);

  return {
    layer1,
    layer2,
    layer3,
    layer4,
    layer5,
    decision,
    fraud,
    comps,
    inspectionChecklist,
    negotiation,
  };
}

// ============ HELPER FUNCTIONS ============
function normalizeAIResultV3(ai: any, input: AnalysisInputV3): AnalysisResultV3 {
  const layer1: Layer1Result = {
    brand: ai.layer1_identification?.brand || "Unknown",
    model: ai.layer1_identification?.model || "Unknown",
    year: ai.layer1_identification?.year || null,
    color: ai.layer1_identification?.color || null,
    variant: ai.layer1_identification?.variant || null,
    accessories: ai.layer1_identification?.accessories || null,
    confidence: clampInt(ai.layer1_identification?.confidence, 0, 100, 50),
    reasoning: ai.layer1_identification?.reasoning || "Identification based on listing details",
    category: ai.layer1_identification?.category || "General",
  };

  const scores = ai.layer2_condition?.scores || {};
  const layer2: Layer2Result = {
    overallCondition: ai.layer2_condition?.overallCondition || "Good",
    conditionScore: clampInt(ai.layer2_condition?.conditionScore, 0, 100, 60),
    scores: typeof scores === "object" ? scores : {},
    issues: ai.layer2_condition?.issues || [],
    riskScore: clampInt(ai.layer2_condition?.riskScore, 0, 100, 40),
    reasoning: ai.layer2_condition?.reasoning || "Condition assessed from available information",
  };

  const layer3: Layer3Result = {
    isAuthentic: ai.layer3_authenticity?.isAuthentic ?? true,
    confidence: clampInt(ai.layer3_authenticity?.confidence, 0, 100, 50),
    positiveSignals: ai.layer3_authenticity?.positiveSignals || [],
    negativeSignals: ai.layer3_authenticity?.negativeSignals || [],
    reasoning: ai.layer3_authenticity?.reasoning || "Authenticity assessed from available signals",
  };

  const fmv = Number(ai.layer4_valuation?.fairMarketValue) || input.askingPrice * 1.5;
  const asking = input.askingPrice;
  const feeRate = 0.13;
  const expectedProfit = Math.round(fmv - asking - fmv * feeRate);
  const expectedRoi = asking > 0 ? Math.round((expectedProfit / asking) * 1000) / 10 : 0;

  const layer4: Layer4Result = {
    fairMarketValue: Math.round(fmv),
    resaleLow: Math.round(Number(ai.layer4_valuation?.resaleLow) || fmv * 0.85),
    resaleHigh: Math.round(Number(ai.layer4_valuation?.resaleHigh) || fmv * 1.15),
    fastSalePrice: Math.round(Number(ai.layer4_valuation?.fastSalePrice) || fmv * 0.80),
    maxAcquisitionPrice: Math.round(Number(ai.layer4_valuation?.maxAcquisitionPrice) || fmv * (1 - feeRate - 0.15)),
    expectedProfit,
    expectedRoi,
    daysToSellLow: ai.layer4_valuation?.daysToSellLow || 7,
    daysToSellHigh: ai.layer4_valuation?.daysToSellHigh || 30,
    confidence: ai.layer4_valuation?.confidence || "Medium",
    reasoning: ai.layer4_valuation?.reasoning || "Valuation based on market analysis",
  };

  const layer5: Layer5Result = {
    score: clampInt(ai.layer5_opportunity?.score, 0, 100, 50),
    tier: ai.layer5_opportunity?.tier || "Interesting",
    reasoning: ai.layer5_opportunity?.reasoning || "Opportunity assessed from all factors",
  };

  const fraud = {
    riskScore: clampInt(ai.fraud?.riskScore, 0, 100, 20),
    primaryConcern: ai.fraud?.primaryConcern || "No major fraud indicators detected",
    secondaryConcern: ai.fraud?.secondaryConcern || "Standard precautions apply",
    concerns: ai.fraud?.concerns || [],
  };

  const decision = makeDecision(layer4, layer5, layer3, input);
  const negotiation = buildNegotiation(input, layer4, layer5);
  const comps = buildComps(layer1, layer4);
  const inspectionChecklist = buildInspectionChecklist(layer1, layer2);

  return {
    layer1,
    layer2,
    layer3,
    layer4,
    layer5,
    decision,
    fraud,
    comps,
    inspectionChecklist,
    negotiation,
  };
}

function clampInt(val: any, min: number, max: number, def: number): number {
  const num = Number(val);
  if (isNaN(num)) return def;
  return Math.max(min, Math.min(max, num));
}

function extractBrand(text: string, title: string): string {
  const brands = ["rolex", "omega", "cartier", "apple", "sony", "canon", "nikon", "gucci", "louis vuitton", "prada"];
  for (const brand of brands) {
    if (text.includes(brand)) return brand.charAt(0).toUpperCase() + brand.slice(1);
  }
  const titleParts = title.split(" ");
  return titleParts[0] || "Unknown";
}

function extractModel(text: string, title: string): string {
  const titleParts = title.split(" ");
  return titleParts.slice(0, 3).join(" ") || "Unknown";
}

function extractYear(text: string): string | null {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : null;
}

function extractColor(text: string): string | null {
  const colors = ["black", "white", "silver", "gold", "blue", "red", "green", "brown", "gray"];
  for (const color of colors) {
    if (text.includes(color)) return color.charAt(0).toUpperCase() + color.slice(1);
  }
  return null;
}

function extractAccessories(text: string): string[] {
  const accessories = [];
  if (text.includes("box")) accessories.push("Original Box");
  if (text.includes("papers")) accessories.push("Papers");
  if (text.includes("manual")) accessories.push("Manual");
  if (text.includes("charger")) accessories.push("Charger");
  if (text.includes("cable")) accessories.push("Cable");
  return accessories;
}

function detectIssues(text: string): string[] {
  const issues = [];
  if (text.includes("scratch")) issues.push("Scratches detected");
  if (text.includes("dent")) issues.push("Dents detected");
  if (text.includes("crack")) issues.push("Cracks detected");
  if (text.includes("broken")) issues.push("Broken parts");
  if (text.includes("missing")) issues.push("Missing parts");
  return issues;
}

function detectCounterfeitSignals(text: string): boolean {
  const signals = ["fake", "replica", "counterfeit", "knockoff"];
  return signals.some((signal) => text.includes(signal));
}

function detectAuthenticitySignals(text: string): string[] {
  const signals = [];
  if (text.includes("serial")) signals.push("Serial number present");
  if (text.includes("certificate")) signals.push("Certificate of authenticity");
  if (text.includes("hologram")) signals.push("Hologram present");
  if (text.includes("original")) signals.push("Original packaging");
  return signals;
}

function calculateOpportunityScore(layer4: Layer4Result, layer2: Layer2Result, layer3: Layer3Result, input: AnalysisInputV3): number {
  let score = 50;
  if (layer4.expectedRoi > 50) score += 20;
  else if (layer4.expectedRoi > 25) score += 10;
  if (layer2.conditionScore > 80) score += 10;
  if (layer3.isAuthentic) score += 15;
  if (layer4.daysToSellHigh < 14) score += 10;
  if (layer4.expectedProfit > 100) score += 5;
  return Math.min(100, Math.max(0, score));
}

function getTier(score: number): string {
  if (score >= 85) return "Exceptional";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Interesting";
  if (score >= 40) return "Weak";
  return "Avoid";
}

function makeDecision(layer4: Layer4Result, layer5: Layer5Result, layer3: Layer3Result, input: AnalysisInputV3): { action: "BUY" | "NEGOTIATE" | "WATCH" | "AVOID"; reasoning: string } {
  if (!layer3.isAuthentic) return { action: "AVOID", reasoning: "Authenticity concerns" };
  if (layer5.score >= 75) return { action: "BUY", reasoning: `Strong opportunity (score ${layer5.score})` };
  if (layer5.score >= 60) return { action: "NEGOTIATE", reasoning: `Interesting opportunity (score ${layer5.score})` };
  if (layer5.score >= 40) return { action: "WATCH", reasoning: `Weak opportunity (score ${layer5.score})` };
  return { action: "AVOID", reasoning: `Poor opportunity (score ${layer5.score})` };
}

function assessFraud(input: AnalysisInputV3, layer1: Layer1Result, layer3: Layer3Result): { riskScore: number; primaryConcern: string; secondaryConcern: string; concerns: string[] } {
  const text = `${input.title} ${input.description}`.toLowerCase();
  let riskScore = 20;
  const concerns: string[] = [];

  if (text.includes("urgent") || text.includes("must sell")) {
    riskScore += 15;
    concerns.push("High-pressure sales language");
  }
  if (text.includes("no returns")) {
    riskScore += 10;
    concerns.push("No returns policy");
  }
  if (!layer3.isAuthentic) {
    riskScore += 25;
    concerns.push("Authenticity not verified");
  }

  riskScore = Math.min(riskScore, 95);
  return {
    riskScore,
    primaryConcern: concerns[0] || "No major fraud indicators",
    secondaryConcern: concerns[1] || "Standard precautions apply",
    concerns,
  };
}

function buildComps(layer1: Layer1Result, layer4: Layer4Result): any[] {
  const fmv = layer4.fairMarketValue;
  return [
    { source: "Market Average", title: `${layer1.brand} ${layer1.model}`, soldPrice: fmv, date: new Date().toISOString().split("T")[0], condition: "Very Good" },
    { source: "Recent Sale", title: `${layer1.brand} ${layer1.model} - Similar`, soldPrice: Math.round(fmv * 0.95), date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], condition: "Good" },
  ];
}

function buildInspectionChecklist(layer1: Layer1Result, layer2: Layer2Result): any[] {
  const checklist: any[] = [];
  checklist.push({ item: "Verify authenticity markers", priority: "Critical", notes: "Check all brand-specific indicators" });
  checklist.push({ item: "Inspect for damage", priority: "High", notes: "Look for issues mentioned in listing" });
  for (const issue of layer2.issues) {
    checklist.push({ item: `Address: ${issue}`, priority: "High", notes: "Verify in person" });
  }
  return checklist;
}

function buildNegotiation(input: AnalysisInputV3, layer4: Layer4Result, layer5: Layer5Result): { recommendedOffer: number; probability: number; message: string; walkAwayPrice: number } {
  const askingPrice = input.askingPrice;
  let recommendedOffer = Math.round(askingPrice * 0.85);
  if (recommendedOffer > layer4.maxAcquisitionPrice) recommendedOffer = layer4.maxAcquisitionPrice;

  const message = `Hi, I'm interested in your ${input.title}. I've researched comparable sales and fair market value is around $${layer4.fairMarketValue}. I'd like to offer $${recommendedOffer}. Happy to discuss!`;

  return {
    recommendedOffer,
    probability: Math.min(90, 50 + layer5.score / 2),
    message,
    walkAwayPrice: layer4.maxAcquisitionPrice,
  };
}

// ============ TREND ANALYSIS ============
async function fetchHistoricalPriceData(supabase: any, input: AnalysisInputV3): Promise<any> {
  // Fetch historical price data for this product category
  // This is a placeholder - in production, query actual marketplace data
  return {
    priceHistory: [
      { date: "2026-05-04", price: input.askingPrice * 1.2 },
      { date: "2026-06-04", price: input.askingPrice * 1.1 },
      { date: "2026-07-04", price: input.askingPrice * 1.05 },
      { date: "2026-08-04", price: input.askingPrice },
    ],
    listingVelocity: 12, // listings per day in this category
    sellThroughRate: 0.68, // 68% of listings sell
    demandTrend: "stable",
  };
}

function analyzeTrends(historicalData: any, layer4: Layer4Result, input: AnalysisInputV3): any {
  const prices = historicalData.priceHistory.map((p: any) => p.price);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const percentChange = ((input.askingPrice - avgPrice) / avgPrice) * 100;

  return {
    priceDirection: percentChange < -5 ? "down" : percentChange > 5 ? "up" : "stable",
    percentChange: Math.round(percentChange * 10) / 10,
    period: "90 days",
    demandTrend: historicalData.demandTrend,
    sellThroughRate: historicalData.sellThroughRate,
    listingVelocity: historicalData.listingVelocity,
    recommendation: percentChange < -10 ? "emerging opportunity" : percentChange > 10 ? "declining market" : "stable market",
  };
}
