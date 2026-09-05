import { base44 } from "@/api/base44Client";

export const MARKETPLACES = [
  "eBay", "Chrono24", "Facebook Marketplace", "Craigslist", "Mercari", "Depop",
  "Vestiaire Collective", "The RealReal", "StockX", "GOAT", "Reverb", "Etsy",
  "Poshmark", "Local", "Other",
];

export const CATEGORIES = [
  "Watches", "Sneakers", "Bags", "Cameras", "Guitars", "Electronics", "Jewelry",
  "Toys & Collectibles", "Tools", "Automotive", "Books & Media", "Clothing",
  "Home & Furniture", "Other",
];

export const CONDITIONS = [
  "New / Sealed", "Like New / Open Box", "Excellent", "Good / Used",
  "Fair / Worn", "For Parts / Defective", "Unknown",
];

// Derives the ROI floor used for the max recommended buy price from the
// user's saved settings (Settings page). Explicit target ROI wins over
// risk tolerance; falls back to a moderate 15%.
export function targetRoiFromPrefs(prefs) {
  if (prefs && Number(prefs.target_roi_min) > 0) return Number(prefs.target_roi_min) / 100;
  const map = { conservative: 0.25, moderate: 0.15, aggressive: 0.08 };
  return (prefs && map[prefs.risk_tolerance]) || 0.15;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    product_identification: {
      type: "object",
      properties: {
        brand: { type: "string" },
        model: { type: "string" },
        variant: { type: "string" },
        year: { type: "string" },
        category: { type: "string" },
        attributes: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
        reasoning: { type: "string" },
        uncertain: { type: "boolean" },
      },
      required: ["brand", "model", "category", "confidence"],
    },
    condition: {
      type: "object",
      properties: {
        overall: { type: "string" },
        defects: { type: "array", items: { type: "string" } },
        missing_components: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
        value_impact: { type: "string" },
      },
      required: ["overall", "confidence"],
    },
    authenticity: {
      type: "object",
      properties: {
        positive_signals: { type: "array", items: { type: "string" } },
        warning_signals: { type: "array", items: { type: "string" } },
        missing_info: { type: "array", items: { type: "string" } },
        counterfeit_risk: { type: "string", enum: ["Low", "Medium", "High"] },
        confidence: { type: "number" },
      },
      required: ["counterfeit_risk", "confidence"],
    },
    market_valuation: {
      type: "object",
      properties: {
        fair_market_value: { type: "number" },
        resale_low: { type: "number" },
        resale_high: { type: "number" },
        fast_sale_price: { type: "number" },
        estimated_marketplace_fee_pct: { type: "number" },
        estimated_shipping_cost: { type: "number" },
        estimated_other_costs: { type: "number" },
        demand_liquidity: { type: "number" },
        valuation_confidence: { type: "string", enum: ["High", "Medium", "Low"] },
        has_sufficient_data: { type: "boolean" },
        basis: { type: "string" },
        comps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              title: { type: "string" },
              price: { type: "number" },
              date: { type: "string" },
              condition: { type: "string" },
              url: { type: "string" },
            },
          },
        },
      },
      required: ["fair_market_value", "resale_low", "resale_high", "fast_sale_price", "demand_liquidity", "valuation_confidence", "has_sufficient_data"],
    },
    risk: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["Low", "Medium", "High"] },
        primary_concerns: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
      },
      required: ["level"],
    },
    data_confidence: { type: "number" },
    negotiation: {
      type: "object",
      properties: {
        feasible: { type: "boolean" },
        max_price: { type: "number" },
        message: { type: "string" },
      },
      required: ["feasible"],
    },
  },
  required: ["product_identification", "condition", "authenticity", "market_valuation", "risk", "data_confidence", "negotiation"],
};

const SYSTEM_PROMPT = `You are Hakken, an expert resale intelligence analyst. You analyze secondhand listings for resale arbitrage and decide whether a reseller should BUY, NEGOTIATE, WATCH, or PASS.

You run a 5-layer analysis:
1. Product Identification — brand, model, variant, year, category, attributes.
2. Condition Assessment — overall condition, defects, missing components, value impact.
3. Authenticity / Risk — positive signals, warning signals, missing info, counterfeit risk. This is a RISK ASSESSMENT, never a guarantee of authenticity. Use careful language ("potential concern", "insufficient evidence", "risk signal detected").
4. Market Valuation — fair market value, resale range, fast-sale price, marketplace fees %, shipping, other costs, demand liquidity.
5. Opportunity — data confidence and a negotiation strategy.

STRICT RULES:
- Never invent product information. If you cannot determine something, say so and mark uncertain=true.
- Never claim to visually verify something that cannot be determined from the supplied text and photos.
- Never fabricate specific comparable sales, sold listings, or URLs. If you lack reliable comparable data, set comps=[] and has_sufficient_data=false, and explain in "basis" that the estimate is from general knowledge.
- Prefer uncertainty over hallucinating data.
- All monetary values are in USD as plain numbers (no currency symbols, no commas).
- confidence fields are 0–1. demand_liquidity and data_confidence are 0–100.
- Return ONLY valid JSON matching the schema.`;

function buildPrompt(input) {
  return `${SYSTEM_PROMPT}

Analyze this secondhand listing:

Title: ${input.title}
Description: ${input.description || "(none provided)"}
Asking price: $${input.asking_price}
Marketplace: ${input.marketplace || "Unknown"}
Condition (seller-claimed): ${input.condition || "Unknown"}
Listing URL: ${input.listing_url || "(none)"}
${input.image_urls && input.image_urls.length ? `${input.image_urls.length} listing photo(s) are attached — examine them for brand markers, condition, and authenticity signals.` : "No photos were provided — base identification on the text only and lower confidence accordingly."}

Return the complete JSON analysis.`;
}

function num(v, d = 0) {
  const n = Number(v);
  return isNaN(n) ? d : n;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function computeFinancials(mv, askingPrice, targetRoi = 0.15) {
  const salePrice = num(mv.fast_sale_price) || num(mv.fair_market_value);
  const feePct = clamp(num(mv.estimated_marketplace_fee_pct), 0, 40);
  const fees = +(salePrice * (feePct / 100)).toFixed(2);
  const shipping = Math.max(0, num(mv.estimated_shipping_cost));
  const other = Math.max(0, num(mv.estimated_other_costs));
  const grossProfit = +(salePrice - askingPrice).toFixed(2);
  const netProfit = +(salePrice - askingPrice - fees - shipping - other).toFixed(2);
  const roi = askingPrice > 0 ? +((netProfit / askingPrice) * 100).toFixed(1) : 0;
  const netProceeds = salePrice - fees - shipping - other;
  const maxAcq = Math.max(0, +Math.min(netProceeds / (1 + targetRoi), netProceeds - Math.max(salePrice * 0.1, 5)).toFixed(2));
  return { salePrice, fees, shipping, other, grossProfit, netProfit, roi, maxAcq };
}

function scoreFromMargin(margin) {
  if (margin >= 30) return 100;
  if (margin >= 0) return 20 + (margin / 30) * 80;
  return Math.max(0, 20 + margin * 0.4);
}
function scoreFromRoi(roi) {
  if (roi >= 50) return 100;
  if (roi >= 0) return 20 + (roi / 50) * 80;
  return Math.max(0, 20 + roi * 0.4);
}
function riskScore(level) {
  return level === "Low" ? 90 : level === "Medium" ? 55 : 20;
}

function computeScore(ai, fin) {
  const margin = fin.salePrice > 0 ? (fin.netProfit / fin.salePrice) * 100 : 0;
  const profit = scoreFromMargin(margin);
  const roi = scoreFromRoi(fin.roi);
  const demand = clamp(num(ai.market_valuation.demand_liquidity, 40), 0, 100);
  const risk = riskScore(ai.risk.level);
  const confidence = clamp(num(ai.data_confidence, 50), 0, 100);
  const score = Math.round(clamp(0.4 * profit + 0.25 * roi + 0.15 * demand + 0.1 * risk + 0.1 * confidence, 0, 100));
  return { score, subs: { profit, roi, demand, risk, confidence, margin } };
}

function computeDecision(score, fin, ai, askingPrice) {
  if (fin.netProfit <= 0) {
    return fin.maxAcq > 0 && fin.maxAcq < askingPrice ? "NEGOTIATE" : "PASS";
  }
  if (ai.risk.level === "High") {
    return score >= 55 ? "WATCH" : "PASS";
  }
  if (score >= 75) return "BUY";
  if (score >= 55) return askingPrice > fin.maxAcq ? "NEGOTIATE" : "WATCH";
  if (score >= 40) return "WATCH";
  return "PASS";
}

function buildExplanation(score, fin, ai) {
  const parts = [];
  const margin = fin.salePrice > 0 ? (fin.netProfit / fin.salePrice) * 100 : 0;
  parts.push(
    margin >= 15 ? "the estimated margin is strong"
      : margin > 0 ? "the estimated margin is modest"
        : "the estimated margin is negative at the asking price"
  );
  parts.push(
    fin.salePrice > 0 && fin.salePrice >= fin.grossProfit + 0
      ? "the asking price is below estimated market value"
      : "the asking price is at or above estimated market value"
  );
  parts.push(
    ai.market_valuation.has_sufficient_data
      ? "and the available market evidence is relatively strong"
      : "but comparable market data is limited, lowering confidence"
  );
  return `Hakken scored this opportunity ${score}/100 because ${parts.join(", ")}.`;
}

function negotiate(fin, ai, askingPrice) {
  const max = fin.maxAcq;
  const low = Math.round(max * 0.88);
  const high = Math.round(max);
  let message = ai.negotiation && ai.negotiation.message;
  if (!message) {
    message = `Hi, I'm interested in this item. Based on recent comparable sales, would you consider an offer around $${low}? I can pay quickly and pick up promptly. Thanks!`;
  }
  return { max, low, high, message, feasible: max > 0 && max < askingPrice };
}

function buildRecord(ai, input, opts = {}) {
  const asking = num(input.asking_price);
  const fin = computeFinancials(ai.market_valuation, asking, opts.target_roi || 0.15);
  const sc = computeScore(ai, fin);
  const decision = computeDecision(sc.score, fin, ai, asking);
  const explanation = buildExplanation(sc.score, fin, ai);
  const neg = negotiate(fin, ai, asking);
  const pi = ai.product_identification || {};
  const cond = ai.condition || {};
  const auth = ai.authenticity || {};
  const mv = ai.market_valuation || {};
  const risk = ai.risk || {};
  return {
    title: input.title,
    description: input.description || "",
    asking_price: asking,
    marketplace: input.marketplace || "",
    listing_url: input.listing_url || "",
    condition: input.condition || "",
    image_urls: input.image_urls || [],
    category: pi.category || input.category || "",
    brand: pi.brand || "",
    model: pi.model || "",
    variant: pi.variant || "",
    year: pi.year || "",
    identification_confidence: pi.confidence ?? 0,
    condition_overall: cond.overall || "",
    condition_confidence: cond.confidence ?? 0,
    authenticity_risk: auth.counterfeit_risk || "Unknown",
    authenticity_confidence: auth.confidence ?? 0,
    positive_signals: auth.positive_signals || [],
    warning_signals: auth.warning_signals || [],
    fair_market_value: mv.fair_market_value ?? 0,
    resale_low: mv.resale_low ?? 0,
    resale_high: mv.resale_high ?? 0,
    fast_sale_price: mv.fast_sale_price ?? 0,
    expected_sale_price: fin.salePrice,
    max_acquisition_price: fin.maxAcq,
    marketplace_fees: fin.fees,
    shipping_cost: fin.shipping,
    other_costs: fin.other,
    gross_profit: fin.grossProfit,
    net_profit: fin.netProfit,
    roi: fin.roi,
    risk_level: risk.level || "Unknown",
    data_confidence: ai.data_confidence ?? 0,
    demand_liquidity: mv.demand_liquidity ?? 0,
    opportunity_score: sc.score,
    decision,
    negotiation_max_price: neg.max,
    negotiation_message: neg.message,
    score_explanation: explanation,
    layers: ai,
    is_fallback: false,
    status: "complete",
  };
}

function repair(ai) {
  ai = ai && typeof ai === "object" ? ai : {};
  ai.product_identification = ai.product_identification || { brand: "", model: "", category: "", confidence: 0 };
  ai.condition = ai.condition || { overall: "", confidence: 0 };
  ai.authenticity = ai.authenticity || { counterfeit_risk: "Unknown", confidence: 0 };
  ai.market_valuation = ai.market_valuation || { fair_market_value: 0, resale_low: 0, resale_high: 0, fast_sale_price: 0, demand_liquidity: 40, valuation_confidence: "Low", has_sufficient_data: false };
  ai.risk = ai.risk || { level: "Medium" };
  ai.data_confidence = ai.data_confidence ?? 40;
  ai.negotiation = ai.negotiation || { feasible: false };
  const mv = ai.market_valuation;
  mv.fair_market_value = num(mv.fair_market_value);
  mv.resale_low = num(mv.resale_low);
  mv.resale_high = num(mv.resale_high);
  mv.fast_sale_price = num(mv.fast_sale_price) || mv.fair_market_value;
  mv.demand_liquidity = clamp(num(mv.demand_liquidity, 40), 0, 100);
  mv.has_sufficient_data = !!mv.has_sufficient_data;
  ai.product_identification.confidence = clamp(num(ai.product_identification.confidence, 0), 0, 1);
  ai.condition.confidence = clamp(num(ai.condition.confidence, 0), 0, 1);
  ai.authenticity.confidence = clamp(num(ai.authenticity.confidence, 0), 0, 1);
  ai.data_confidence = clamp(num(ai.data_confidence, 40), 0, 100);
  if (!["Low", "Medium", "High"].includes(ai.risk.level)) ai.risk.level = "Medium";
  if (!["Low", "Medium", "High"].includes(ai.authenticity.counterfeit_risk)) ai.authenticity.counterfeit_risk = "Unknown";
  return ai;
}

function isValid(ai) {
  return ai && ai.market_valuation && typeof ai.market_valuation.fair_market_value === "number" && ai.market_valuation.fair_market_value > 0;
}

const CATEGORY_MARKUP = {
  Watches: 1.35, Sneakers: 1.5, Bags: 1.4, Cameras: 1.3, Guitars: 1.3,
  Electronics: 1.25, Jewelry: 1.3, "Toys & Collectibles": 1.4, Tools: 1.25,
  Automotive: 1.3, "Books & Media": 1.4, Clothing: 1.3, "Home & Furniture": 1.3, Other: 1.3,
};

function fallbackRecord(input, err, opts = {}) {
  const asking = num(input.asking_price);
  const cat = input.category || "Other";
  const multiple = CATEGORY_MARKUP[cat] ?? 1.3;
  const salePrice = +(asking * multiple).toFixed(2);
  const feePct = 10;
  const fees = +(salePrice * 0.1).toFixed(2);
  const shipping = 15;
  const other = 0;
  const netProceeds = salePrice - fees - shipping - other;
  const targetRoi = (opts && opts.target_roi) || 0.15;
  const maxAcq = Math.max(0, +Math.min(netProceeds / (1 + targetRoi), netProceeds - Math.max(salePrice * 0.1, 5)).toFixed(2));
  const ai = {
    product_identification: { brand: "Unknown", model: input.title, variant: "", year: "", category: cat, attributes: [], confidence: 0, reasoning: "AI analysis unavailable; product could not be identified automatically.", uncertain: true },
    condition: { overall: input.condition || "Unknown", defects: [], missing_components: [], confidence: 0, value_impact: "Not assessed — AI unavailable." },
    authenticity: { positive_signals: [], warning_signals: ["Authenticity not assessed — AI unavailable."], missing_info: ["Photos not analyzed", "Brand/model not verified"], counterfeit_risk: "Unknown", confidence: 0 },
    market_valuation: { fair_market_value: salePrice, resale_low: +(salePrice * 0.9).toFixed(2), resale_high: +(salePrice * 1.1).toFixed(2), fast_sale_price: +(salePrice * 0.92).toFixed(2), estimated_marketplace_fee_pct: feePct, estimated_shipping_cost: shipping, estimated_other_costs: other, demand_liquidity: 40, valuation_confidence: "Low", has_sufficient_data: false, basis: "Heuristic estimate based on category average markup. No live market data or AI analysis was used.", comps: [] },
    risk: { level: "Medium", primary_concerns: ["AI analysis unavailable — valuation is a rough heuristic only."], confidence: 0 },
    data_confidence: 25,
    negotiation: { feasible: maxAcq > 0 && maxAcq < asking, max_price: maxAcq, message: `Hi, I'm interested in this item. Would you consider an offer around $${Math.round(maxAcq * 0.88)}? I can pay quickly. Thanks!` },
  };
  const record = buildRecord(ai, input, opts);
  record.is_fallback = true;
  record.status = "complete";
  record.score_explanation = `Limited analysis (AI unavailable): ${err && err.message ? err.message : "AI service error"}. Score is based on a heuristic category estimate only — treat with caution.`;
  record.layers = ai;
  return record;
}

export async function analyzeListing(input, opts = {}) {
  const asking = num(input.asking_price);
  if (!input.title || !input.title.trim()) throw new Error("A product title is required.");
  if (!asking || asking <= 0) throw new Error("A valid asking price is required.");
  try {
    const prompt = buildPrompt(input);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: ANALYSIS_SCHEMA,
      file_urls: input.image_urls && input.image_urls.length ? input.image_urls : undefined,
    });
    if (!res || typeof res !== "object") throw new Error("Invalid AI response.");
    const ai = repair(res);
    if (!isValid(ai)) throw new Error("AI response missing a usable valuation.");
    return buildRecord(ai, input, opts);
  } catch (err) {
    console.error("AI analysis failed, using fallback:", err);
    return fallbackRecord(input, err, opts);
  }
}
