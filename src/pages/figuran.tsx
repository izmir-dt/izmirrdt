import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parsePlayRows, isFiguran, categoryColor } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Download, List, Film } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExcelDialog } from "@/components/excel-dialog";
import type { PlayRow } from "@/lib/theater";

type SheetData = { headers: string[]; rows: any[][] };

function OyunBadges({ value }: { value: string }) {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return <span className="text-xs text-muted-foreground/40 italic">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((oyun) => (
        <span
          key={oyun}
          className="inline-block bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-medium"
        >
          {oyun}
        </span>
      ))}
    </div>
  );
}

function GorevCell({ value }: { value: string }) {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return <span className="text-xs text-foreground">{value}</span>;
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-0.5 text-xs">
          {i > 0 && <span className="text-muted-foreground/40 font-bold select-none">•</span>}
          <span>{p}</span>
        </span>
      ))}
    </div>
  );
}

export default function FiguranPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"liste" | "oyunlar">("liste");
  const [excelOpen, setExcelOpen] = useState(false);

  const { data: figuranListData, isLoading: l1 } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "FİGÜRAN LİSTESİ"],
    refetchOnMount: "always",
  });

  const { data: butunOyunlarData, isLoading: l2 } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
    refetchOnMount: "always",
  });

  const isLoading = l1 || l2;

  const figuranFromOyunlar: PlayRow[] = useMemo(() => {
    if (!butunOyunlarData) return [];
    return parsePlayRows(butunOyunlarData.headers, butunOyunlarData.rows).filter(
      (r) => isFiguran(r.kategori)
    );
  }, [butunOyunlarData]);

  const listeRows = useMemo(() => {
    if (!figuranListData) return [];
    return figuranListData.rows;
  }, [figuranListData]);

  const filteredListe = useMemo(() => {
    if (!search.trim()) return listeRows;
    const lower = search.toLowerCase();
    return listeRows.filter((row) =>
      row.some((cell: any) => String(cell ?? "").toLowerCase().includes(lower))
    );
  }, [listeRows, search]);

  const filteredOyunlar = useMemo(() => {
    if (!search.trim()) return figuranFromOyunlar;
    const lower = search.toLowerCase();
    return figuranFromOyunlar.filter(
      (r) =>
        r.kisi.toLowerCase().includes(lower) ||
        r.oyun.toLowerCase().includes(lower) ||
        r.gorev.toLowerCase().includes(lower)
    );
  }, [figuranFromOyunlar, search]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    );
  }

  const listeHeaders = figuranListData?.headers || [];

  const listeTsv = () => {
    const header = listeHeaders.join("\t");
    const lines = filteredListe.map((row) =>
      listeHeaders.map((_, i) => String(row[i] ?? "")).join("\t")
    );
    return [header, ...lines].join("\n");
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <PageHeader
        icon={Users}
        title="Figüranlar"
        description="Figüran listesi ve oyunlardaki figüran görevleri"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl overflow-hidden border border-border">
          <button
            data-testid="tab-liste"
            onClick={() => setTab("liste")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors"
            style={
              tab === "liste"
                ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                : { background: "transparent", color: "hsl(var(--muted-foreground))" }
            }
          >
            <List className="w-3.5 h-3.5" />
            FİGÜRAN LİSTESİ ({filteredListe.length})
          </button>
          <button
            data-testid="tab-oyunlar"
            onClick={() => setTab("oyunlar")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors border-l border-border"
            style={
              tab === "oyunlar"
                ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                : { background: "transparent", color: "hsl(var(--muted-foreground))" }
            }
          >
            <Film className="w-3.5 h-3.5" />
            OYUN BAZLI ({filteredOyunlar.length})
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-figuran"
            placeholder="Figüran, oyun ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setExcelOpen(true)}
          data-testid="button-excel-figuran"
        >
          <Download className="w-3.5 h-3.5" />
          Excel'e Kopyala
        </Button>
      </div>

      {tab === "liste" ? (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {filteredListe.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Kayıt bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    {listeHeaders.map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredListe.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      {listeHeaders.map((h, colIdx) => {
                        const cellValue = String(row[colIdx] ?? "");
                        const hLower = h.toLowerCase();
                        const isOyunCol = hLower.includes("oyun");
                        const isGorevCol = hLower.includes("görev") && !isOyunCol;
                        const isNoCol = hLower.includes("sıra") || hLower.includes("no");
                        return (
                          <td key={colIdx} className="px-4 py-2.5">
                            {isNoCol ? (
                              <span className="text-xs text-muted-foreground tabular-nums">{cellValue}</span>
                            ) : isOyunCol ? (
                              <OyunBadges value={cellValue} />
                            ) : isGorevCol ? (
                              <GorevCell value={cellValue} />
                            ) : (
                              <span className="text-sm font-medium text-foreground">{cellValue}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {filteredOyunlar.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Figüran kaydı bulunamadı</p>
              <p className="text-xs mt-1 opacity-60">BÜTÜN OYUNLAR sayfasına figüran kategorisiyle eklediğinizde burada görünür</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Oyun</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kişi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Görev</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOyunlar.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5 max-w-[220px]">
                        <span className="inline-block bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded text-[11px] font-medium leading-tight">
                          {row.oyun}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground text-sm">{row.kisi}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.gorev}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${categoryColor(row.kategori)}`}>
                          {row.kategori}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ExcelDialog
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        playName={tab === "liste" ? `Figüran Listesi (${filteredListe.length} kişi)` : `Figüranlar Oyun Bazlı (${filteredOyunlar.length} kayıt)`}
        rows={tab === "oyunlar" ? filteredOyunlar : []}
        customTsvFn={tab === "liste" ? listeTsv : undefined}
      />
    </div>
  );
}
