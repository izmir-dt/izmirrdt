import { useMemo, useState, useRef, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import type { PlayRow } from "@/lib/theater";
import { categoryColor } from "@/lib/theater";

interface ExcelDialogProps {
  open: boolean;
  onClose: () => void;
  playName: string;
  rows: PlayRow[];
  customHeaders?: string[];
  customTsvFn?: () => string;
}

export function ExcelDialog({ open, onClose, playName, rows, customHeaders, customTsvFn }: ExcelDialogProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const allCats = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.kategori) s.add(r.kategori.trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const [selected, setSelected] = useState<Set<string>>(new Set(allCats));

  useEffect(() => {
    setSelected(new Set(allCats));
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => selected.has(r.kategori.trim())),
    [rows, selected]
  );

  const tsv = useMemo(() => {
    if (customTsvFn) return customTsvFn();
    const header = "Oyun\tKategori\tGörev\tKişi";
    const lines = filtered.map((r) => `${r.oyun}\t${r.kategori}\t${r.gorev}\t${r.kisi}`);
    return [header, ...lines].join("\n");
  }, [filtered, customTsvFn]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      textRef.current?.select();
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleAll = () => {
    if (selected.size === allCats.length) setSelected(new Set());
    else setSelected(new Set(allCats));
  };

  const hasCategories = allCats.length > 0 && !customTsvFn;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[480px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "hsl(var(--sidebar))", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
          >
            <div>
              <h2 className="font-bold text-[13px]" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                Excel'e Aktar
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--sidebar-foreground) / 0.60)" }}>
                {playName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.65)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category filter (only for play-based rows) */}
          {hasCategories && (
            <div className="px-4 py-2.5 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Kategori Filtresi
                </span>
                <button onClick={toggleAll} className="text-[11px] text-primary hover:underline">
                  {selected.size === allCats.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allCats.map((cat) => {
                  const isOn = selected.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const next = new Set(selected);
                        isOn ? next.delete(cat) : next.add(cat);
                        setSelected(next);
                      }}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-all ${
                        isOn
                          ? `${categoryColor(cat)} border-transparent`
                          : "bg-transparent text-muted-foreground border-border opacity-40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-2 border-b border-border shrink-0 bg-muted/30 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">{customTsvFn ? tsv.split("\n").length - 1 : filtered.length}</strong> satır
              {hasCategories && (
                <> &nbsp;·&nbsp; <strong className="text-foreground">{selected.size}</strong>/{allCats.length} kategori</>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground/60">İlk 6 satır önizleme</span>
          </div>

          {/* Table Preview */}
          <div className="flex-1 overflow-auto px-4 py-3 space-y-3 min-h-0">
            {!customTsvFn && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-20 text-muted-foreground gap-2">
                <p className="text-sm">Hiçbir kategori seçili değil</p>
              </div>
            )}

            {(!customTsvFn && filtered.length > 0) && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: "hsl(var(--sidebar))" }}>
                      {["Oyun", "Kategori", "Görev", "Kişi"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-bold whitespace-nowrap" style={{ color: "hsl(var(--sidebar-primary))" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 6).map((r, i) => (
                      <tr key={i} className={`border-t border-border/40 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-3 py-1.5 font-medium text-foreground truncate max-w-[110px]">{r.oyun}</td>
                        <td className="px-3 py-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${categoryColor(r.kategori)}`}>{r.kategori}</span>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[90px]">{r.gorev}</td>
                        <td className="px-3 py-1.5 text-foreground truncate max-w-[100px]">{r.kisi}</td>
                      </tr>
                    ))}
                    {filtered.length > 6 && (
                      <tr className="border-t border-border/40 bg-muted/10">
                        <td colSpan={4} className="px-3 py-2 text-[10px] text-muted-foreground text-center">
                          … ve {filtered.length - 6} satır daha
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground mb-1">Panoya kopyalanacak veri (TSV formatı):</p>
              <textarea
                ref={textRef}
                readOnly
                value={tsv.slice(0, 400) + (tsv.length > 400 ? "…" : "")}
                onClick={() => textRef.current?.select()}
                rows={3}
                className="w-full text-[10px] font-mono bg-transparent focus:outline-none resize-none cursor-text text-muted-foreground"
                style={{ userSelect: "text" }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">
              Kopyala → Excel'i aç → Ctrl+V
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Kapat
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-all"
                style={{ background: copied ? "hsl(142 70% 38%)" : "hsl(155 65% 38%)" }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopyalandı!" : `${customTsvFn ? tsv.split("\n").length - 1 : filtered.length} Satırı Kopyala`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
