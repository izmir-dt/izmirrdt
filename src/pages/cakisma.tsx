import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parsePlayRows, groupByPerson } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, X, GitMerge } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SheetData = { headers: string[]; rows: any[][] };

function PersonSearch({
  value,
  onChange,
  people,
  label,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  people: string[];
  label: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () =>
      value
        ? people.filter((p) => p.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
        : people.slice(0, 10),
    [people, value]
  );
  return (
    <div className="relative">
      <label
        className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
        style={{ color: accentColor }}
      >
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pl-9 pr-8"
          placeholder="Kişi ara veya seç..."
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
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
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

function VennDiagram({
  nameA,
  nameB,
  onlyA,
  common,
  onlyB,
}: {
  nameA: string;
  nameB: string;
  onlyA: string[];
  common: string[];
  onlyB: string[];
}) {
  const total = onlyA.length + common.length + onlyB.length;
  const w = 600;
  const h = 220;
  const r = 110;
  const cx = w / 2;
  const cy = h / 2;
  const overlapRatio = common.length / Math.max(total, 1);
  const offset = r * (0.5 + (1 - overlapRatio) * 0.45);

  const circleA = { cx: cx - offset * 0.65, cy };
  const circleB = { cx: cx + offset * 0.65, cy };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          style={{ maxWidth: 560, minWidth: 280 }}
        >
          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.10" />
            </filter>
          </defs>
          <circle
            cx={circleA.cx}
            cy={circleA.cy}
            r={r}
            fill="hsl(220 80% 58% / 0.18)"
            stroke="hsl(220 80% 50%)"
            strokeWidth="1.5"
            filter="url(#shadow)"
          />
          <circle
            cx={circleB.cx}
            cy={circleB.cy}
            r={r}
            fill="hsl(340 75% 55% / 0.18)"
            stroke="hsl(340 75% 50%)"
            strokeWidth="1.5"
            filter="url(#shadow)"
          />
          <text
            x={circleA.cx - offset * 0.45}
            y={cy - 4}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="hsl(220 80% 40%)"
          >
            {onlyA.length}
          </text>
          <text
            x={circleA.cx - offset * 0.45}
            y={cy + 14}
            textAnchor="middle"
            fontSize="10"
            fill="hsl(220 80% 40%)"
          >
            oyun
          </text>

          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="hsl(var(--foreground))"
          >
            {common.length}
          </text>
          <text
            x={cx}
            y={cy + 13}
            textAnchor="middle"
            fontSize="10"
            fill="hsl(var(--muted-foreground))"
          >
            ortak
          </text>

          <text
            x={circleB.cx + offset * 0.45}
            y={cy - 4}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="hsl(340 75% 40%)"
          >
            {onlyB.length}
          </text>
          <text
            x={circleB.cx + offset * 0.45}
            y={cy + 14}
            textAnchor="middle"
            fontSize="10"
            fill="hsl(340 75% 40%)"
          >
            oyun
          </text>

          <text
            x={circleA.cx - offset * 0.45}
            y={18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="hsl(220 80% 45%)"
          >
            {nameA.length > 18 ? nameA.slice(0, 16) + "…" : nameA}
          </text>
          <text
            x={circleB.cx + offset * 0.45}
            y={18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="hsl(340 75% 45%)"
          >
            {nameB.length > 18 ? nameB.slice(0, 16) + "…" : nameB}
          </text>
        </svg>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 w-full">
        <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(220 80% 50% / 0.3)" }}>
          <div className="px-4 py-2.5 border-b" style={{ background: "hsl(220 80% 58% / 0.10)", borderColor: "hsl(220 80% 50% / 0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(220 80% 45%)" }}>
              Sadece {nameA.split(" ")[0]}
            </p>
            <p className="text-xl font-bold text-foreground">{onlyA.length}</p>
          </div>
          <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
            {onlyA.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Özgün oyun yok</p>
            ) : (
              onlyA.map((p) => (
                <p key={p} className="text-[11px] text-foreground py-1 px-2 rounded hover:bg-muted/40 transition-colors leading-tight">{p}</p>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(var(--sidebar-primary) / 0.3)" }}>
          <div className="px-4 py-2.5 border-b" style={{ background: "hsl(var(--sidebar-primary) / 0.08)", borderColor: "hsl(var(--sidebar-primary) / 0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--sidebar-primary))" }}>
              Ortak Oyunlar
            </p>
            <p className="text-xl font-bold text-foreground">{common.length}</p>
          </div>
          <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
            {common.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Ortak oyun yok</p>
            ) : (
              common.map((p) => (
                <p
                  key={p}
                  className="text-[11px] py-1 px-2 rounded font-medium leading-tight"
                  style={{ background: "hsl(var(--sidebar-primary) / 0.08)", color: "hsl(var(--foreground))" }}
                >
                  {p}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: "hsl(340 75% 50% / 0.3)" }}>
          <div className="px-4 py-2.5 border-b" style={{ background: "hsl(340 75% 55% / 0.10)", borderColor: "hsl(340 75% 50% / 0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(340 75% 45%)" }}>
              Sadece {nameB.split(" ")[0]}
            </p>
            <p className="text-xl font-bold text-foreground">{onlyB.length}</p>
          </div>
          <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
            {onlyB.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Özgün oyun yok</p>
            ) : (
              onlyB.map((p) => (
                <p key={p} className="text-[11px] text-foreground py-1 px-2 rounded hover:bg-muted/40 transition-colors leading-tight">{p}</p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CakismaPage() {
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");

  const { data, isLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const allPeople = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => r.kisi.split(",").forEach((k) => { const t = k.trim(); if (t) set.add(t); }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [allRows]);

  const personDataA = useMemo(() => {
    if (!personA) return null;
    const aRows = allRows.filter((r) => r.kisi.toLowerCase().includes(personA.toLowerCase()));
    return new Set(aRows.map((r) => r.oyun));
  }, [allRows, personA]);

  const personDataB = useMemo(() => {
    if (!personB) return null;
    const bRows = allRows.filter((r) => r.kisi.toLowerCase().includes(personB.toLowerCase()));
    return new Set(bRows.map((r) => r.oyun));
  }, [allRows, personB]);

  const compareResult = useMemo(() => {
    if (!personDataA || !personDataB) return null;
    const onlyA = [...personDataA].filter((p) => !personDataB.has(p)).sort((a, b) => a.localeCompare(b, "tr"));
    const onlyB = [...personDataB].filter((p) => !personDataA.has(p)).sort((a, b) => a.localeCompare(b, "tr"));
    const common = [...personDataA].filter((p) => personDataB.has(p)).sort((a, b) => a.localeCompare(b, "tr"));
    return { onlyA, onlyB, common };
  }, [personDataA, personDataB]);

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-64 rounded-xl" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <PageHeader
        icon={GitMerge}
        title="Oyun Çakışması Kontrolü"
        description="İki kişiyi seçerek hangi oyunlarda birlikte veya ayrı görev aldıklarını görün"
      />

      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <PersonSearch
            value={personA}
            onChange={setPersonA}
            people={allPeople}
            label="Kişi A"
            accentColor="hsl(220, 80%, 45%)"
          />
          <PersonSearch
            value={personB}
            onChange={setPersonB}
            people={allPeople}
            label="Kişi B"
            accentColor="hsl(340, 75%, 45%)"
          />
        </div>
        {(personA || personB) && (
          <button
            onClick={() => { setPersonA(""); setPersonB(""); }}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Temizle
          </button>
        )}
      </div>

      {!personA || !personB ? (
        <div className="text-center py-16 text-muted-foreground">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--muted))" }}
          >
            <GitMerge className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-sm font-medium">İki kişi seçin</p>
          <p className="text-xs mt-1 opacity-70">Venn diyagramı ve oyun listesi görünecek</p>
        </div>
      ) : compareResult ? (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-1">
          <VennDiagram
            nameA={personA}
            nameB={personB}
            onlyA={compareResult.onlyA}
            common={compareResult.common}
            onlyB={compareResult.onlyB}
          />
        </div>
      ) : null}
    </div>
  );
}
