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
    const djangoUrl = const djangoUrl = "https://company-scout-0k7z.onrender.com/api/companies/search/";;

    try {
      const res = await fetch(djangoUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: data.location,
          companyType: data.companyType,
          maxResults: data.maxResults,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = `Django backend request failed (${res.status})`;
        try {
          const errorJson = JSON.parse(text);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          errorMessage += `: ${text.slice(0, 300)}`;
        }
        throw new Error(errorMessage);
      }

      return (await res.json()) as Company[];
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith("Django backend")) {
        throw new Error(`Could not connect to Django backend at ${djangoUrl}. Make sure the server is running on port 8000.`);
      }
      throw err;
    }
  });
