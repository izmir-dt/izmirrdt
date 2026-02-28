import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parsePlayRows, groupByPlay, categoryColor } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SearchCode, GitMerge, ChevronDown, Download, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SheetData = { headers: string[]; rows: any[][] };

function PlaySelector({
  label,
  value,
  onChange,
  plays,
  accentColor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  plays: string[];
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () =>
      value
        ? plays.filter((p) => p.toLowerCase().includes(value.toLowerCase())).slice(0, 12)
        : plays.slice(0, 12),
    [plays, value]
  );

  return (
    <div className="relative">
      <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: accentColor }}>
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pl-9 pr-8"
          placeholder="Oyun adı..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{ borderColor: value ? accentColor + "60" : undefined }}
        />
        {value && (
          <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => onChange("")}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate"
              onMouseDown={() => { onChange(p); setOpen(false); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SorgulamaPage() {
  const [activeTab, setActiveTab] = useState<"filtre" | "kesisim">("kesisim");
  const [filterGorev, setFilterGorev] = useState("");
  const [filterOyun, setFilterOyun] = useState("");
  const [filterKisi, setFilterKisi] = useState("");
  const [oyunA, setOyunA] = useState("");
  const [oyunB, setOyunB] = useState("");
  const [excelCopied, setExcelCopied] = useState(false);

  const { data, isLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
    refetchOnMount: "always",
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const allPlays = useMemo(() => {
    return groupByPlay(allRows).map((p) => p.name);
  }, [allRows]);

  const filterResults = useMemo(() => {
    return allRows.filter((r) => {
      if (filterGorev && !r.kategori.toLowerCase().includes(filterGorev.toLowerCase())) return false;
      if (filterOyun && !r.oyun.toLowerCase().includes(filterOyun.toLowerCase())) return false;
      if (filterKisi && !r.kisi.toLowerCase().includes(filterKisi.toLowerCase())) return false;
      return true;
    });
  }, [allRows, filterGorev, filterOyun, filterKisi]);

  const hasFilter = filterGorev || filterOyun || filterKisi;

  const kesisimResult = useMemo(() => {
    if (!oyunA || !oyunB) return null;

    const rowsA = allRows.filter((r) => r.oyun === oyunA);
    const rowsB = allRows.filter((r) => r.oyun === oyunB);

    const roleMapA = new Map<string, string[]>();
    const roleMapB = new Map<string, string[]>();

    rowsA.forEach((r) => {
      r.kisi.split(",").forEach((k) => {
        const t = k.trim(); if (!t) return;
        if (!roleMapA.has(t)) roleMapA.set(t, []);
        const roles = roleMapA.get(t)!;
        if (r.gorev.trim() && !roles.includes(r.gorev.trim())) roles.push(r.gorev.trim());
      });
    });
    rowsB.forEach((r) => {
      r.kisi.split(",").forEach((k) => {
        const t = k.trim(); if (!t) return;
        if (!roleMapB.has(t)) roleMapB.set(t, []);
        const roles = roleMapB.get(t)!;
        if (r.gorev.trim() && !roles.includes(r.gorev.trim())) roles.push(r.gorev.trim());
      });
    });

    const kisiSetA = new Set(roleMapA.keys());
    const kisiSetB = new Set(roleMapB.keys());

    const onlyA = [...kisiSetA].filter((k) => !kisiSetB.has(k)).sort((a, b) => a.localeCompare(b, "tr"))
      .map((k) => ({ name: k, gorev: (roleMapA.get(k) || []).join(", ") }));
    const onlyB = [...kisiSetB].filter((k) => !kisiSetA.has(k)).sort((a, b) => a.localeCompare(b, "tr"))
      .map((k) => ({ name: k, gorev: (roleMapB.get(k) || []).join(", ") }));
    const common = [...kisiSetA].filter((k) => kisiSetB.has(k)).sort((a, b) => a.localeCompare(b, "tr"))
      .map((k) => ({ name: k, gorevA: (roleMapA.get(k) || []).join(", "), gorevB: (roleMapB.get(k) || []).join(", ") }));

    return { onlyA, onlyB, common };
  }, [allRows, oyunA, oyunB]);

  const excelTsv = useMemo(() => {
    if (activeTab === "filtre") {
      const header = "Oyun\tKategori\tGörev\tKişi";
      const lines = filterResults.map((r) => `${r.oyun}\t${r.kategori}\t${r.gorev}\t${r.kisi}`);
      return [header, ...lines].join("\n");
    } else if (activeTab === "kesisim" && kesisimResult) {
      const lines: string[] = ["Durum\tKişi\tGörev (A)\tGörev (B)"];
      kesisimResult.common.forEach(k => lines.push(`Ortak\t${k.name}\t${k.gorevA}\t${k.gorevB}`));
      kesisimResult.onlyA.forEach(k => lines.push(`Sadece ${oyunA}\t${k.name}\t${k.gorev}\t`));
      kesisimResult.onlyB.forEach(k => lines.push(`Sadece ${oyunB}\t${k.name}\t\t${k.gorev}`));
      return lines.join("\n");
    }
    return "";
  }, [activeTab, filterResults, kesisimResult, oyunA, oyunB]);

  const handleExcelCopy = () => {
    if (!excelTsv) return;
    navigator.clipboard.writeText(excelTsv).then(() => {
      setExcelCopied(true);
      setTimeout(() => setExcelCopied(false), 2000);
    });
  };

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-64 rounded-xl" /></div>;
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <PageHeader
          icon={SearchCode}
          title="Sorgulama"
          description="Personel, oyun ve kategoriye göre filtrele — ya da iki oyunun ortak personelini karşılaştır"
        />
        <button
          data-testid="button-excel-sorgulama"
          onClick={handleExcelCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 mt-1"
          style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
        >
          {excelCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Download className="w-3.5 h-3.5" />}
          {excelCopied ? "Kopyalandı!" : "Excel'e Kopyala"}
        </button>
      </div>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        <button
          data-testid="tab-kesisim"
          onClick={() => setActiveTab("kesisim")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={activeTab === "kesisim"
            ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
            : { color: "hsl(var(--muted-foreground))" }
          }
        >
          <GitMerge className="w-3.5 h-3.5" />
          Kesişim Analizi
        </button>
        <button
          data-testid="tab-filtre"
          onClick={() => setActiveTab("filtre")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={activeTab === "filtre"
            ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
            : { color: "hsl(var(--muted-foreground))" }
          }
        >
          <Search className="w-3.5 h-3.5" />
          Filtrele
        </button>
      </div>

      {activeTab === "filtre" && (
        <>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-foreground">Filtreler</h3>
              <span className="text-[10px] text-muted-foreground">— birden fazla alanı doldurunca hepsi birlikte uygulanır</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Kategori
                  <span className="font-normal ml-1 text-[10px]">— ör: Oyuncu, Figüran</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    data-testid="input-filter-gorev"
                    className="pl-9"
                    placeholder="Kategori..."
                    value={filterGorev}
                    onChange={(e) => setFilterGorev(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Oyun
                  <span className="font-normal ml-1 text-[10px]">— ör: Anahtar</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    data-testid="input-filter-oyun"
                    className="pl-9"
                    placeholder="Oyun adı..."
                    value={filterOyun}
                    onChange={(e) => setFilterOyun(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Kişi
                  <span className="font-normal ml-1 text-[10px]">— ör: Öztürk</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    data-testid="input-filter-kisi"
                    className="pl-9"
                    placeholder="Kişi adı..."
                    value={filterKisi}
                    onChange={(e) => setFilterKisi(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => { setFilterGorev(""); setFilterOyun(""); setFilterKisi(""); }}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Temizle
              </Button>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Sonuçlar</span>
              <span className="text-xs text-muted-foreground">
                {hasFilter ? `${filterResults.length} satır` : "Filtre girerek başlayın"}
              </span>
            </div>
            {!hasFilter ? (
              <div className="py-16 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Filtre girin</p>
                <p className="text-xs mt-1 opacity-70">Kategori, oyun veya kişi alanlarından birini doldurun</p>
              </div>
            ) : filterResults.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <X className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sonuç bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Kişi</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Görev</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Kategori</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Oyun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResults.slice(0, 300).map((row, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="px-5 py-2 font-medium text-foreground text-xs whitespace-nowrap">{row.kisi}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.gorev}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${categoryColor(row.kategori)}`}>
                            {row.kategori}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{row.oyun}</td>
                      </tr>
                    ))}
                    {filterResults.length > 300 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-3 text-xs text-center text-muted-foreground">
                          + {filterResults.length - 300} daha fazla satır
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "kesisim" && (
        <>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-4">
              İki oyun seçin — aynı kişilerin her iki oyunda da görev alıp almadığını görün
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <PlaySelector
                label="1. Oyun"
                value={oyunA}
                onChange={setOyunA}
                plays={allPlays}
                accentColor="hsl(220, 80%, 45%)"
              />
              <PlaySelector
                label="2. Oyun"
                value={oyunB}
                onChange={setOyunB}
                plays={allPlays}
                accentColor="hsl(340, 75%, 45%)"
              />
            </div>
            {(oyunA || oyunB) && (
              <button
                onClick={() => { setOyunA(""); setOyunB(""); }}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Temizle
              </button>
            )}
          </div>

          {!oyunA || !oyunB ? (
            <div className="text-center py-16 text-muted-foreground">
              <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">İki oyun seçin</p>
              <p className="text-xs mt-1 opacity-70">Ortak personel listesi burada görünecek</p>
            </div>
          ) : kesisimResult && (
            <>
              {/* Venn Diagram */}
              <div className="bg-card border border-card-border rounded-xl py-4 px-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "rgba(37,99,235,0.7)" }} />
                    <p className="text-[11px] font-bold leading-tight break-words" style={{ color: "hsl(220, 80%, 45%)" }}>{oyunA}</p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                    <p className="text-[11px] font-bold leading-tight break-words" style={{ color: "hsl(340, 75%, 45%)" }}>{oyunB}</p>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "rgba(220,38,127,0.7)" }} />
                  </div>
                </div>
                <div className="flex items-center justify-center py-2">
                  <svg viewBox="0 0 400 150" className="w-full max-w-[400px]">
                    <circle cx="140" cy="75" r="65" fill="rgba(37,99,235,0.13)" stroke="rgba(37,99,235,0.65)" strokeWidth="2" />
                    <circle cx="260" cy="75" r="65" fill="rgba(220,38,127,0.10)" stroke="rgba(220,38,127,0.65)" strokeWidth="2" />
                    <text x="90" y="68" textAnchor="middle" fontSize="32" fontWeight="800" fill="rgb(37,99,235)">{kesisimResult.onlyA.length}</text>
                    <text x="90" y="88" textAnchor="middle" fontSize="11" fill="rgb(37,99,235)" opacity="0.85" fontWeight="600">sadece A</text>
                    <text x="200" y="68" textAnchor="middle" fontSize="28" fontWeight="800" fill="rgb(100,48,210)">{kesisimResult.common.length}</text>
                    <text x="200" y="86" textAnchor="middle" fontSize="11" fill="rgb(100,48,210)" opacity="0.85" fontWeight="600">ortak</text>
                    <text x="310" y="68" textAnchor="middle" fontSize="32" fontWeight="800" fill="rgb(220,38,127)">{kesisimResult.onlyB.length}</text>
                    <text x="310" y="88" textAnchor="middle" fontSize="11" fill="rgb(220,38,127)" opacity="0.85" fontWeight="600">sadece B</text>
                  </svg>
                </div>
              </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(220 80% 50% / 0.3)" }}>
                <div className="px-4 py-3 border-b" style={{ background: "hsl(220 80% 58% / 0.10)", borderColor: "hsl(220 80% 50% / 0.2)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(220 80% 45%)" }}>
                    Sadece {oyunA.length > 20 ? oyunA.slice(0, 18) + "…" : oyunA}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{kesisimResult.onlyA.length}</p>
                </div>
                <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
                  {kesisimResult.onlyA.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Özgün kişi yok</p>
                  ) : kesisimResult.onlyA.map((k) => (
                    <div key={k.name} className="px-2 py-1.5 rounded hover:bg-muted/40 transition-colors">
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{k.name}</p>
                      {k.gorev && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{k.gorev}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(var(--sidebar-primary) / 0.3)" }}>
                <div className="px-4 py-3 border-b" style={{ background: "hsl(var(--sidebar-primary) / 0.08)", borderColor: "hsl(var(--sidebar-primary) / 0.2)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--sidebar-primary))" }}>
                    Ortak Kişiler
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{kesisimResult.common.length}</p>
                </div>
                <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
                  {kesisimResult.common.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Ortak kişi yok</p>
                  ) : kesisimResult.common.map((k) => (
                    <div key={k.name} className="px-2 py-1.5 rounded transition-colors"
                      style={{ background: "hsl(var(--sidebar-primary) / 0.06)" }}>
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{k.name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {k.gorevA && <span className="text-[10px] text-muted-foreground"><span className="font-medium" style={{ color: "hsl(220 80% 45%)" }}>A:</span> {k.gorevA}</span>}
                        {k.gorevB && <span className="text-[10px] text-muted-foreground"><span className="font-medium" style={{ color: "hsl(340 75% 45%)" }}>B:</span> {k.gorevB}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(340 75% 50% / 0.3)" }}>
                <div className="px-4 py-3 border-b" style={{ background: "hsl(340 75% 55% / 0.10)", borderColor: "hsl(340 75% 50% / 0.2)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(340 75% 45%)" }}>
                    Sadece {oyunB.length > 20 ? oyunB.slice(0, 18) + "…" : oyunB}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{kesisimResult.onlyB.length}</p>
                </div>
                <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
                  {kesisimResult.onlyB.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Özgün kişi yok</p>
                  ) : kesisimResult.onlyB.map((k) => (
                    <div key={k.name} className="px-2 py-1.5 rounded hover:bg-muted/40 transition-colors">
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{k.name}</p>
                      {k.gorev && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{k.gorev}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
