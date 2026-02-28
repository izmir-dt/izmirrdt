import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Archive } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SheetData = { headers: string[]; rows: any[][] };

export default function BildirimlerPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "arsiv">("active");

  const { data: activeData, isLoading: activeLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BİLDİRİMLER"],
  });

  const { data: arsivData, isLoading: arsivLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BİLDİRİMLER_ARŞİV"],
  });

  const currentData = tab === "active" ? activeData : arsivData;
  const isLoading = tab === "active" ? activeLoading : arsivLoading;

  const filtered = useMemo(() => {
    if (!currentData) return [];
    if (!search.trim()) return currentData.rows;
    const lower = search.toLowerCase();
    return currentData.rows.filter((row) =>
      row.some((cell: any) => String(cell ?? "").toLowerCase().includes(lower))
    );
  }, [currentData, search]);

  const headers = currentData?.headers || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <PageHeader
        icon={Bell}
        title="Bildirimler"
        description="BİLDİRİMLER ve BİLDİRİMLER_ARŞİV sayfasındaki kayıtlar"
      />
      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("active")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Aktif Bildirimler
          {activeData && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {activeData.rows.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab("arsiv")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "arsiv" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Arşiv
          {arsivData && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {arsivData.rows.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-bildirimler"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} kayıt</span>
      </div>

      {/* Table */}
      {headers.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Bell className="w-10 h-10 opacity-20" />
          <p className="text-sm">Bu sayfada bildirim yok</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground w-10">#</th>
                  {headers.map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="text-center py-16 text-muted-foreground">
                      <p className="text-sm">Sonuç bulunamadı</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                      {headers.map((_, colIdx) => (
                        <td key={colIdx} className="px-4 py-3 text-foreground text-sm">
                          {String(row[colIdx] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
