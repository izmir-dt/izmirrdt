import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, FolderOpen, Plus, Trash2, X, CheckCircle2, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Theater, Users, Baby,
} from "lucide-react";
import { parsePlayRows, isChildPlay, categoryColor, groupByPlay, trLower } from "@/lib/theater";

type SheetData = { headers: string[]; rows: any[][] };

const SHEET = "ARŞİV OYUNLAR";

export default function ArsivOyunlarPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addActive, setAddActive] = useState(false);
  const [addValues, setAddValues] = useState(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useQuery<SheetData>({
    queryKey: ["/api/sheets", SHEET],
    staleTime: 30_000,
  });

  const rawRows = data?.rows ?? [];
  const headers = data?.headers ?? ["Oyun Adı", "Kategori", "Görev", "Kişi"];

  const rows = useMemo(() => {
    if (!data) return [];
    return parsePlayRows(data.headers, data.rows);
  }, [data]);

  const plays = useMemo(() => groupByPlay(rows), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return plays;
    const lower = trLower(search.trim());
    return plays.filter((p) =>
      trLower(p.name).includes(lower) ||
      rows.filter(r => r.oyun === p.name).some(r =>
        trLower(r.kisi).includes(lower) || trLower(r.gorev).includes(lower)
      )
    );
  }, [plays, rows, search]);

  const addMutation = useMutation({
    mutationFn: (values: string[]) =>
      apiRequest("POST", `/api/sheets/${encodeURIComponent(SHEET)}/row`, { values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", SHEET] });
      setAddActive(false);
      setAddValues(["", "", "", ""]);
      toast({ title: "Kayıt eklendi" });
    },
    onError: () => toast({ title: "Hata", description: "Kayıt eklenemedi", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (rowIndex: number) =>
      apiRequest("DELETE", `/api/sheets/${encodeURIComponent(SHEET)}/row/${rowIndex}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", SHEET] });
      setDeleteConfirm(null);
      toast({ title: "Kayıt silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Kayıt silinemedi", variant: "destructive" }),
  });

  const handleAddSave = useCallback(() => {
    if (!addValues.some((v) => v.trim())) { setAddActive(false); return; }
    addMutation.mutate(addValues);
  }, [addValues, addMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, colIdx: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const next = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (next >= 0 && next < 4) inputRefs.current[next]?.focus();
      else if (next >= 4) handleAddSave();
    }
    if (e.key === "Enter") {
      if (colIdx < 3) inputRefs.current[colIdx + 1]?.focus();
      else handleAddSave();
    }
    if (e.key === "Escape") setAddActive(false);
  }, [handleAddSave]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 max-w-4xl">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const ADD_HEADERS = ["Oyun Adı", "Kategori", "Görev", "Kişi"];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ background: "hsl(var(--card))" }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary))" }} />
          <div>
            <h1 className="font-bold text-[14px] text-foreground">Arşiv Oyunlar</h1>
            <p className="text-[11px] text-muted-foreground">{plays.length} oyun · {rawRows.length} kayıt</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["/api/sheets", SHEET] })}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setAddValues(["", "", "", ""]);
              setAddActive(true);
              setTimeout(() => inputRefs.current[0]?.focus(), 50);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
            style={{ background: "hsl(var(--sidebar))" }}
          >
            <Plus className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-primary))" }} />
            Kayıt Ekle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 py-2 border-b border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Oyun, kişi, görev ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-7 h-8 text-[12px]"
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Add row form */}
      {addActive && (
        <div
          className="shrink-0 px-4 py-3 border-b-2 border-primary/30"
          style={{ background: "hsl(var(--primary) / 0.04)" }}
        >
          <p className="text-[11px] font-semibold text-primary mb-2 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Yeni Kayıt Ekle
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ADD_HEADERS.map((label, colIdx) => (
              <div key={colIdx}>
                <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
                <input
                  ref={(el) => { inputRefs.current[colIdx] = el; }}
                  value={addValues[colIdx]}
                  onChange={(e) => {
                    const next = [...addValues];
                    next[colIdx] = e.target.value;
                    setAddValues(next);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, colIdx)}
                  placeholder={label}
                  disabled={addMutation.isPending}
                  className="w-full h-8 px-2 rounded-md border border-primary/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddSave}
              disabled={addMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "hsl(var(--sidebar))" }}
            >
              {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Kaydet
            </button>
            <button onClick={() => setAddActive(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border hover:bg-muted transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FolderOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">{search ? "Arama sonucu bulunamadı" : "Arşiv boş"}</p>
            {!search && <p className="text-xs">Kayıt eklemek için "Kayıt Ekle" butonunu kullanın</p>}
          </div>
        )}

        {filtered.map((play) => {
          const isOpen = expanded === play.name;
          const playRows = rows.filter(r => r.oyun === play.name);
          const child = isChildPlay(play.name);

          return (
            <div
              key={play.name}
              className="rounded-xl border border-border overflow-hidden"
              style={{ background: "hsl(var(--card))" }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : play.name)}
                >
                  <Theater className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13px] text-foreground">{play.name}</span>
                      {child && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-chart-4 bg-chart-4/10 px-1.5 py-0.5 rounded">
                          <Baby className="w-2.5 h-2.5" />Ç.O
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />{play.personelCount} kişi
                      </span>
                      <span>{play.rowCount} kayıt</span>
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="w-10 px-3 py-2 text-left text-[10px] text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Kişi</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Görev</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Kategori</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {playRows.map((row, i) => {
                        const realIdx = rawRows.findIndex(
                          (rr) => String(rr[0]) === row.oyun && String(rr[2]) === row.gorev && String(rr[3]) === row.kisi
                        );
                        const isDeleteConf = deleteConfirm === realIdx;
                        return (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/20 group transition-colors">
                            <td className="px-3 py-2 text-muted-foreground/50">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-foreground">{row.kisi}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.gorev}</td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${categoryColor(row.kategori)}`}>
                                {row.kategori}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {isDeleteConf ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => deleteMutation.mutate(realIdx)}
                                    disabled={deleteMutation.isPending}
                                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-60"
                                  >
                                    {deleteMutation.isPending ? "…" : "Sil"}
                                  </button>
                                  <button onClick={() => setDeleteConfirm(null)}
                                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(realIdx)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-100 hover:text-red-600 transition-all text-muted-foreground"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
