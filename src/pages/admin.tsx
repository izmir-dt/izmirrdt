import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Sheet,
  Rows3,
  TableIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  Copy,
  ClipboardPaste,
  Archive,
} from "lucide-react";

const ROWS_PER_PAGE = 50;

type SheetData = { headers: string[]; rows: any[][] };

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

function CellEditor({ value, onSave, onCancel, isPending, autoFocus }: {
  value: string; onSave: (v: string) => void; onCancel: () => void; isPending: boolean; autoFocus?: boolean;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex items-center gap-1 min-w-[120px]">
      <Input
        data-testid="input-cell-edit"
        autoFocus={autoFocus}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm py-0 border-primary ring-1 ring-primary/30"
        disabled={isPending}
      />
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={() => onSave(val)} className="h-7 w-7 shrink-0 text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onCancel} className="h-7 w-7 shrink-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

function AutocompleteInput({
  value,
  onChange,
  onKeyDown,
  onPickSuggestion,
  suggestions,
  placeholder,
  disabled,
  inputRef,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPickSuggestion: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  disabled: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const filtered = useMemo(() => {
    if (suggestions.length === 0) return [];
    if (!value.trim()) return suggestions.slice(0, 10);
    const lower = value.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(lower) && s !== value).slice(0, 10);
  }, [value, suggestions]);

  useEffect(() => { setHighlighted(0); }, [filtered]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (open && filtered.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); return; }
      if (e.key === "Enter" && filtered[highlighted]) { e.preventDefault(); onPickSuggestion(filtered[highlighted]); setOpen(false); return; }
      if (e.key === "Escape") { setOpen(false); }
    }
    onKeyDown(e);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        data-testid={testId}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={handleKey}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full min-w-[80px] h-8 px-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 min-w-[180px] max-w-[280px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-[260px] overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(s); setOpen(false); }}
              className="w-full text-left px-2.5 py-2 text-[12px] truncate transition-colors"
              style={i === highlighted ? { background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))" } : { color: "hsl(var(--foreground))" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineAddRow({ headers, onAdd, isPending, label, columnSuggestions }: {
  headers: string[]; onAdd: (values: string[]) => void; isPending: boolean; label?: string; columnSuggestions?: string[][];
}) {
  const [active, setActive] = useState(false);
  const [values, setValues] = useState<string[]>(() => headers.map(() => ""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setValues(headers.map(() => "")); }, [headers]);

  const handleSave = useCallback(() => {
    const hasContent = values.some((v) => v.trim() !== "");
    if (!hasContent) { setActive(false); return; }
    onAdd(values);
  }, [values, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, colIdx: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const next = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (next >= 0 && next < headers.length) inputRefs.current[next]?.focus();
      else if (next >= headers.length) handleSave();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (colIdx < headers.length - 1) inputRefs.current[colIdx + 1]?.focus();
      else handleSave();
    }
    if (e.key === "Escape") { setActive(false); setValues(headers.map(() => "")); }
  }, [headers, handleSave]);

  useEffect(() => {
    if (isPending === false && active) { setValues(headers.map(() => "")); setActive(false); }
  }, [isPending]);

  if (!active) {
    return (
      <tr
        className="border-t-2 border-dashed border-border/60 hover:bg-primary/5 cursor-pointer group transition-colors"
        onClick={() => { setActive(true); setTimeout(() => inputRefs.current[0]?.focus(), 50); }}
        data-testid="row-inline-add"
      >
        <td className="px-3 py-2.5 text-muted-foreground/40"><Plus className="w-3.5 h-3.5" /></td>
        <td colSpan={headers.length} className="px-3 py-2.5 text-sm text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
          {label || "Yeni satır eklemek için tıklayın..."}
        </td>
        <td /><td />
      </tr>
    );
  }

  return (
    <tr className="border-t-2 border-primary/30 bg-primary/5" data-testid="row-inline-active">
      <td className="px-3 py-2 text-muted-foreground/40 text-xs">
        {isPending ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Plus className="w-3 h-3 text-primary" />}
      </td>
      {headers.map((h, colIdx) => {
        const suggs = columnSuggestions?.[colIdx] || [];
        return (
          <td key={colIdx} className="px-2 py-1.5">
            {suggs.length > 0 ? (
              <AutocompleteInput
                value={values[colIdx]}
                onChange={(v) => { const next = [...values]; next[colIdx] = v; setValues(next); }}
                onKeyDown={(e) => handleKeyDown(e, colIdx)}
                onPickSuggestion={(v) => {
                  const next = [...values]; next[colIdx] = v; setValues(next);
                  setTimeout(() => {
                    if (colIdx < headers.length - 1) inputRefs.current[colIdx + 1]?.focus();
                  }, 50);
                }}
                suggestions={suggs}
                placeholder={h}
                disabled={isPending}
                inputRef={(el) => { inputRefs.current[colIdx] = el; }}
                testId={`input-inline-${colIdx}`}
              />
            ) : (
              <input
                ref={(el) => { inputRefs.current[colIdx] = el; }}
                data-testid={`input-inline-${colIdx}`}
                value={values[colIdx]}
                onChange={(e) => { const next = [...values]; next[colIdx] = e.target.value; setValues(next); }}
                onKeyDown={(e) => handleKeyDown(e, colIdx)}
                placeholder={h}
                disabled={isPending}
                className="w-full min-w-[80px] h-8 px-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
              />
            )}
          </td>
        );
      })}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={isPending} data-testid="button-inline-save"
            className="h-8 w-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setActive(false); setValues(headers.map(() => "")); }}
            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td />
    </tr>
  );
}

function InsertBetweenRow({ headers, onInsert, isPending }: {
  headers: string[]; onInsert: (values: string[]) => void; isPending: boolean;
}) {
  const [active, setActive] = useState(false);
  const [values, setValues] = useState<string[]>(() => headers.map(() => ""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setValues(headers.map(() => "")); }, [headers]);

  const handleSave = useCallback(() => {
    const hasContent = values.some((v) => v.trim() !== "");
    if (!hasContent) { setActive(false); return; }
    onInsert(values);
  }, [values, onInsert]);

  useEffect(() => {
    if (isPending === false && active) { setValues(headers.map(() => "")); setActive(false); }
  }, [isPending]);

  if (!active) {
    return (
      <tr className="h-0 group/insert">
        <td colSpan={headers.length + 3} className="p-0">
          <div className="flex items-center gap-0 opacity-0 group-hover/insert:opacity-100 transition-opacity h-0 hover:h-auto overflow-hidden">
            <button
              onClick={() => { setActive(true); setTimeout(() => inputRefs.current[0]?.focus(), 50); }}
              className="flex items-center gap-1 mx-3 my-0.5 px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" /> Buraya satır ekle
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-y-2 border-primary/40 bg-primary/5" data-testid="row-insert-between">
      <td className="px-3 py-2 text-xs text-primary font-semibold">
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
      </td>
      {headers.map((h, colIdx) => (
        <td key={colIdx} className="px-2 py-1.5">
          <input
            ref={(el) => { inputRefs.current[colIdx] = el; }}
            value={values[colIdx]}
            onChange={(e) => { const next = [...values]; next[colIdx] = e.target.value; setValues(next); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (colIdx < headers.length - 1) inputRefs.current[colIdx + 1]?.focus();
                else handleSave();
              }
              if (e.key === "Escape") { setActive(false); setValues(headers.map(() => "")); }
            }}
            placeholder={h}
            disabled={isPending}
            className="w-full min-w-[80px] h-8 px-2 rounded-md border border-primary/40 bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60"
          />
        </td>
      ))}
      <td className="px-2 py-1.5">
        <button onClick={handleSave} disabled={isPending}
          className="h-8 w-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </td>
      <td>
        <button onClick={() => { setActive(false); setValues(headers.map(() => "")); }}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

const LEGACY_SHEET = (name: string) =>
  name.startsWith("__") ||
  name.startsWith("_SNAPSHOT") ||
  name === "LOG" ||
  name === "Log" ||
  name === "Snapshot" ||
  name === "BİLDİRİMLER_ARŞİV" ||
  name === "BİLDİRİMLER";

const PINNED_SHEETS = ["GÖREVLİ OLMAYAN", "ARŞİV OYUNLAR"];
const PLAY_BASED_SHEETS = ["BÜTÜN OYUNLAR"];

export default function AdminPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeSheet, setActiveSheet] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [currentPlayIdx, setCurrentPlayIdx] = useState(0);
  const [editCell, setEditCell] = useState<{ row: number; col: number } | null>(null);
  const [deleteRow, setDeleteRow] = useState<number | null>(null);
  const [insertAfterRow, setInsertAfterRow] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [copiedRows, setCopiedRows] = useState<string[][]>([]);
  const [archiveConfirmPlay, setArchiveConfirmPlay] = useState<string | null>(null);
  const [lastPlayWarning, setLastPlayWarning] = useState<{ personName: string; playName: string } | null>(null);
  const [newPlayDialogOpen, setNewPlayDialogOpen] = useState(false);
  const [newPlayName, setNewPlayName] = useState("");

  const isPlayBased = PLAY_BASED_SHEETS.includes(activeSheet);

  const { data: sheetsData, isLoading: sheetsLoading } = useQuery<{ sheets: string[] }>({
    queryKey: ["/api/sheets"],
  });

  const apiSheets = sheetsData?.sheets || [];
  const visibleApiSheets = apiSheets.filter(s => !LEGACY_SHEET(s));
  const extraPinned = PINNED_SHEETS.filter(s => !visibleApiSheets.includes(s));
  const visibleSheets = [...visibleApiSheets, ...extraPinned];

  useEffect(() => {
    if (visibleSheets.length && !activeSheet) {
      const main = visibleSheets.find(s => !PINNED_SHEETS.includes(s));
      setActiveSheet(main || visibleSheets[0]);
    }
  }, [sheetsData, activeSheet]);

  const { data: sheetData, isLoading: dataLoading, isFetching, refetch, isError: dataError } = useQuery<SheetData>({
    queryKey: ["/api/sheets", activeSheet],
    enabled: !!activeSheet && !sheetsLoading,
    retry: false,
  });

  const updateCellMutation = useMutation({
    mutationFn: ({ row, col, value }: { row: number; col: number; value: string }) =>
      apiRequest("PUT", `/api/sheets/${encodeURIComponent(activeSheet)}/cell`, { row, col, value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sheets", activeSheet] }); setEditCell(null); toast({ title: "Hücre güncellendi" }); },
    onError: () => toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" }),
  });

  const addRowMutation = useMutation({
    mutationFn: (values: string[]) =>
      apiRequest("POST", `/api/sheets/${encodeURIComponent(activeSheet)}/row`, { values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sheets", activeSheet] }); toast({ title: "✓ Satır eklendi" }); },
    onError: () => toast({ title: "Hata", description: "Ekleme başarısız", variant: "destructive" }),
  });

  const insertRowMutation = useMutation({
    mutationFn: ({ afterRow, values }: { afterRow: number; values: string[] }) =>
      apiRequest("POST", `/api/sheets/${encodeURIComponent(activeSheet)}/row/insert`, { afterRow, values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", activeSheet] });
      setInsertAfterRow(null);
      toast({ title: "✓ Satır eklendi", description: "Seçilen satırın altına eklendi" });
    },
    onError: () => toast({ title: "Hata", description: "Ekleme başarısız", variant: "destructive" }),
  });

  const deleteRowMutation = useMutation({
    mutationFn: (rowIndex: number) => {
      if (activeSheet === "BÜTÜN OYUNLAR" && sheetData) {
        const kisiIdx = sheetData.headers.findIndex(h => h.trim().toLowerCase() === "kişi");
        const oyunIdx = sheetData.headers.findIndex(h => h.trim().toLowerCase().includes("oyun"));
        if (kisiIdx >= 0) {
          const row = sheetData.rows[rowIndex];
          const personName = String(row?.[kisiIdx] ?? "").trim();
          const playName = oyunIdx >= 0 ? String(row?.[oyunIdx] ?? "").trim() : "";
          const count = sheetData.rows.filter(r => String(r[kisiIdx] ?? "").trim().toLowerCase() === personName.toLowerCase()).length;
          if (personName && count === 1) {
            (deleteRowMutation as any)._lastPlayInfo = { personName, playName };
          } else {
            (deleteRowMutation as any)._lastPlayInfo = null;
          }
        }
      }
      return apiRequest("DELETE", `/api/sheets/${encodeURIComponent(activeSheet)}/row/${rowIndex}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", activeSheet] });
      setDeleteRow(null);
      toast({ title: "Satır silindi" });
      const info = (deleteRowMutation as any)._lastPlayInfo;
      if (info) {
        setLastPlayWarning(info);
        (deleteRowMutation as any)._lastPlayInfo = null;
      }
    },
    onError: () => toast({ title: "Hata", description: "Silme başarısız", variant: "destructive" }),
  });

  const archivePlayMutation = useMutation({
    mutationFn: (playName: string) =>
      apiRequest("POST", `/api/archive-play`, { playName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", activeSheet] });
      qc.invalidateQueries({ queryKey: ["/api/sheets", "ARŞİV OYUNLAR"] });
      setArchiveConfirmPlay(null);
      setCurrentPlayIdx(0);
      toast({ title: "Oyun arşivlendi", description: "Oyun başarıyla ARŞİV OYUNLAR sayfasına taşındı." });
    },
    onError: () => toast({ title: "Hata", description: "Arşivleme başarısız", variant: "destructive" }),
  });

  const syncFiguranMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sync-figuran", {}),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", "FİGÜRAN LİSTESİ"] });
      const added = data?.added ?? 0;
      toast({
        title: added > 0 ? `${added} figüran eklendi` : "Liste güncel",
        description: added > 0 ? "Figüranlar FİGÜRAN LİSTESİ'ne eklendi." : "Tüm figüranlar zaten listede.",
      });
    },
    onError: () => toast({ title: "Hata", description: "Senkronizasyon başarısız", variant: "destructive" }),
  });

  const columnSuggestions = useMemo((): string[][] | undefined => {
    if (!isPlayBased || !sheetData) return undefined;
    const rows = sheetData.rows;
    const unique = (fn: (r: any[]) => string) =>
      Array.from(new Set(rows.map(fn).flatMap(v => v.split(",").map(s => s.trim())).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
    return [
      unique((r) => String(r[0] ?? "")),
      unique((r) => String(r[1] ?? "")),
      unique((r) => String(r[2] ?? "")),
      unique((r) => String(r[3] ?? "")),
    ];
  }, [isPlayBased, sheetData]);

  const filteredRows = useMemo(() => {
    if (!sheetData) return [];
    if (!search.trim()) return sheetData.rows;
    const lower = search.toLowerCase();
    return sheetData.rows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(lower))
    );
  }, [sheetData, search]);

  const playGroups = useMemo(() => {
    if (!isPlayBased || !sheetData) return null;
    const map = new Map<string, typeof sheetData.rows>();
    sheetData.rows.forEach((row) => {
      const play = String(row[0] ?? "").trim();
      if (!map.has(play)) map.set(play, []);
      map.get(play)!.push(row);
    });
    return Array.from(map.entries())
      .map(([name, rows]) => ({ name, rows }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [sheetData, isPlayBased]);

  const playNames = playGroups?.map((g) => g.name) || [];

  const pagedRows = useMemo(() => {
    if (isPlayBased && playGroups) {
      if (search.trim()) return filteredRows;
      const group = playGroups[currentPlayIdx];
      return group ? group.rows : [];
    }
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    return filteredRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  }, [isPlayBased, playGroups, currentPlayIdx, filteredRows, page, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));

  useEffect(() => { setPage(1); setEditCell(null); setCurrentPlayIdx(0); setSelectedRows(new Set()); }, [search, activeSheet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "c" && selectedRows.size > 0 && sheetData) {
        const sorted = Array.from(selectedRows).sort((a, b) => a - b);
        const data = sorted.map(idx => sheetData.rows[idx].map(String));
        setCopiedRows(data);
        const tsv = data.map(r => r.join("\t")).join("\n");
        navigator.clipboard.writeText(tsv).catch(() => {});
        toast({ title: `${data.length} satır kopyalandı` });
      }
      if (ctrl && e.key === "v" && copiedRows.length > 0) {
        copiedRows.forEach(row => addRowMutation.mutate(row));
        toast({ title: `${copiedRows.length} satır yapıştırıldı`, description: "Sayfanın sonuna eklendi" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedRows, copiedRows, sheetData]);

  const sheetExistsInApi = !activeSheet || apiSheets.includes(activeSheet) || PINNED_SHEETS.includes(activeSheet);
  const sheetNotFound = dataError || (sheetData !== undefined && sheetData.headers.length === 0 && sheetData.rows.length === 0 && !apiSheets.includes(activeSheet) && PINNED_SHEETS.includes(activeSheet));
  const rawHeaders = sheetData?.headers || [];
  const headers = isPlayBased ? rawHeaders.slice(0, 4) : rawHeaders;
  const totalRows = sheetData?.rows?.length || 0;

  const currentPlayName = isPlayBased && playGroups ? (playGroups[currentPlayIdx]?.name || "") : "";

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h,120px))] overflow-hidden">
      {isFetching && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-primary/10">
          <div className="h-full bg-primary w-3/5 animate-pulse" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-border bg-card/60 backdrop-blur shrink-0">
        <div className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide">
          {activeSheet || "—"}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-36 sm:w-52 text-sm"
          />
          {search && (
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => refetch()} data-testid="button-refresh" title="Yenile">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>

        {isPlayBased && playGroups && !search && (
          <div className="flex items-center gap-1.5 ml-2">
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => setCurrentPlayIdx(i => Math.max(0, i - 1))}
              disabled={currentPlayIdx <= 0}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <select
              value={currentPlayIdx}
              onChange={(e) => setCurrentPlayIdx(Number(e.target.value))}
              className="h-7 text-xs border border-border rounded-md bg-card px-2 text-foreground max-w-[200px]"
            >
              {playNames.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => setCurrentPlayIdx(i => Math.min(playNames.length - 1, i + 1))}
              disabled={currentPlayIdx >= playNames.length - 1}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPlayIdx + 1}/{playNames.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10 ml-1"
              onClick={() => { setNewPlayName(""); setNewPlayDialogOpen(true); }}
              data-testid="button-new-play-toolbar"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Oyun
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {selectedRows.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground px-2 py-1 bg-primary/10 rounded-md">
                {selectedRows.size} satır seçili
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Kopyala (Ctrl+C)"
                onClick={() => {
                  if (!sheetData) return;
                  const sorted = Array.from(selectedRows).sort((a, b) => a - b);
                  const data = sorted.map(idx => sheetData.rows[idx].map(String));
                  setCopiedRows(data);
                  const tsv = data.map(r => r.join("\t")).join("\n");
                  navigator.clipboard.writeText(tsv).catch(() => {});
                  toast({ title: `${data.length} satır kopyalandı` });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </>
          )}
          {copiedRows.length > 0 && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" title={`Yapıştır (Ctrl+V) — ${copiedRows.length} satır`}
              onClick={() => {
                copiedRows.forEach(row => addRowMutation.mutate(row));
                toast({ title: `${copiedRows.length} satır yapıştırıldı`, description: "Sayfanın sonuna eklendi" });
              }}
            >
              <ClipboardPaste className="w-4 h-4" />
            </Button>
          )}
          {activeSheet === "FİGÜRAN LİSTESİ" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/20"
              onClick={() => syncFiguranMutation.mutate()}
              disabled={syncFiguranMutation.isPending}
              data-testid="button-sync-figuran"
              title="BÜTÜN OYUNLAR'daki tüm figüranları bu listeye ekle"
            >
              {syncFiguranMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Figüranları Güncelle
            </Button>
          )}
          {activeSheet && sheetExistsInApi && (
            <div className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md hidden sm:flex items-center gap-1.5">
              <span>Tab / Enter ile hücre atla</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-3 shrink-0">
        <StatCard icon={TableIcon} label="Toplam Sayfa"   value={sheetsLoading ? "—" : visibleSheets.length} color="bg-primary/10 text-primary" />
        <StatCard icon={Rows3}    label="Toplam Satır"   value={dataLoading   ? "—" : totalRows}           color="bg-chart-2/10 text-chart-2" />
        <StatCard icon={Sheet}    label="Sütun Sayısı"   value={dataLoading   ? "—" : headers.length}      color="bg-chart-3/10 text-chart-3" />
        <StatCard icon={Search}   label="Gösterilen"     value={dataLoading   ? "—" : pagedRows.length}    color="bg-chart-5/10 text-chart-5" />
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4 min-h-0">
        <div className="bg-card border border-card-border rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
          {isPlayBased && currentPlayName && !search && (
            <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-foreground">{currentPlayName}</span>
              <span className="text-[10px] text-muted-foreground">— {pagedRows.length} satır</span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 px-2 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => { setNewPlayName(""); setNewPlayDialogOpen(true); }}
                  data-testid="button-new-play"
                >
                  <Plus className="w-3 h-3" />
                  Yeni Oyun Ekle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 px-2 border-amber-600/40 text-amber-600 hover:bg-amber-600/10"
                  onClick={() => setArchiveConfirmPlay(currentPlayName)}
                  data-testid="button-archive-play"
                >
                  <Archive className="w-3 h-3" />
                  Arşive Taşı
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            {sheetNotFound ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3 px-6 text-center">
                <FolderOpen className="w-8 h-8 opacity-30" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeSheet}</p>
                  <p className="text-xs text-muted-foreground mt-1">Bu sayfa Google Sheets'te henüz oluşturulmamış.<br />İlk satırı ekleyerek otomatik oluşturulacak.</p>
                </div>
                <button
                  onClick={() => {
                    const defaults: Record<string, string[]> = {
                      "GÖREVLİ OLMAYAN": ["Kişi", "Kategori", "Başlangıç", "Bitiş", "Açıklama"],
                      "ARŞİV OYUNLAR": ["Oyun Adı", "Kategori", "Görev", "Kişi"],
                    };
                    const hdrs = defaults[activeSheet] || ["Sütun 1", "Sütun 2", "Sütun 3"];
                    addRowMutation.mutate(hdrs);
                  }}
                  disabled={addRowMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: "hsl(var(--sidebar))" }}
                >
                  {addRowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary))" }} />}
                  Sayfayı Oluştur ve Başlık Ekle
                </button>
              </div>
            ) : dataLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                {[1,2,3,4,5,6,7].map(i => (
                  <Skeleton key={i} className="h-11 w-full rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
                ))}
              </div>
            ) : headers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <TableIcon className="w-7 h-7 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Sayfa seçin</p>
                  <p className="text-xs text-muted-foreground mt-1">Aşağıdan bir Google Sheets sayfası seçin</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "hsl(var(--muted))", backdropFilter: "blur(4px)" }}>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 border-b border-border">#</th>
                    {headers.map((header, i) => (
                      <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-b border-border" data-testid={`header-${i}`}>
                        {header}
                      </th>
                    ))}
                    <th className="px-3 py-3 w-10 border-b border-border" />
                    <th className="px-3 py-3 w-10 border-b border-border" />
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 3} className="text-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <p className="text-sm">Sonuç bulunamadı</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, relativeIdx) => {
                      const realRowIdx = sheetData!.rows.indexOf(row);
                      const isInsertingAfterThis = insertAfterRow === realRowIdx;
                      const isInsertingBefore = insertAfterRow === realRowIdx - 1;
                      const isSelected = selectedRows.has(realRowIdx);
                      return [
                        isInsertingBefore && (
                          <InsertBetweenRow
                            key={`insert-above-${realRowIdx}`}
                            headers={headers}
                            isPending={insertRowMutation.isPending}
                            onInsert={(values) => insertRowMutation.mutate({ afterRow: realRowIdx - 1, values })}
                          />
                        ),
                        <tr
                          key={`row-${realRowIdx}`}
                          className={`border-b border-border/40 hover:bg-muted/30 group transition-colors ${isSelected ? "bg-primary/10 hover:bg-primary/15" : relativeIdx % 2 !== 0 ? "bg-muted/20" : ""}`}
                          data-testid={`row-data-${relativeIdx}`}
                        >
                          <td
                            className="px-3 py-2 text-muted-foreground/50 text-[11px] font-mono tabular-nums select-none cursor-pointer group/num relative"
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                setSelectedRows(prev => {
                                  const next = new Set(prev);
                                  if (next.has(realRowIdx)) next.delete(realRowIdx);
                                  else next.add(realRowIdx);
                                  return next;
                                });
                              } else if (e.shiftKey && selectedRows.size > 0) {
                                const lastSelected = Math.max(...Array.from(selectedRows));
                                const min = Math.min(lastSelected, realRowIdx);
                                const max = Math.max(lastSelected, realRowIdx);
                                setSelectedRows(new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i)));
                              } else {
                                setSelectedRows(isSelected && selectedRows.size === 1 ? new Set() : new Set([realRowIdx]));
                              }
                            }}
                          >
                            <div className="flex flex-col gap-0.5 items-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setInsertAfterRow(isInsertingBefore ? null : realRowIdx - 1); }}
                                title="Üstüne satır ekle"
                                className="opacity-0 group-hover/num:opacity-100 transition-opacity text-primary hover:text-primary/80 leading-none"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <span className={isSelected ? "text-primary font-bold" : ""}>{realRowIdx + 2}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setInsertAfterRow(isInsertingAfterThis ? null : realRowIdx); }}
                                title="Altına satır ekle"
                                className="opacity-0 group-hover/num:opacity-100 transition-opacity text-primary hover:text-primary/80 leading-none"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          {headers.map((_, colIdx) => {
                            const cellVal = String(row[colIdx] ?? "");
                            const isEditing = editCell?.row === realRowIdx && editCell?.col === colIdx;
                            return (
                              <td key={colIdx} className="px-3 py-2 max-w-[240px]" data-testid={`cell-${relativeIdx}-${colIdx}`}>
                                {isEditing ? (
                                  <CellEditor
                                    value={cellVal}
                                    isPending={updateCellMutation.isPending}
                                    onSave={(v) => updateCellMutation.mutate({ row: realRowIdx, col: colIdx, value: v })}
                                    onCancel={() => setEditCell(null)}
                                    autoFocus
                                  />
                                ) : (
                                  <div
                                    className="flex items-center gap-1.5 cursor-pointer group/cell rounded px-1 -mx-1 py-0.5 hover:bg-primary/8"
                                    onClick={() => setEditCell({ row: realRowIdx, col: colIdx })}
                                  >
                                    <span className="truncate text-foreground">{cellVal}</span>
                                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/cell:opacity-60 shrink-0 transition-opacity" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 w-8" />
                          <td className="px-2 py-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteRow(realRowIdx)}
                              data-testid={`button-delete-${relativeIdx}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>,
                        isInsertingAfterThis && (
                          <InsertBetweenRow
                            key={`insert-${realRowIdx}`}
                            headers={headers}
                            isPending={insertRowMutation.isPending}
                            onInsert={(values) => insertRowMutation.mutate({ afterRow: realRowIdx, values })}
                          />
                        )
                      ].filter(Boolean);
                    })
                  )}

                  {headers.length > 0 && !search && (
                    <InlineAddRow
                      headers={headers}
                      onAdd={(values) => addRowMutation.mutate(values)}
                      isPending={addRowMutation.isPending}
                      label={isPlayBased ? `${currentPlayName} oyununa satır ekle...` : undefined}
                      columnSuggestions={columnSuggestions}
                    />
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!dataLoading && headers.length > 0 && !isPlayBased && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground">
                {filteredRows.length > 0
                  ? `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, filteredRows.length)} / ${filteredRows.length} satır`
                  : "0 satır"}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} data-testid="button-prev-page">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">{page} / {totalPages}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} data-testid="button-next-page">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="shrink-0 flex items-end gap-0 overflow-x-auto px-3 pt-1"
        style={{ background: "hsl(var(--muted) / 0.5)", borderTop: "1px solid hsl(var(--border))" }}
      >
        {sheetsLoading ? (
          <div className="flex gap-1 pb-1 pt-1">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-24 rounded-t-md" />)}
          </div>
        ) : (
          visibleSheets.map((name) => {
            const isActive = activeSheet === name;
            const isPinned = PINNED_SHEETS.includes(name) && !apiSheets.includes(name);
            return (
              <button
                key={name}
                data-testid={`tab-sheet-${name}`}
                onClick={() => { setActiveSheet(name); setSearch(""); setPage(1); setCurrentPlayIdx(0); }}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all rounded-t-md shrink-0 mt-1"
                style={isActive
                  ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderTop: "2px solid hsl(var(--primary))", borderLeft: "1px solid hsl(var(--border))", borderRight: "1px solid hsl(var(--border))", marginBottom: "-1px", zIndex: 1 }
                  : { background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
                }
              >
                {isPinned && <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />}
                {name}
              </button>
            );
          })
        )}
      </div>

      <AlertDialog open={newPlayDialogOpen} onOpenChange={(o) => { if (!o) setNewPlayDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yeni Oyun Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              Yeni oyunun adını girin. BÜTÜN OYUNLAR sayfasına ilk satır olarak eklenecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              data-testid="input-new-play-name"
              placeholder="Oyun adı..."
              value={newPlayName}
              onChange={(e) => setNewPlayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPlayName.trim()) {
                  addRowMutation.mutate([newPlayName.trim(), "", "", ""]);
                  setNewPlayDialogOpen(false);
                  setNewPlayName("");
                }
              }}
              autoFocus
              className="h-9 text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setNewPlayDialogOpen(false); setNewPlayName(""); }}>İptal</AlertDialogCancel>
            <AlertDialogAction
              disabled={!newPlayName.trim() || addRowMutation.isPending}
              onClick={() => {
                if (!newPlayName.trim()) return;
                addRowMutation.mutate([newPlayName.trim(), "", "", ""]);
                setNewPlayDialogOpen(false);
                setNewPlayName("");
              }}
              style={{ background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }}
            >
              {addRowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ekle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveConfirmPlay !== null} onOpenChange={(o) => !o && setArchiveConfirmPlay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oyun Arşivlensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiveConfirmPlay}</strong> oyununa ait tüm satırlar ARŞİV OYUNLAR sayfasına taşınacak ve BÜTÜN OYUNLAR sayfasından silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveConfirmPlay && archivePlayMutation.mutate(archiveConfirmPlay)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {archivePlayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Arşive Taşı"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRow !== null} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Satır Silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Satır Google Sheets'ten kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRow !== null && deleteRowMutation.mutate(deleteRow)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteRowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={lastPlayWarning !== null} onOpenChange={(o) => !o && setLastPlayWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠ Son Oyun Çıkarıldı</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1.5">
                <p>
                  <strong>{lastPlayWarning?.personName}</strong> adlı kişi{lastPlayWarning?.playName ? ` "${lastPlayWarning.playName}"` : ""} oyunundan çıkarıldı ve artık hiçbir oyunda görevi kalmadı.
                </p>
                <p className="text-muted-foreground">Bu kişiyi <strong>FİGÜRAN LİSTESİ</strong>'ne veya başka bir listeye eklemek ister misiniz?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLastPlayWarning(null)}>Hayır, Kapat</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLastPlayWarning(null);
                setActiveSheet("FİGÜRAN LİSTESİ");
              }}
              style={{ background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-primary))" }}
            >
              FİGÜRAN LİSTESİ'ne Git
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
