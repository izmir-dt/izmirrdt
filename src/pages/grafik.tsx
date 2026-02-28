import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { parsePlayRows, groupByPlay, groupByPerson, categoryColor } from "@/lib/theater";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, Download, Check, Copy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Sector,
} from "recharts";

type SheetData = { headers: string[]; rows: any[][] };

const RICH_PALETTE = [
  "#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2980b9",
  "#8e44ad", "#16a085", "#d35400", "#2ecc71", "#3498db",
  "#9b59b6", "#1abc9c", "#e74c3c", "#f39c12", "#6c3483",
  "#145a32", "#1a5276", "#7d6608", "#4a235a", "#1b4f72",
  "#a93226", "#1e8bc3", "#196f3d", "#784212", "#154360",
];

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs max-w-[240px]">
      <p className="font-semibold text-foreground">{payload[0]?.payload?.fullName}</p>
      <p className="text-muted-foreground mt-0.5">
        <span className="font-bold text-foreground">{payload[0]?.value}</span>{" "}
        {payload[0]?.name}
      </p>
    </div>
  );
}

function ActivePieShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={11} fontWeight="700" fill="hsl(var(--foreground))">
        {payload.name.length > 16 ? payload.name.slice(0, 14) + "…" : payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={18} fontWeight="800" fill={fill}>
        {value}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">kayıt</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

export default function GrafikPage() {
  const [, navigate] = useLocation();
  const [activeChart, setActiveChart] = useState<"kisi" | "oyun" | "kategori">("kisi");
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [oyunSubTab, setOyunSubTab] = useState<"buyuk" | "kucuk">("buyuk");
  const [excelCopied, setExcelCopied] = useState(false);
  const [katCopied, setKatCopied] = useState(false);

  const { data, isLoading } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BÜTÜN OYUNLAR"],
    refetchOnMount: "always",
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const topKisi = useMemo(() => {
    return groupByPerson(allRows).slice(0, 25).map((p) => ({
      name: p.name,
      fullName: p.name,
      value: p.oyunlar.length,
    }));
  }, [allRows]);

  const sortedPlays = useMemo(() => {
    return groupByPlay(allRows).sort((a, b) => b.personelCount - a.personelCount);
  }, [allRows]);

  const oyunBuyuk = useMemo(() => {
    return sortedPlays.slice(0, 20).map((p) => ({
      name: p.name.length > 28 ? p.name.slice(0, 26) + "…" : p.name,
      fullName: p.name,
      value: p.personelCount,
    }));
  }, [sortedPlays]);

  const oyunKucuk = useMemo(() => {
    return [...sortedPlays].reverse().slice(0, 20).map((p) => ({
      name: p.name.length > 28 ? p.name.slice(0, 26) + "…" : p.name,
      fullName: p.name,
      value: p.personelCount,
    }));
  }, [sortedPlays]);

  const kategoriData = useMemo(() => {
    const counts = new Map<string, number>();
    allRows.forEach((r) => {
      const k = r.kategori.trim();
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const TOP = 12;
    const top = sorted.slice(0, TOP);
    const rest = sorted.slice(TOP);
    const digerValue = rest.reduce((sum, [, v]) => sum + v, 0);
    if (digerValue > 0) top.push(["Diğer", digerValue]);
    return top.map(([name, value]) => ({ name, value }));
  }, [allRows]);

  const kategoriPersons = useMemo(() => {
    if (!kategoriData[activePieIndex]) return [];
    const katName = kategoriData[activePieIndex].name;
    const byPerson = new Map<string, Set<string>>();
    if (katName === "Diğer") {
      const topNames = new Set(kategoriData.filter(k => k.name !== "Diğer").map(k => k.name));
      allRows.filter(r => r.kategori.trim() && !topNames.has(r.kategori.trim())).forEach((r) => {
        if (!byPerson.has(r.kisi)) byPerson.set(r.kisi, new Set());
        byPerson.get(r.kisi)!.add(r.kategori.trim());
      });
    } else {
      allRows.filter(r => r.kategori.trim() === katName).forEach((r) => {
        if (!byPerson.has(r.kisi)) byPerson.set(r.kisi, new Set());
        byPerson.get(r.kisi)!.add(r.gorev);
      });
    }
    return Array.from(byPerson.entries())
      .map(([name, roles]) => ({ name, roles: Array.from(roles) }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [allRows, kategoriData, activePieIndex]);

  const grafikExcelTsv = useMemo(() => {
    if (activeChart === "kisi") {
      const lines = ["Kişi\tOyun Sayısı", ...topKisi.map(d => `${d.fullName}\t${d.value}`)];
      return lines.join("\n");
    } else if (activeChart === "oyun") {
      const src = oyunSubTab === "buyuk" ? oyunBuyuk : oyunKucuk;
      const lines = ["Oyun\tPersonel Sayısı", ...src.map(d => `${d.fullName}\t${d.value}`)];
      return lines.join("\n");
    } else {
      const lines = ["Kategori\tKişi Sayısı", ...kategoriData.map(d => `${d.name}\t${d.value}`)];
      return lines.join("\n");
    }
  }, [activeChart, topKisi, oyunBuyuk, oyunKucuk, oyunSubTab, kategoriData]);

  const handleGrafikExcelCopy = () => {
    navigator.clipboard.writeText(grafikExcelTsv).then(() => {
      setExcelCopied(true);
      setTimeout(() => setExcelCopied(false), 2000);
    });
  };

  const handleKisiClick = (data: any) => {
    const name = data?.activePayload?.[0]?.payload?.fullName;
    if (name) navigate(`/dagilim?kisi=${encodeURIComponent(name)}&from=grafik`);
  };

  const handleOyunClick = (data: any) => {
    const name = data?.activePayload?.[0]?.payload?.fullName;
    if (name) navigate(`/?oyun=${encodeURIComponent(name)}&from=grafik`);
  };

  const handleKatCopy = () => {
    if (!kategoriPersons.length) return;
    const katName = kategoriData[activePieIndex]?.name || "";
    const lines = [`Kategori: ${katName}`, "", ...kategoriPersons.map(({ name, roles }) => `${name}\t${roles.join(", ")}`)];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setKatCopied(true);
      setTimeout(() => setKatCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Tab bar */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between" style={{ background: "hsl(var(--card))" }}>
        <div className="flex flex-wrap gap-1 bg-muted/40 rounded-xl p-1">
          {[
            { key: "kisi", label: "En Çok Oyuna Katılanlar" },
            { key: "oyun", label: "Oyun Kadroları" },
            { key: "kategori", label: "Kategori Dağılımı" },
          ].map((t) => (
            <button
              key={t.key}
              data-testid={`tab-grafik-${t.key}`}
              onClick={() => setActiveChart(t.key as any)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={activeChart === t.key
                ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                : { color: "hsl(var(--muted-foreground))" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          data-testid="button-excel-grafik"
          onClick={handleGrafikExcelCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0"
          style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
        >
          {excelCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Download className="w-3.5 h-3.5" />}
          {excelCopied ? "Kopyalandı!" : "Excel'e Kopyala"}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4 max-w-5xl w-full">

      {activeChart === "kisi" && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">En Çok Oyuna Katılan 25 Kişi</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Çubuğa tıklayarak personel dağılımına gidin</p>
          </div>
          <ResponsiveContainer width="100%" height={560}>
            <BarChart
              data={topKisi}
              layout="vertical"
              margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
              onClick={handleKisiClick}
              style={{ cursor: "pointer" }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={190}
                tick={{ fontSize: 10, fontFamily: "inherit", fill: "hsl(var(--foreground))" }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="value" name="oyun sayısı" radius={[0, 5, 5, 0]}>
                {topKisi.map((_, i) => (
                  <Cell key={i} fill={RICH_PALETTE[i % RICH_PALETTE.length]} opacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeChart === "oyun" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">Oyun Kadroları</h3>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setOyunSubTab("buyuk")}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={oyunSubTab === "buyuk"
                  ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                  : { color: "hsl(var(--muted-foreground))" }}
              >
                En Büyük 20
              </button>
              <button
                onClick={() => setOyunSubTab("kucuk")}
                className="px-3 py-1.5 text-xs font-semibold transition-colors border-l border-border"
                style={oyunSubTab === "kucuk"
                  ? { background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }
                  : { color: "hsl(var(--muted-foreground))" }}
              >
                En Küçük 20
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Tıklayarak oyuna gidin</p>
          </div>

          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={oyunSubTab === "buyuk" ? oyunBuyuk : oyunKucuk}
              layout="vertical"
              margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
              onClick={handleOyunClick}
              style={{ cursor: "pointer" }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={210}
                tick={{ fontSize: 9, fontFamily: "inherit", fill: "hsl(var(--foreground))" }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="value" name="kişi sayısı" radius={[0, 5, 5, 0]}>
                {(oyunSubTab === "buyuk" ? oyunBuyuk : oyunKucuk).map((_, i) => (
                  <Cell key={i} fill={RICH_PALETTE[i % RICH_PALETTE.length]} opacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeChart === "kategori" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-foreground">Kategori Dağılımı</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Kategoriye tıklayarak o kategorideki kişileri görün</p>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-w-0">
              <div className="w-full lg:w-[320px] h-[300px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={kategoriData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      paddingAngle={1}
                      activeIndex={activePieIndex}
                      activeShape={ActivePieShape}
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onClick={(_, index) => setActivePieIndex(index)}
                      style={{ cursor: "pointer" }}
                    >
                      {kategoriData.map((_, i) => (
                        <Cell key={i} fill={RICH_PALETTE[i % RICH_PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1 w-full">
                {kategoriData.map((item, i) => (
                  <button
                    key={item.name}
                    onClick={() => setActivePieIndex(i)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all border ${
                      activePieIndex === i ? "border-border bg-muted/50 shadow-sm" : "border-transparent hover:bg-muted/30"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: RICH_PALETTE[i % RICH_PALETTE.length] }} />
                    <span className="text-[11px] text-foreground truncate flex-1">{item.name}</span>
                    <span className="text-[11px] font-bold shrink-0 tabular-nums" style={{ color: RICH_PALETTE[i % RICH_PALETTE.length] }}>
                      {item.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {kategoriPersons.length > 0 && (
              <div className="w-full xl:w-[300px] shrink-0 border border-border rounded-xl p-4 bg-muted/10">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: RICH_PALETTE[activePieIndex % RICH_PALETTE.length] }}
                  />
                  <h4 className="text-xs font-bold text-foreground">
                    {kategoriData[activePieIndex]?.name}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">{kategoriPersons.length} kişi</span>
                  <button
                    onClick={handleKatCopy}
                    title="Listeyi kopyala"
                    className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors"
                    style={{ color: katCopied ? "hsl(142 70% 38%)" : "hsl(var(--muted-foreground))" }}
                  >
                    {katCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-1">
                  {kategoriPersons.map(({ name, roles }) => (
                    <button
                      key={name}
                      onClick={() => navigate(`/dagilim?kisi=${encodeURIComponent(name)}&from=grafik`)}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-left transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground whitespace-nowrap truncate group-hover:text-primary transition-colors">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{roles.join(", ")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
