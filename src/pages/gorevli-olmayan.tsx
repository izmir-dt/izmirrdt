import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserMinus, Plus, Trash2, X, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { trLower } from "@/lib/theater";

type SheetData = { headers: string[]; rows: any[][] };

const SHEET = "GÖREVLİ OLMAYAN";
const DEFAULT_HEADERS = ["Kişi", "Kategori", "Başlangıç", "Bitiş", "Açıklama"];

export default function GorevliOlmayanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [addActive, setAddActive] = useState(false);
  const [addValues, setAddValues] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data, isLoading, isFetching } = useQuery<SheetData>({
    queryKey: ["/api/sheets", SHEET],
    staleTime: 30_000,
  });

  const headers = (data?.headers?.length ? data.headers : DEFAULT_HEADERS);
  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const lower = trLower(search.trim());
    return rows.filter((row) =>
      row.some((cell: any) => trLower(String(cell ?? "")).includes(lower))
    );
  }, [rows, search]);

  const addMutation = useMutation({
    mutationFn: (values: string[]) =>
      apiRequest("POST", `/api/sheets/${encodeURIComponent(SHEET)}/row`, { values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", SHEET] });
      setAddActive(false);
      setAddValues(headers.map(() => ""));
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

  const handleAddStart = useCallback(() => {
    setAddValues(headers.map(() => ""));
    setAddActive(true);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }, [headers]);

  const handleAddSave = useCallback(async () => {
    if (!addValues.some((v) => v.trim())) { setAddActive(false); return; }
    const isNewSheet = !data?.headers?.length;
    if (isNewSheet) {
      try {
        await apiRequest("POST", `/api/sheets/${encodeURIComponent(SHEET)}/row`, { values: DEFAULT_HEADERS });
      } catch {}
    }
    addMutation.mutate(addValues);
  }, [addValues, addMutation, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, colIdx: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const next = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (next >= 0 && next < headers.length) inputRefs.current[next]?.focus();
      else if (next >= headers.length) handleAddSave();
    }
    if (e.key === "Enter") {
      if (colIdx < headers.length - 1) inputRefs.current[colIdx + 1]?.focus();
      else handleAddSave();
    }
    if (e.key === "Escape") { setAddActive(false); }
  }, [headers, handleAddSave]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 max-w-3xl">
        <Skeleton className="h-9 w-full rounded-lg" />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ background: "hsl(var(--card))" }}
      >
        <div className="flex items-center gap-2">
          <UserMinus className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary))" }} />
          <div>
            <h1 className="font-bold text-[14px] text-foreground">Müsait Personel</h1>
            <p className="text-[11px] text-muted-foreground">{rows.length} kayıt</p>
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
            onClick={handleAddStart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
            style={{ background: "hsl(var(--sidebar))" }}
          >
            <Plus className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-primary))" }} />
            Kişi Ekle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 py-2 border-b border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Ara…"
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {headers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <UserMinus className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Henüz veri yok</p>
            <p className="text-xs">Kişi eklemek için "Kişi Ekle" butonunu kullanın</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "hsl(var(--sidebar))" }}>
                <th className="w-10 px-3 py-2.5 text-left text-[10px] font-bold tracking-wide text-muted-foreground">#</th>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-[10px] font-bold tracking-wide" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>
                    {h}
                  </th>
                ))}
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {/* Add row */}
              {addActive && (
                <tr className="border-b-2 border-primary/30 bg-primary/5">
                  <td className="px-3 py-2">
                    {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Plus className="w-3 h-3 text-primary" />}
                  </td>
                  {headers.map((h, colIdx) => (
                    <td key={colIdx} className="px-2 py-1.5">
                      <input
                        ref={(el) => { inputRefs.current[colIdx] = el; }}
                        value={addValues[colIdx] ?? ""}
                        onChange={(e) => {
                          const next = [...addValues];
                          next[colIdx] = e.target.value;
                          setAddValues(next);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, colIdx)}
                        placeholder={h}
                        disabled={addMutation.isPending}
                        className="w-full min-w-[100px] h-8 px-2 rounded-md border border-primary/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={handleAddSave} disabled={addMutation.isPending}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setAddActive(false)}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.length === 0 && !addActive && (
                <tr>
                  <td colSpan={headers.length + 2} className="py-16 text-center text-muted-foreground text-sm">
                    {search ? "Arama sonucu bulunamadı" : "Henüz kayıt yok"}
                  </td>
                </tr>
              )}

              {filtered.map((row, displayIdx) => {
                const realIdx = rows.indexOf(row);
                const isDeleteConfirm = deleteConfirm === realIdx;
                return (
                  <tr
                    key={realIdx}
                    className="border-b border-border/40 hover:bg-muted/20 group transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground/50">{realIdx + 1}</td>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-3 py-2.5 text-[13px] text-foreground">
                        {String(row[colIdx] ?? "")}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      {isDeleteConfirm ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => deleteMutation.mutate(realIdx)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-60"
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
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
