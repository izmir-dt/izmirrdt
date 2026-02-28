import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useEffect, useState } from "react";
import { Bell, X, RefreshCw, Plus, Trash2, AlertCircle, Edit3, Archive, CheckCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SheetData = { headers: string[]; rows: any[][] };

function typeBadge(type: string) {
  const t = (type || "").trim().toUpperCase();
  if (t === "EKLENDİ" || t === "EKLENDI")
    return { label: "EKLENDİ", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", Icon: Plus };
  if (t === "SİLİNDİ" || t === "SILINDI")
    return { label: "SİLİNDİ", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", Icon: Trash2 };
  if (t === "GÜNCELLENDİ" || t === "GUNCELLENDI")
    return { label: "GÜNCELLENDİ", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", Icon: Edit3 };
  if (t === "BİLGİ" || t === "BILGI")
    return { label: "BİLGİ", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", Icon: AlertCircle };
  if (t === "ARŞİVLENDİ" || t === "ARSIVLENDI")
    return { label: "ARŞİVLENDİ", cls: "bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300", Icon: Archive };
  return { label: t || "—", cls: "bg-secondary text-secondary-foreground", Icon: Bell };
}

const SEEN_KEY = "notif_seen_ids";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveSeenIds(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch {}
}

export function getUnreadCount(rows: any[][]): number {
  try {
    const seen = getSeenIds();
    return rows.filter((_, i) => !seen.has(String(i))).length;
  } catch { return 0; }
}

export function markAllSeen(total: number) {
  try {
    const ids = new Set(Array.from({ length: total }, (_, i) => String(i)));
    saveSeenIds(ids);
  } catch {}
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);

  const { data, isFetching } = useQuery<SheetData>({
    queryKey: ["/api/sheets", "BİLDİRİMLER"],
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    return [...data.rows].reverse();
  }, [data]);

  const totalCount = data?.rows?.length ?? 0;

  const markSeen = (idx: number) => {
    const originalIdx = totalCount - 1 - idx;
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(String(originalIdx));
      saveSeenIds(next);
      return next;
    });
  };

  useEffect(() => {
    if (open && totalCount > 0) {
      const ids = new Set(Array.from({ length: totalCount }, (_, i) => String(i)));
      setSeenIds(ids);
      saveSeenIds(ids);
      qc.invalidateQueries({ queryKey: ["/api/sheets", "BİLDİRİMLER"] });
    }
  }, [open, totalCount]);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications"),
    onSuccess: () => {
      setSeenIds(new Set());
      saveSeenIds(new Set());
      qc.invalidateQueries({ queryKey: ["/api/sheets", "BİLDİRİMLER"] });
      setConfirmClear(false);
      toast({ title: "Bildirimler temizlendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bildirimler temizlenemedi", variant: "destructive" });
    }
  });

  const deleteOldestMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications/oldest"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", "BİLDİRİMLER"] });
      toast({ title: "En eski 20 bildirim silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Silme başarısız", variant: "destructive" }),
  });

  const deleteRowMutation = useMutation({
    mutationFn: (sheetRowIdx: number) =>
      apiRequest("DELETE", `/api/sheets/${encodeURIComponent("BİLDİRİMLER")}/row/${sheetRowIdx}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sheets", "BİLDİRİMLER"] });
      setDeletingIdx(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Bildirim silinemedi", variant: "destructive" });
      setDeletingIdx(null);
    },
  });

  const handleDeleteRow = (displayIdx: number) => {
    const sheetRowIdx = totalCount - 1 - displayIdx;
    setDeletingIdx(displayIdx);
    deleteRowMutation.mutate(sheetRowIdx);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed right-2 sm:right-4 top-[72px] z-50 flex flex-col w-[calc(100vw-16px)] sm:w-[380px] max-h-[80vh] sm:max-h-[520px] rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 8px 40px hsl(0 0% 0% / 0.18)"
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: "hsl(var(--sidebar))", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-primary))" }} />
            <span className="font-bold text-[12px] tracking-wide" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              BİLDİRİMLER
            </span>
            {totalCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "hsl(var(--sidebar-primary) / 0.2)", color: "hsl(var(--sidebar-primary))" }}
              >
                {totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {totalCount > 20 && !confirmClear && (
              <button
                onClick={() => deleteOldestMutation.mutate()}
                disabled={deleteOldestMutation.isPending}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[9px] font-semibold flex items-center gap-1"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}
                title="En eski 20 bildirimi sil"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Eski 20</span>
              </button>
            )}
            {totalCount > 0 && !confirmClear && (
              <button
                onClick={() => setConfirmClear(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}
                title="Tümünü Temizle"
              >
                <CheckCheck className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["/api/sheets", "BİLDİRİMLER"] })}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}
              title="Yenile"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Confirm clear */}
        {confirmClear && (
          <div className="px-4 py-2.5 border-b border-border bg-destructive/5 shrink-0 flex items-center gap-2">
            <p className="text-xs text-foreground flex-1">{totalCount} bildirimi sil?</p>
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="px-2.5 py-1 rounded text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {clearMutation.isPending ? "…" : "Evet, Sil"}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-2.5 py-1 rounded text-[11px] font-semibold border border-border hover:bg-muted transition-colors"
            >
              İptal
            </button>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 && !isFetching && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <Bell className="w-7 h-7 opacity-15" />
              <p className="text-sm">Bildirim yok</p>
            </div>
          )}
          {rows.map((row, i) => {
            const [tarih, tur, oyun, kisi, gorev, aciklama] = row;
            const badge = typeBadge(String(tur || ""));
            const BadgeIcon = badge.Icon;
            const originalIdx = totalCount - 1 - i;
            const isRead = seenIds.has(String(originalIdx));
            const isDeleting = deletingIdx === i;
            const oyunStr = String(oyun || "").trim();
            const kisiStr = String(kisi || "").trim();
            const gorevStr = String(gorev || "").trim();
            const aciklamaStr = String(aciklama || "").trim();
            const isGeneric = aciklamaStr === "Web uygulamasından" || aciklamaStr === "Web uygulamasından eklendi";
            return (
              <div
                key={i}
                onClick={() => markSeen(i)}
                className="px-3 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group relative"
                style={isRead ? {} : { borderLeft: "3px solid hsl(var(--sidebar-primary))" }}
              >
                {!isRead && (
                  <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--sidebar-primary))" }} />
                )}
                <div className="flex items-start gap-2 pr-6">
                  <BadgeIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: isRead ? "hsl(var(--muted-foreground))" : "hsl(var(--sidebar-primary))" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {oyunStr && (
                        <span className="text-[11px] font-bold text-foreground truncate">{oyunStr}</span>
                      )}
                    </div>
                    {kisiStr && (
                      <p className="text-[11px] text-foreground/80 font-medium leading-tight">{kisiStr}{gorevStr ? <span className="font-normal text-muted-foreground"> · {gorevStr}</span> : ""}</p>
                    )}
                    {!kisiStr && gorevStr && (
                      <p className="text-[11px] text-muted-foreground leading-tight">{gorevStr}</p>
                    )}
                    {aciklamaStr && !isGeneric && (
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-2 mt-0.5 leading-snug">{aciklamaStr}</p>
                    )}
                    {!oyunStr && !kisiStr && !gorevStr && isGeneric && (
                      <p className="text-[10px] text-muted-foreground italic">{aciklamaStr}</p>
                    )}
                    {tarih && (
                      <p className="text-[9px] text-muted-foreground/40 mt-1">{String(tarih)}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRow(i); }}
                  disabled={isDeleting || deleteRowMutation.isPending}
                  className="absolute right-2 bottom-2.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-50"
                  title="Bildirimi sil"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
