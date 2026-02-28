import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  parsePlayRows,
  isChildPlay,
  categoryColor,
  groupByPerson,
  trLower,
} from "@/lib/theater";
import type { PlayRow } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  Baby,
  ChevronLeft,
  Users,
  Theater,
} from "lucide-react";

type SheetData = { headers: string[]; rows: any[][] };

function PersonDetail({
  personName,
  rows,
  onBack,
}: {
  personName: string;
  rows: PlayRow[];
  onBack: () => void;
}) {
  const [, navigate] = useLocation();

  const byPlay = useMemo(() => {
    const map = new Map<string, PlayRow[]>();
    rows.forEach((r) => {
      if (!map.has(r.oyun)) map.set(r.oyun, []);
      map.get(r.oyun)!.push(r);
    });
    return map;
  }, [rows]);

  const plays = useMemo(
    () => Array.from(byPlay.keys()).sort((a, b) => a.localeCompare(b, "tr")),
    [byPlay]
  );

  const gorevler = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.gorev.trim()) s.add(r.gorev.trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  return (
    <div className="flex flex-col h-full">
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ background: "hsl(var(--card))" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-[14px] text-foreground">{personName}</h2>
            <p className="text-[11px] text-muted-foreground">
              {plays.length} oyun &nbsp;·&nbsp; {rows.length} kayıt
              {gorevler.length > 0 && (
                <span className="hidden sm:inline"> &nbsp;·&nbsp; {gorevler.slice(0, 2).join(", ")}{gorevler.length > 2 ? "…" : ""}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/dagilim?kisi=${encodeURIComponent(personName)}`)}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hidden sm:flex items-center gap-1"
        >
          <Users className="w-3 h-3" />
          Dağılım
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {plays.map((playName) => {
          const playRows = byPlay.get(playName)!;
          const child = isChildPlay(playName);
          return (
            <div
              key={playName}
              className="rounded-xl border border-border overflow-hidden"
              style={{ background: "hsl(var(--card))" }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 border-b border-border"
                style={{ background: "hsl(var(--sidebar) / 0.5)" }}
              >
                <Theater className="w-3 h-3 shrink-0" style={{ color: "hsl(var(--sidebar-primary))" }} />
                <span
                  className="font-bold text-[12px] text-foreground flex-1 cursor-pointer hover:underline"
                  onClick={() => navigate(`/?oyun=${encodeURIComponent(playName)}`)}
                  title="Oyuna git"
                >
                  {playName}
                </span>
                {child && (
                  <span className="text-[10px] font-semibold text-chart-4 bg-chart-4/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Baby className="w-2.5 h-2.5" />Ç.O
                  </span>
                )}
              </div>
              <div className="px-3 py-2 space-y-1">
                {playRows.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${categoryColor(r.kategori)}`}>
                      {r.kategori}
                    </span>
                    <span className="text-[12px] text-muted-foreground leading-snug">{r.gorev || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OyunlarPage() {
  const [location, navigate] = useLocation();

  const urlKisi = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("kisi") || "";
  }, [location]);

  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const { data, isLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
    refetchOnMount: "always",
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const persons = useMemo(() => {
    const map = new Map<string, { plays: Set<string>; rows: PlayRow[] }>();
    rows.forEach((r) => {
      const names = r.kisi.split(",").map((k) => k.trim()).filter(Boolean);
      names.forEach((name) => {
        if (!map.has(name)) map.set(name, { plays: new Set(), rows: [] });
        const entry = map.get(name)!;
        entry.plays.add(r.oyun);
        entry.rows.push(r);
      });
    });
    return Array.from(map.entries())
      .map(([name, { plays, rows }]) => ({ name, playCount: plays.size, plays, rows }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [rows]);

  useEffect(() => {
    if (urlKisi && persons.length > 0) {
      const found = persons.find((p) => p.name === urlKisi);
      if (found) {
        setSelected(found.name);
        setMobileView("detail");
      }
    }
  }, [urlKisi, persons]);

  const kategoriler = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.kategori.trim();
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);
  }, [rows]);

  const filtered = useMemo(() => {
    let result = persons;
    if (kategoriFilter !== "all") {
      result = result.filter((p) =>
        p.rows.some((r) => r.kategori.trim() === kategoriFilter)
      );
    }
    if (search.trim()) {
      const lower = trLower(search.trim());
      result = result.filter((p) =>
        trLower(p.name).includes(lower) ||
        p.rows.some((r) =>
          trLower(r.gorev).includes(lower) ||
          trLower(r.oyun).includes(lower) ||
          trLower(r.kategori).includes(lower)
        )
      );
    }
    return result;
  }, [persons, search, kategoriFilter]);

  const selectedPerson = useMemo(
    () => (selected ? persons.find((p) => p.name === selected) || null : null),
    [persons, selected]
  );

  const selectedRows = useMemo(
    () => (selected ? rows.filter((r) => r.kisi.split(",").some((k) => k.trim() === selected)) : []),
    [rows, selected]
  );

  const handleSelect = useCallback((name: string) => {
    setSelected(name);
    setMobileView("detail");
  }, []);

  const handleBack = useCallback(() => {
    setMobileView("list");
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-72 shrink-0 border-r p-3 space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-7 w-full rounded-lg" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-12 w-80 rounded-lg" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Person List */}
        <div
          className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex flex-col w-full md:w-72 shrink-0 border-r border-border`}
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="px-3 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                data-testid="input-search-persons"
                placeholder="Kişi, görev, oyun ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 h-8 text-[12px]"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {(["all", ...kategoriler]).map((f) => (
                <button
                  key={f}
                  onClick={() => setKategoriFilter(f)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md transition-all"
                  style={
                    kategoriFilter === f
                      ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                      : { background: "hsl(var(--muted)/0.5)", color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {f === "all" ? "Tümü" : f}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
              {filtered.length} kişi
              {search && <span className="text-primary font-medium"> · "{search}"</span>}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map((person) => {
              const isActive = selected === person.name;
              const cats = Array.from(new Set(person.rows.map(r => r.kategori.trim()).filter(Boolean)));
              return (
                <button
                  key={person.name}
                  data-testid={`person-item-${person.name}`}
                  onClick={() => handleSelect(person.name)}
                  className="w-full text-left px-3 py-2 border-b border-border/50 transition-colors flex items-center gap-2"
                  style={
                    isActive
                      ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-foreground))" }
                      : { background: "transparent", color: "hsl(var(--foreground))" }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted))";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-semibold leading-snug block truncate" style={isActive ? { color: "hsl(var(--sidebar-foreground))" } : {}}>
                      {person.name}
                    </span>
                    <p
                      className="text-[10px] mt-0.5 truncate"
                      style={isActive ? { color: "hsl(var(--sidebar-foreground) / 0.65)" } : { color: "hsl(var(--muted-foreground))" }}
                    >
                      {person.playCount} oyun · {cats.slice(0, 2).join(", ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Person Detail */}
        <div
          className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col min-w-0`}
          style={{ background: "hsl(var(--background))" }}
        >
          {selected && selectedPerson ? (
            <PersonDetail
              personName={selected}
              rows={selectedRows}
              onBack={handleBack}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--sidebar))" }}
              >
                <span className="font-black text-xl" style={{ color: "hsl(var(--sidebar-primary))" }}>İDT</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Bir kişi seçin</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sol panelden bir kişiyi tıklayarak<br />oyun ve görev listesini görüntüleyin
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="bg-card border border-border rounded-lg px-3 py-1.5">
                  <strong className="text-foreground">{persons.length}</strong> Kişi
                </span>
                <span className="bg-card border border-border rounded-lg px-3 py-1.5">
                  <strong className="text-foreground">{new Set(rows.map(r => r.oyun)).size}</strong> Oyun
                </span>
                <span className="bg-card border border-border rounded-lg px-3 py-1.5">
                  <strong className="text-foreground">{rows.length}</strong> Kayıt
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
