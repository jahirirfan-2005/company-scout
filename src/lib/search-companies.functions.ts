import { createServerFn } from "@tanstack/react-start";

export type Company = {
  name: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  website: string;
  url: string;
  rating: number | null;
  totalScore: number | null;
  reviewsCount: number | null;
};

type SearchInput = {
  location: string;
  companyType: string;
  maxResults?: number;
};

export const searchCompanies = createServerFn({ method: "POST" })
  .inputValidator((input: SearchInput) => {
    const location = (input?.location ?? "").trim();
    const companyType = (input?.companyType ?? "").trim();
    if (!location && !companyType) {
      throw new Error("Provide a location, a company type, or both.");
    }
    return {
      location,
      companyType,
      maxResults: Math.min(Math.max(input?.maxResults ?? 20, 1), 50),
    };
  })
  .handler(async ({ data }): Promise<Company[]> => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) throw new Error("APIFY_API_TOKEN is not configured");

    const searchTerm =
      data.companyType && data.location
        ? `${data.companyType} companies in ${data.location}`
        : data.companyType
          ? `${data.companyType} companies`
          : `companies in ${data.location}`;

    const body: Record<string, unknown> = {
      searchStringsArray: [searchTerm],
      maxCrawledPlacesPerSearch: data.maxResults,
      language: "en",
      skipClosedPlaces: false,
    };
    if (data.location) body.locationQuery = data.location;

    const url = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(
      token,
    )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify request failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const items = (await res.json()) as Array<Record<string, unknown>>;

    return items.map((it) => ({
      name: String(it.title ?? it.name ?? ""),
      category: String(it.categoryName ?? (Array.isArray(it.categories) ? (it.categories as string[]).join(", ") : "") ?? ""),
      location: String(it.city ?? it.neighborhood ?? it.state ?? ""),
      address: String(it.address ?? ""),
      phone: String(it.phone ?? ""),
      website: String(it.website ?? ""),
      url: String(it.url ?? ""),
      rating: typeof it.totalScore === "number" ? (it.totalScore as number) : null,
      totalScore: typeof it.totalScore === "number" ? (it.totalScore as number) : null,
      reviewsCount: typeof it.reviewsCount === "number" ? (it.reviewsCount as number) : null,
    }));
  });
