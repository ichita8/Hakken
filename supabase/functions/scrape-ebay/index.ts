import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ============ TYPES ============

interface ScrapedListing {
  marketplace: "ebay";
  marketplace_listing_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  seller_id: string;
  seller_name: string;
  seller_feedback_score: number;
  seller_feedback_pct: number;
  images: string[];
  url: string;
  category: string;
  condition: string;
  condition_id: string;
  location: string;
  shipping_cost: number;
  time_listed: string;
  item_end_date: string | null;
  quantity_available: number;
  buying_options: string[];
  engagement_metrics: {
    watchers: number;
    bids: number;
  };
  item_specifics: Record<string, string>;
  url_hash: string;
}

interface ScrapeRequest {
  category?: string;
  keywords?: string;
  limit?: number;
  autoAnalyze?: boolean;
  priceMin?: number;
  priceMax?: number;
  conditionFilter?: string;
  marketplace_id?: string;
}

// eBay category ID mapping
const EBAY_CATEGORY_MAP: Record<string, string> = {
  watches: "14339",
  cameras: "625",
  electronics: "293",
  sneakers: "15687",
  bags: "4850",
  guitars: "4713",
  jewelry: "281",
  collectibles: "1",
  technology: "293",
  automobiles: "6000",
  general: "267",
};

// ============ MAIN ============
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ScrapeRequest = await req.json();
    const {
      category = "general",
      keywords = "",
      limit = 50,
      autoAnalyze = false,
      priceMin,
      priceMax,
      conditionFilter,
      marketplace_id = "EBAY_US",
    } = body;

    // Validate required env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ebayClientId = Deno.env.get("EBAY_CLIENT_ID");
    const ebayClientSecret = Deno.env.get("EBAY_CLIENT_SECRET");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ebayClientId || !ebayClientSecret) {
      return new Response(
        JSON.stringify({
          error: "eBay API credentials not configured",
          hint: "Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in Supabase Edge Function secrets. Get them at https://developer.ebay.com",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get OAuth2 access token from eBay
    const accessToken = await getEbayAccessToken(ebayClientId, ebayClientSecret);

    // Step 2: Search eBay Browse API
    const listings = await searchEbayListings(accessToken, {
      category,
      keywords,
      limit,
      priceMin,
      priceMax,
      conditionFilter,
      marketplace_id,
    });

    if (listings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          scraped: 0,
          stored: 0,
          message: "No listings found matching criteria",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Deduplicate against existing listings
    const newListings = await deduplicateListings(listings, supabase);

    if (newListings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          scraped: listings.length,
          stored: 0,
          message: "All listings already exist in database (duplicates)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Store in database
    const { data, error } = await supabase
      .from("listings_raw")
      .insert(newListings)
      .select();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    // Step 5: Auto-trigger analysis pipeline if requested
    let analyzed = 0;
    if (autoAnalyze && data && data.length > 0) {
      analyzed = await triggerAnalyses(data, supabase, supabaseUrl, supabaseKey);
    }

    // Step 6: Record scraping job
    await supabase.from("scraping_jobs").insert({
      marketplace: "ebay",
      category,
      keywords,
      status: "completed",
      listings_found: listings.length,
      listings_stored: data?.length || 0,
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        scraped: listings.length,
        stored: data?.length || 0,
        duplicates_skipped: listings.length - newListings.length,
        analyzed,
        marketplace: "ebay",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Scraping error:", err);

    // Record failed scraping job
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("scraping_jobs").insert({
        marketplace: "ebay",
        status: "failed",
        error_message: err.message || "Unknown error",
      });
    } catch (_) {
      // ignore logging errors
    }

    return new Response(
      JSON.stringify({ error: err.message || "Scraping failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ EBAY OAUTH2 ============

async function getEbayAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = "https://api.ebay.com/identity/v1/oauth2/token";

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay OAuth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ============ EBAY BROWSE API SEARCH ============

async function searchEbayListings(
  accessToken: string,
  params: {
    category: string;
    keywords: string;
    limit: number;
    priceMin?: number;
    priceMax?: number;
    conditionFilter?: string;
    marketplace_id: string;
  }
): Promise<ScrapedListing[]> {
  const searchUrl = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");

  // Build search query: combine keywords and category
  const query = params.keywords || params.category;
  searchUrl.searchParams.append("q", query);

  // Category filter
  const categoryId = EBAY_CATEGORY_MAP[params.category.toLowerCase()] || "267";
  searchUrl.searchParams.append("category_ids", categoryId);

  // Limit (eBay max is 200 per page)
  searchUrl.searchParams.append("limit", Math.min(params.limit, 200).toString());

  // Sort by newest first
  searchUrl.searchParams.append("sort", "-newlyListed");

  // Get extended fields for richer data
  searchUrl.searchParams.append("fieldgroups", "EXTENDED");

  // Marketplace
  searchUrl.searchParams.append("X-EBAY-C-MARKETPLACE-ID", params.marketplace_id);

  // Build filter string
  const filters: string[] = [];

  // Only fixed-price and best-offer items (skip pure auctions for resale analysis)
  filters.push("buyingOptions:{FIXED_PRICE|BEST_OFFER}");

  // Price range filter
  if (params.priceMin || params.priceMax) {
    const min = params.priceMin || 0;
    const max = params.priceMax || 99999999;
    filters.push(`price:[${min}..${max}]`);
  }

  // Condition filter
  if (params.conditionFilter) {
    filters.push(`condition:{${params.conditionFilter}}`);
  } else {
    // Default: exclude brand new items, focus on secondary market
    filters.push("condition:{NEW|USED|REFURBISHED}");
  }

  // Exclude items that are sold
  filters.push("excludeSellers:null");

  if (filters.length > 0) {
    searchUrl.searchParams.append("filter", filters.join(","));
  }

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": params.marketplace_id,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay Browse API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const itemSummaries = data.itemSummaries || [];

  return itemSummaries.map((item: any) => parseEbayItem(item, params.category));
}

// ============ PARSE EBAY ITEM ============

function parseEbayItem(item: any, category: string): ScrapedListing {
  // Collect all images (primary + additional)
  const images: string[] = [];
  if (item.image?.imageUrl) {
    images.push(item.image.imageUrl);
  }
  if (item.additionalImages) {
    for (const img of item.additionalImages) {
      if (img.imageUrl) images.push(img.imageUrl);
    }
  }

  // Parse price
  const price = parseFloat(item.price?.value || "0");
  const currency = item.price?.currency || "USD";

  // Parse shipping cost
  let shippingCost = 0;
  if (item.shippingOptions?.[0]?.shippingCost?.value) {
    shippingCost = parseFloat(item.shippingOptions[0].shippingCost.value);
  }

  // Parse seller info
  const sellerUsername = item.seller?.username || "unknown";
  const sellerFeedbackScore = item.seller?.feedbackScore || 0;
  const sellerFeedbackPct = item.seller?.feedbackPercentage || 0;

  // Parse location
  const location = [
    item.itemLocation?.city,
    item.itemLocation?.stateOrProvince,
    item.itemLocation?.country,
  ].filter(Boolean).join(", ");

  // Parse condition
  const condition = item.condition || "Not Specified";
  const conditionId = item.conditionId || "";

  // Parse buying options
  const buyingOptions = item.buyingOptions || [];

  // Parse engagement metrics
  const watchers = item.watchCount || 0;
  const bids = item.bidCount || 0;

  // Parse item specifics (extended fields)
  const itemSpecifics: Record<string, string> = {};
  if (item.localizedAspects) {
    for (const aspect of item.localizedAspects) {
      if (aspect.name && aspect.value) {
        itemSpecifics[aspect.name] = aspect.value;
      }
    }
  }

  // Parse listing date
  const timeListed = item.itemCreationDate || new Date().toISOString();
  const itemEndDate = item.itemEndDate || null;

  // Generate URL hash for deduplication
  const urlHash = hashString(item.itemWebUrl || item.itemId);

  return {
    marketplace: "ebay",
    marketplace_listing_id: item.itemId,
    title: item.title || "Untitled",
    description: item.shortDescription || "",
    price,
    currency,
    seller_id: sellerUsername,
    seller_name: sellerUsername,
    seller_feedback_score: sellerFeedbackScore,
    seller_feedback_pct: sellerFeedbackPct,
    images,
    url: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
    category,
    condition,
    condition_id: conditionId,
    location: location || "Unknown",
    shipping_cost: shippingCost,
    time_listed: timeListed,
    item_end_date: itemEndDate,
    quantity_available: item.quantityLimitPerBuyer || 1,
    buying_options: buyingOptions,
    engagement_metrics: {
      watchers,
      bids,
    },
    item_specifics: itemSpecifics,
    url_hash: urlHash,
  };
}

// ============ DEDUPLICATION ============

async function deduplicateListings(
  listings: ScrapedListing[],
  supabase: any
): Promise<any[]> {
  // Batch check for existing listings
  const listingIds = listings.map((l) => l.marketplace_listing_id);

  const { data: existing } = await supabase
    .from("listings_raw")
    .select("marketplace_listing_id")
    .eq("marketplace", "ebay")
    .in("marketplace_listing_id", listingIds);

  const existingIds = new Set((existing || []).map((e: any) => e.marketplace_listing_id));

  const newListings = listings.filter((l) => !existingIds.has(l.marketplace_listing_id));

  // Map to database schema
  return newListings.map((listing) => ({
    marketplace: listing.marketplace,
    marketplace_listing_id: listing.marketplace_listing_id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    seller_id: listing.seller_id,
    seller_name: listing.seller_name,
    images: listing.images,
    url: listing.url,
    category: listing.category,
    condition: listing.condition,
    location: listing.location,
    shipping_cost: listing.shipping_cost,
    time_listed: listing.time_listed,
    quantity_available: listing.quantity_available,
    engagement_metrics: {
      watchers: listing.engagement_metrics.watchers,
      bids: listing.engagement_metrics.bids,
      seller_feedback_score: listing.seller_feedback_score,
      seller_feedback_pct: listing.seller_feedback_pct,
      buying_options: listing.buying_options,
      item_specifics: listing.item_specifics,
      currency: listing.currency,
      condition_id: listing.condition_id,
      item_end_date: listing.item_end_date,
    },
    url_hash: listing.url_hash,
    scraped_at: new Date().toISOString(),
    status: "pending",
  }));
}

// ============ AUTO-TRIGGER ANALYSIS ============

async function triggerAnalyses(
  listings: any[],
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string
): Promise<number> {
  let count = 0;

  for (const listing of listings) {
    try {
      // Create an analysis record
      const { data: analysis, error: createError } = await supabase
        .from("analyses")
        .insert({
          title: listing.title,
          description: listing.description,
          asking_price: listing.price,
          marketplace: "eBay",
          image_urls: listing.images || [],
          listing_url: listing.url,
          category: listing.category,
          status: "pending",
        })
        .select()
        .single();

      if (createError || !analysis) {
        console.error(`Failed to create analysis for listing ${listing.id}:`, createError);
        continue;
      }

      // Trigger the analyze-listing-v3 edge function
      const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-listing-v3`;
      const analyzeRes = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          analysisId: analysis.id,
          title: listing.title,
          description: listing.description,
          askingPrice: listing.price,
          marketplace: "eBay",
          imageUrls: listing.images || [],
          listingUrl: listing.url,
          category: listing.category,
        }),
      });

      if (analyzeRes.ok) {
        count++;

        // Update listing status to analyzing and link analysis
        await supabase
          .from("listings_raw")
          .update({ status: "analyzing", analysis_id: analysis.id })
          .eq("id", listing.id);
      }
    } catch (err) {
      console.error(`Analysis trigger failed for listing ${listing.id}:`, err);
    }
  }

  return count;
}

// ============ UTILITIES ============

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
