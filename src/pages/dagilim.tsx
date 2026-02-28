import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { parsePlayRows, groupByPerson, isChildPlay } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, BarChart3, Baby, Clapperboard, SlidersHorizontal, X, ArrowLeft, Download, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SheetData = { headers: string[]; rows: any[][] };

export default function DagilimPage() {
  const [location, navigate] = useLocation();
  const urlKisi = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("kisi") || "";
  }, [location]);

  const fromGrafik = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("from") === "grafik";
  }, [location]);

  const [search, setSearch] = useState(urlKisi);
  const [expanded, setExpanded] = useState<string | null>(urlKisi || null);
  const [minPlays, setMinPlays] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterOyun, setFilterOyun] = useState("");
  const [excelOpen, setExcelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const excelTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (urlKisi) {
      setSearch(urlKisi);
      setExpanded(urlKisi);
    }
  }, [urlKisi]);

  const { data, isLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
    refetchOnMount: "always",
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const people = useMemo(() => groupByPerson(allRows), [allRows]);

  const allPlays = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r) => { if (r.oyun.trim()) s.add(r.oyun.trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [allRows]);

  const filtered = useMemo(() => {
    let result = minPlays === 1 ? people : people.filter((p) => p.oyunlar.length === minPlays);
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(lower));
    }
    if (filterOyun.trim()) {
      result = result.filter((p) => p.oyunlar.some((o) => o.toLowerCase().includes(filterOyun.toLowerCase())));
    }
    return result;
  }, [people, search, minPlays, filterOyun]);

  const excelTsv = useMemo(() => {
    const header = "Kişi\tOyun Sayısı\tOyunlar\tGörevler\tKategoriler";
    const lines = filtered.map((p) => {
      const oyunlar = p.oyunlar.join(", ");
      const gorevler = Array.from(new Set(
        allRows.filter(r => r.kisi.trim().toLowerCase() === p.name.trim().toLowerCase()).map(r => r.gorev).filter(Boolean)
      )).join(", ");
      const kategoriler = Array.from(new Set(
        allRows.filter(r => r.kisi.trim().toLowerCase() === p.name.trim().toLowerCase()).map(r => r.kategori).filter(Boolean)
      )).join(", ");
      return `${p.name}\t${p.oyunlar.length}\t${oyunlar}\t${gorevler}\t${kategoriler}`;
    });
    return [header, ...lines].join("\n");
  }, [filtered, allRows]);

  const handleExcelCopy = () => {
    navigator.clipboard.writeText(excelTsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { excelTextRef.current?.select(); });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {fromGrafik && (
        <button
          data-testid="button-back-to-grafik"
          onClick={() => navigate("/grafik")}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Grafiklere Geri Dön
        </button>
      )}

      <PageHeader
        icon={BarChart3}
        title="Personel Dağılımı"
        description="Her kişinin hangi oyunlarda görev aldığını gösterir"
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-person"
            placeholder="Kişi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} kişi</span>
        <div className="ml-auto flex items-center gap-2">
          {minPlays > 1 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }}>
              Tam {minPlays} oyun
            </span>
          )}
          <button
            data-testid="button-excel-dagilim"
            onClick={() => setExcelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
          >
            <Download className="w-3.5 h-3.5" />
            Excel'e Kopyala
          </button>
          <button
            data-testid="button-filter-open"
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={filterOpen || minPlays > 1 || filterOyun
              ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))", borderColor: "hsl(var(--sidebar-primary) / 0.3)" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtrele
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 shadow-2xl flex flex-col"
            style={{ background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="text-sm font-bold text-foreground">Filtreler</h3>
              <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Oyun Sayısı (Tam Eşleşme)</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      data-testid={`btn-min-plays-${n}`}
                      onClick={() => setMinPlays(n)}
                      className="h-9 rounded-lg text-sm font-bold transition-all duration-150 border"
                      style={minPlays === n
                        ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))", borderColor: "hsl(var(--sidebar-primary) / 0.4)" }
                        : { background: "hsl(var(--muted) / 0.5)", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                      }
                    >
                      {n === 1 ? "1+" : n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {minPlays === 1 ? "1 veya daha fazla oyunda görev alan kişiler" : `Tam olarak ${minPlays} oyunda görev alan kişiler`}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Oyuna Göre Filtrele</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    data-testid="input-filter-oyun-dagilim"
                    placeholder="Oyun adı..."
                    value={filterOyun}
                    onChange={(e) => setFilterOyun(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                  {filterOyun && (
                    <button
                      onClick={() => setFilterOyun("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {filterOyun && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    "{filterOyun}" oyununda görev alan kişiler
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button
                onClick={() => { setMinPlays(1); setFilterOyun(""); setFilterOpen(false); }}
                className="w-full py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sonuç bulunamadı</p>
          </div>
        )}
        {filtered.map((person) => {
          const isOpen = expanded === person.name;
          const multiPlays = person.oyunlar.length > 1;
          return (
            <div
              key={person.name}
              className="bg-card border border-card-border rounded-xl overflow-hidden"
              style={multiPlays ? { borderLeft: "3px solid hsl(var(--sidebar-primary))" } : {}}
            >
              <button
                data-testid={`person-${person.name}`}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : person.name)}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                  style={multiPlays
                    ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {person.oyunlar.length}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {person.gorevler.slice(0, 3).join(" · ")}
                    {person.gorevler.length > 3 && ` +${person.gorevler.length - 3}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground"
                  >
                    {person.oyunlar.length} oyun
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div
                  className="border-t px-5 py-4"
                  style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Oyunlar ve Görevler
                  </p>
                  <div className="space-y-1.5">
                    {person.oyunlar.map((o) => {
                      const child = isChildPlay(o);
                      const rowsForPlay = allRows.filter(
                        (r) => r.oyun === o && r.kisi.trim().toLowerCase() === person.name.trim().toLowerCase()
                      );
                      const gorevlerForPlay = Array.from(new Set(rowsForPlay.map((r) => r.gorev).filter(Boolean)));
                      return (
                        <div
                          key={o}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg"
                          style={{
                            background: child ? "hsl(var(--background))" : "hsl(var(--card))",
                            border: `1px solid ${child ? "hsl(var(--chart-3) / 0.4)" : "hsl(var(--border))"}`,
                          }}
                        >
                          {child
                            ? <Baby className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                            : <Clapperboard className="w-3.5 h-3.5 opacity-30 shrink-0" />
                          }
                          <span
                            className="text-[12px] font-semibold truncate flex-1"
                            style={{ color: child ? "hsl(var(--chart-3))" : "hsl(var(--foreground))" }}
                          >
                            {o}
                          </span>
                          {gorevlerForPlay.length > 0 && (
                            <div className="flex flex-wrap gap-1 shrink-0">
                              {gorevlerForPlay.map((g) => (
                                <span
                                  key={g}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                  style={{
                                    background: "hsl(var(--sidebar))",
                                    color: "hsl(var(--sidebar-primary))",
                                    border: "1px solid hsl(var(--sidebar-primary) / 0.25)",
                                  }}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {excelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setExcelOpen(false)} />
          <div
            className="fixed right-0 top-0 h-full w-full max-w-[440px] z-50 flex flex-col"
            style={{ background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))", boxShadow: "-8px 0 32px hsl(0 0% 0% / 0.12)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: "hsl(var(--sidebar))", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
            >
              <div>
                <h2 className="font-bold text-[13px]" style={{ color: "hsl(var(--sidebar-foreground))" }}>Excel'e Aktar</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--sidebar-foreground) / 0.60)" }}>
                  {filtered.length} kişi {minPlays > 1 ? `· tam ${minPlays} oyun` : ""} {search ? `· "${search}"` : ""}
                </p>
              </div>
              <button
                onClick={() => setExcelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.65)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-border shrink-0 bg-muted/30">
              <span className="text-[11px] text-muted-foreground">
                <strong className="text-foreground">{filtered.length}</strong> kişi · Kişi, Oyun Sayısı, Oyunlar, Görevler, Kategoriler
              </span>
            </div>
            <div className="px-4 pt-3 shrink-0">
              <p className="text-[11px] text-muted-foreground">Aşağıdaki veriyi tümünü seçip kopyalayın, Excel'e yapıştırın.</p>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-2">
              <textarea
                ref={excelTextRef}
                readOnly
                value={excelTsv}
                onClick={() => excelTextRef.current?.select()}
                className="h-full w-full text-[11px] font-mono p-3 rounded-lg border border-border bg-muted/40 focus:outline-none resize-none cursor-text"
                style={{ userSelect: "text" }}
              />
            </div>
            <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">Ctrl+A → Ctrl+C → Excel'e yapıştır</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExcelOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Kapat
                </button>
                <button
                  data-testid="button-copy-excel-dagilim"
                  onClick={handleExcelCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                  style={{ background: "hsl(155 65% 38%)" }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
