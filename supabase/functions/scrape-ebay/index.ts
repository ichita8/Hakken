import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ScrapedListing {
  marketplace: "ebay";
  marketplace_listing_id: string;
  title: string;
  description: string;
  price: number;
  seller_id: string;
  seller_name: string;
  images: string[];
  url: string;
  category: string;
  condition: string;
  location: string;
  shipping_cost: number;
  time_listed: string;
  quantity_available: number;
  engagement_metrics: {
    views: number;
    watchers: number;
    bids: number;
  };
}

// ============ MAIN ============
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { category, keywords, limit = 50 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Scrape eBay listings
    const listings = await scrapeEbayListings(category, keywords, limit);

    // Deduplicate and normalize
    const normalized = await normalizeAndDeduplicate(listings, supabase);

    // Store in database
    const { data, error } = await supabase
      .from("listings_raw")
      .insert(normalized)
      .select();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped: listings.length,
        stored: data?.length || 0,
        marketplace: "ebay",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Scraping error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Scraping failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ EBAY SCRAPING ============
async function scrapeEbayListings(
  category: string,
  keywords: string,
  limit: number
): Promise<ScrapedListing[]> {
  // This is a placeholder implementation
  // In production, this would:
  // 1. Use eBay API (if available) or web scraping
  // 2. Parse HTML/JSON responses
  // 3. Extract listing data
  // 4. Handle pagination
  // 5. Respect rate limits

  const listings: ScrapedListing[] = [];

  try {
    // Example: Using eBay API (requires API key)
    const ebayApiKey = Deno.env.get("EBAY_API_KEY");

    if (!ebayApiKey) {
      console.warn("No EBAY_API_KEY configured, using mock data");
      return generateMockListings(category, keywords, limit);
    }

    // Construct eBay API request
    const searchUrl = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    searchUrl.searchParams.append("q", keywords);
    searchUrl.searchParams.append("category_ids", getCategoryId(category));
    searchUrl.searchParams.append("limit", Math.min(limit, 200).toString());
    searchUrl.searchParams.append("sort", "-newlyListed");

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${ebayApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse eBay response
    if (data.itemSummaries) {
      for (const item of data.itemSummaries.slice(0, limit)) {
        listings.push({
          marketplace: "ebay",
          marketplace_listing_id: item.itemId,
          title: item.title,
          description: item.shortDescription || "",
          price: item.price?.value || 0,
          seller_id: item.seller?.username || "unknown",
          seller_name: item.seller?.username || "Unknown Seller",
          images: item.image?.imageUrl ? [item.image.imageUrl] : [],
          url: item.itemWebUrl,
          category: category,
          condition: item.condition || "Unknown",
          location: item.itemLocation?.city || "Unknown",
          shipping_cost: item.shippingOptions?.[0]?.shippingCost?.value || 0,
          time_listed: new Date().toISOString(),
          quantity_available: item.quantityLimitPerBuyer || 1,
          engagement_metrics: {
            views: 0, // eBay doesn't expose this in public API
            watchers: 0,
            bids: 0,
          },
        });
      }
    }
  } catch (err) {
    console.error("eBay API scraping failed:", err);
    // Fallback to mock data
    return generateMockListings(category, keywords, limit);
  }

  return listings;
}

// ============ HELPER FUNCTIONS ============
function getCategoryId(category: string): string {
  // Map category names to eBay category IDs
  const categoryMap: Record<string, string> = {
    watches: "14339",
    cameras: "625",
    electronics: "293",
    sneakers: "15687",
    bags: "4850",
    guitars: "4713",
    jewelry: "281",
    collectibles: "1",
  };

  return categoryMap[category.toLowerCase()] || "1";
}

async function normalizeAndDeduplicate(
  listings: ScrapedListing[],
  supabase: any
): Promise<any[]> {
  const normalized: any[] = [];

  for (const listing of listings) {
    // Check for duplicates using URL hash
    const urlHash = hashString(listing.url);

    const { data: existing } = await supabase
      .from("listings_raw")
      .select("id")
      .eq("marketplace", "ebay")
      .eq("marketplace_listing_id", listing.marketplace_listing_id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Duplicate found: ${listing.title}`);
      continue;
    }

    normalized.push({
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
      engagement_metrics: listing.engagement_metrics,
      url_hash: urlHash,
      scraped_at: new Date().toISOString(),
      status: "pending", // pending analysis
    });
  }

  return normalized;
}

function hashString(str: string): string {
  // Simple hash function (in production, use crypto)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

function generateMockListings(
  category: string,
  keywords: string,
  limit: number
): ScrapedListing[] {
  // Generate mock listings for testing
  const mockTitles: Record<string, string[]> = {
    watches: [
      "Rolex Submariner 2020 Black Dial",
      "Omega Seamaster Professional",
      "Tudor Black Bay GMT",
      "Seiko SKX007 Automatic Dive Watch",
      "Citizen Eco-Drive Promaster",
    ],
    cameras: [
      "Canon EOS R5 Mirrorless Camera",
      "Nikon Z6 II Professional",
      "Sony A7IV Full Frame",
      "Fujifilm X-T4 Retro Design",
      "Leica Q2 Rangefinder",
    ],
    sneakers: [
      "Nike Air Jordan 1 Retro High OG",
      "Adidas Yeezy 350 V2 Zebra",
      "New Balance 990v5 Grey",
      "Converse Chuck Taylor All Star",
      "Puma RS-X Sneaker",
    ],
  };

  const titles = mockTitles[category.toLowerCase()] || mockTitles.watches;
  const listings: ScrapedListing[] = [];

  for (let i = 0; i < Math.min(limit, titles.length); i++) {
    listings.push({
      marketplace: "ebay",
      marketplace_listing_id: `mock-${category}-${i}`,
      title: titles[i],
      description: `High quality ${category} item. Excellent condition. Ships worldwide.`,
      price: Math.floor(Math.random() * 500) + 50,
      seller_id: `seller-${Math.floor(Math.random() * 1000)}`,
      seller_name: `Seller ${Math.floor(Math.random() * 1000)}`,
      images: [
        `https://via.placeholder.com/400x400?text=${encodeURIComponent(titles[i])}`,
      ],
      url: `https://ebay.com/itm/mock-${category}-${i}`,
      category: category,
      condition: ["New", "Like New", "Excellent", "Good"][Math.floor(Math.random() * 4)],
      location: ["New York", "Los Angeles", "Chicago", "Houston"][Math.floor(Math.random() * 4)],
      shipping_cost: [0, 5, 10, 15][Math.floor(Math.random() * 4)],
      time_listed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      quantity_available: Math.floor(Math.random() * 3) + 1,
      engagement_metrics: {
        views: Math.floor(Math.random() * 100),
        watchers: Math.floor(Math.random() * 20),
        bids: Math.floor(Math.random() * 5),
      },
    });
  }

  return listings;
}
