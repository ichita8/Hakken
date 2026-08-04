export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  budget: number | null;
  risk_tolerance: "conservative" | "moderate" | "aggressive";
  preferred_categories: string[];
  preferred_marketplaces: string[];
  target_roi_min: number | null;
  target_days_to_sell_max: number | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  asking_price: number;
  marketplace: string;
  image_urls: string[];
  listing_url: string | null;
  category: string | null;
  // Layer 1
  item_brand: string | null;
  item_model: string | null;
  item_year: string | null;
  item_color: string | null;
  item_variant: string | null;
  item_condition: string | null;
  item_accessories: string | null;
  identification_confidence: number | null;
  identification_reasoning: string | null;
  // Layer 2
  condition_scores: Record<string, number> | null;
  condition_risk_score: number | null;
  authenticity_verdict: boolean | null;
  authenticity_confidence: number | null;
  // Layer 4
  fair_market_value: number | null;
  resale_low: number | null;
  resale_high: number | null;
  fast_sale_price: number | null;
  max_acquisition_price: number | null;
  expected_profit: number | null;
  expected_roi: number | null;
  expected_days_to_sell_low: number | null;
  expected_days_to_sell_high: number | null;
  valuation_confidence: "High" | "Medium" | "Low" | null;
  // Layer 5
  opportunity_score: number | null;
  opportunity_tier: string | null;
  decision: "BUY" | "NEGOTIATE" | "WATCH" | "AVOID" | null;
  // Fraud
  fraud_risk_score: number | null;
  fraud_primary_concern: string | null;
  fraud_secondary_concern: string | null;
  // Supporting
  comps: Comp[] | null;
  inspection_checklist: InspectionItem[] | null;
  // Negotiation
  negotiation_recommended_offer: number | null;
  negotiation_probability: number | null;
  negotiation_message: string | null;
  negotiation_walk_away_price: number | null;
  // Pipeline
  layer_results: LayerResults | null;
  // Status
  status: "pending" | "analyzing" | "complete" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface Comp {
  source: string;
  title: string;
  soldPrice: number;
  date: string;
  condition: string;
  url: string;
}

export interface InspectionItem {
  item: string;
  priority: string;
  notes: string;
}

export interface LayerResults {
  layer1_identification: any;
  layer2_condition: any;
  layer3_authenticity: any;
  layer4_valuation: any;
  layer5_opportunity: any;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  analysis_id: string | null;
  title: string;
  category: string | null;
  marketplace_bought: string | null;
  marketplace_selling: string | null;
  acquisition_price: number;
  listing_price: number | null;
  sold_price: number | null;
  sold_date: string | null;
  fees_paid: number | null;
  shipping_paid: number | null;
  actual_profit: number | null;
  actual_roi: number | null;
  status: "active" | "listed" | "sold";
  listing_title: string | null;
  listing_description: string | null;
  best_marketplace: string | null;
  photography_checklist: any[];
  shipping_recommendation: string | null;
  expected_sale_days_low: number | null;
  expected_sale_days_high: number | null;
  notes: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface DealAlert {
  id: string;
  user_id: string;
  analysis_id: string | null;
  title: string;
  marketplace: string | null;
  asking_price: number | null;
  opportunity_score: number | null;
  expected_profit: number | null;
  decision: string | null;
  is_read: boolean;
  created_at: string;
}

export const MARKETPLACES = [
  "eBay",
  "Chrono24",
  "WatchCharts",
  "Facebook Marketplace",
  "Craigslist",
  "Reddit",
  "Mercari",
  "Depop",
  "Vestiaire Collective",
  "The RealReal",
  "StockX",
  "GOAT",
  "Reverb",
  "Etsy",
  "Local",
  "Other",
];

export const DEFAULT_CATEGORIES = [
  "Watches",
  "Cameras",
  "Bags",
  "Guitars",
  "Sneakers",
  "Jewelry",
  "Technology",
  "Automobiles",
  "General",
];

// Backward compat — use DEFAULT_CATEGORIES in new code
export const CATEGORIES = DEFAULT_CATEGORIES;
