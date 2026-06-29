import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MapPin, Building2, Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { searchCompanies, type Company } from "@/lib/search-companies.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Company Finder — Search companies by location & category" },
      {
        name: "description",
        content:
          "Search companies on Google Maps by location and category (IT, Non-IT, more). Export results to CSV or Excel.",
      },
      { property: "og:title", content: "Company Finder" },
      { property: "og:description", content: "Find companies by location and category. Export to CSV/Excel." },
    ],
  }),
  component: Index,
});

function ErrorBoundary({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <Button onClick={() => router.invalidate()} className="mt-4">Retry</Button>
    </div>
  );
}
Route.options.errorComponent = ErrorBoundary;

function Index() {
  const run = useServerFn(searchCompanies);
  const [location, setLocation] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!location.trim() && !companyType.trim()) {
      setError("Enter a location, a company type, or both.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await run({ data: { location, companyType } });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const ws = XLSX.utils.json_to_sheet(results);
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "companies.csv");
  }

  function downloadXLSX() {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Companies");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    triggerDownload(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "companies.xlsx",
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Company Finder</h1>
          <p className="mt-3 text-muted-foreground">
            Search companies by location and category. Powered by Google Maps.
          </p>
        </header>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Location (e.g. Bangalore, New York)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Company type (e.g. IT, Non-IT, Marketing)"
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} size="lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: fill one or both fields. Searches can take 30–90 seconds.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scraping Google Maps… this may take up to a minute.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>{results.length} results</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadCSV}>
                  <FileText className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadXLSX}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <div>{c.name}</div>
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {c.website.replace(/^https?:\/\//, "").slice(0, 40)}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.category && <Badge variant="secondary">{c.category}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{c.location}</div>
                        <div className="text-xs text-muted-foreground">{c.address}</div>
                      </TableCell>
                      <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.rating != null ? `★ ${c.rating} (${c.reviewsCount ?? 0})` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
            No companies found. Try different keywords.
          </div>
        )}

        {!searched && !loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { type: "IT", loc: "Bangalore" },
              { type: "Marketing", loc: "New York" },
              { type: "Manufacturing", loc: "Chennai" },
            ].map((s) => (
              <button
                key={s.type}
                onClick={() => {
                  setCompanyType(s.type);
                  setLocation(s.loc);
                }}
                className="rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:shadow"
              >
                <div className="text-sm text-muted-foreground">Try</div>
                <div className="font-medium">{s.type} companies in {s.loc}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
