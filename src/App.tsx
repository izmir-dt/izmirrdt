import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useState } from "react";
import { NotificationPanel, getUnreadCount, markAllSeen } from "@/components/notification-panel";
import {
  LayoutDashboard,
  Clapperboard,
  Search,
  Users2,
  UserMinus,
  FolderOpen,
  Bell,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  BarChart2,
  BookUser,
} from "lucide-react";

const Home = lazy(() => import("@/pages/home"));
const OyunlarPage = lazy(() => import("@/pages/oyunlar"));
const SorgulamaPage = lazy(() => import("@/pages/sorgulama"));
const DagilimPage = lazy(() => import("@/pages/dagilim"));
const FiguranPage = lazy(() => import("@/pages/figuran"));
const GrafikPage = lazy(() => import("@/pages/grafik"));
const GorevliOlmayanPage = lazy(() => import("@/pages/gorevli-olmayan"));
const ArsivOyunlarPage = lazy(() => import("@/pages/arsiv-oyunlar"));
const BildirimlerPage = lazy(() => import("@/pages/bildirimler"));
const AdminPage = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

const NAV_PRIMARY = [
  { path: "/",          label: "ANA PANEL",          icon: LayoutDashboard, exact: true },
  { path: "/oyunlar",   label: "PERSONEL LİSTESİ",   icon: Users2 },
  { path: "/sorgulama", label: "SORGULAMA",           icon: Search },
  { path: "/dagilim",   label: "PERSONEL DAĞILIMI",   icon: BookUser },
  { path: "/figuran",   label: "FIGÜRANLAR",          icon: Clapperboard },
  { path: "/grafik",    label: "GRAFİKLER",            icon: BarChart2 },
];

const NAV_SECONDARY = [
  { path: "/gorevli-olmayan", label: "MÜSAİT PERSONEL", icon: UserMinus },
  { path: "/arsiv-oyunlar",   label: "ARŞİV OYUNLAR",   icon: FolderOpen },
];

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function NavPill({
  path,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const active = exact ? location === path : location === path || location.startsWith(path + "/");

  return (
    <Link href={path} onClick={onClick}>
      <div
        data-testid={`nav-${path.replace("/", "") || "home"}`}
        className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[11px] font-semibold tracking-[0.5px] cursor-pointer transition-all select-none whitespace-nowrap"
        style={
          active
            ? { background: "hsl(var(--sidebar-primary))", color: "hsl(var(--sidebar-primary-foreground))" }
            : { background: "transparent", color: "hsl(var(--sidebar-foreground) / 0.70)" }
        }
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "hsl(var(--sidebar-accent))";
            (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-foreground))";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-foreground) / 0.70)";
          }
        }}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {label}
      </div>
    </Link>
  );
}

function AdminButton() {
  const [location] = useLocation();
  const active = location === "/admin" || location.startsWith("/admin/");
  return (
    <Link href="/admin">
      <button
        data-testid="nav-admin"
        title="Admin Paneli"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
        style={{
          background: active ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-accent))",
          color: active ? "hsl(var(--sidebar-primary-foreground))" : "hsl(var(--sidebar-foreground) / 0.75)",
        }}
      >
        <ShieldCheck className="w-[15px] h-[15px]" />
      </button>
    </Link>
  );
}

function BellButton({ onOpen }: { onOpen: () => void }) {
  const { data } = useQuery<{ headers: string[]; rows: any[][] }>({
    queryKey: ["/api/sheets", "BİLDİRİMLER"],
    staleTime: 60_000,
  });
  const total = data?.rows?.length ?? 0;
  const unread = total > 0 ? getUnreadCount(data?.rows ?? []) : 0;

  const handleOpen = () => {
    if (total > 0) markAllSeen(total);
    onOpen();
  };

  return (
    <button
      data-testid="nav-bildirimler"
      title="Bildirimler"
      onClick={handleOpen}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
      style={{
        background: "hsl(var(--sidebar-accent))",
        color: "hsl(var(--sidebar-foreground) / 0.75)",
      }}
    >
      <Bell className="w-[15px] h-[15px]" />
      {unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: "hsl(0 72% 51%)" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function TopNav({ onBellOpen }: { onBellOpen: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [location] = useLocation();
  const secondaryActive = NAV_SECONDARY.some(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );

  return (
    <header
      className="shrink-0 sticky top-0 z-40"
      style={{
        background: "hsl(var(--sidebar))",
        borderBottom: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Brand row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div
          className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(145deg, hsl(350 68% 38%), hsl(350 55% 25%))",
            border: "1px solid hsl(42 92% 50% / 0.35)",
            boxShadow: "0 0 0 1px hsl(42 92% 50% / 0.20), 0 2px 8px hsl(0 0% 0% / 0.40)",
          }}
        >
          <span className="font-black text-[11px] tracking-wider select-none" style={{ color: "hsl(42 92% 68%)" }}>
            İDT
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-[13px] tracking-[0.4px] leading-tight" style={{ color: "hsl(42 92% 60%)" }}>
            İZMİR DEVLET TİYATROSU
          </p>
          <p className="text-[9.5px] tracking-[0.8px] uppercase leading-tight mt-0.5 hidden sm:block" style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}>
            Sanat Teknik Bürosu · Repertuvar Takip Sistemi
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BellButton onOpen={onBellOpen} />
          <AdminButton />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-mobile-menu"
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ background: "hsl(var(--sidebar-accent))", color: "hsl(var(--sidebar-foreground) / 0.70)" }}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Desktop nav — primary row */}
      <nav className="hidden lg:flex flex-wrap items-center justify-center gap-0.5 px-4 pb-1.5">
        {NAV_PRIMARY.map((item) => (
          <NavPill key={item.path} {...item} />
        ))}
        {/* Expand/collapse secondary */}
        <button
          onClick={() => setSecondaryOpen((s) => !s)}
          data-testid="button-nav-expand"
          className="flex items-center gap-1 px-2.5 py-[6px] rounded-lg text-[11px] font-semibold tracking-[0.5px] transition-all select-none whitespace-nowrap"
          style={
            secondaryActive
              ? { background: "hsl(var(--sidebar-primary))", color: "hsl(var(--sidebar-primary-foreground))" }
              : { background: "transparent", color: "hsl(var(--sidebar-foreground) / 0.55)" }
          }
        >
          {secondaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          DİĞER
        </button>
      </nav>

      {/* Desktop nav — secondary row (expandable) */}
      {secondaryOpen && (
        <nav
          className="hidden lg:flex flex-wrap items-center justify-center gap-0.5 px-4 pb-2 border-t"
          style={{ borderColor: "hsl(var(--sidebar-border) / 0.5)" }}
        >
          {NAV_SECONDARY.map((item) => (
            <NavPill key={item.path} {...item} />
          ))}
        </nav>
      )}

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="lg:hidden border-t flex flex-wrap gap-1.5 p-3"
          style={{ borderColor: "hsl(var(--sidebar-border))", background: "hsl(var(--sidebar))" }}
        >
          {[...NAV_PRIMARY, ...NAV_SECONDARY].map((item) => (
            <NavPill key={item.path} {...item} onClick={() => setMenuOpen(false)} />
          ))}
          <div
            onClick={() => { setMenuOpen(false); onBellOpen(); }}
            className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: "transparent", color: "hsl(var(--sidebar-foreground) / 0.70)" }}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            BİLDİRİMLER
          </div>
          <Link href="/admin" onClick={() => setMenuOpen(false)}>
            <div
              className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: "transparent", color: "hsl(var(--sidebar-foreground) / 0.70)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              ADMİN PANELİ
            </div>
          </Link>
        </div>
      )}
    </header>
  );
}

const HELP_ITEMS = [
  { icon: LayoutDashboard, title: "Ana Panel", desc: "Sol panelde oyun listesi, sağ panelde seçilen oyunun kadrosu gösterilir. Kişi adına tıklayarak Personel Listesi'ne geçin." },
  { icon: Users2,          title: "Personel Listesi", desc: "Tüm personeli alfabetik sırada görün. Sol panelden kişi seçin, sağda hangi oyunlarda hangi görevde olduğu listelenir." },
  { icon: Search,         title: "Sorgulama", desc: "İsim, görev, kategori ile filtreleyin. 'Kesişim Analizi' sekmesi ile iki oyunun ortak ve farklı personelini karşılaştırın." },
  { icon: BookUser,       title: "Personel Dağılımı", desc: "Kişi arayın veya 2-10 butonuyla tam oyun sayısına göre filtreleyin. Her oyunun karşısında görev bilgisi gösterilir." },
  { icon: Clapperboard,   title: "Figüranlar", desc: "FİGÜRAN LİSTESİ sekmesinde figüranların listesi, OYUN BAZLI sekmesinde oyunlardaki figüran görevleri yer alır." },
  { icon: BarChart2,      title: "Grafikler", desc: "En çok oynayan kişiler, büyük kadrolar ve kategori dağılımı. Çubuk çubuğuna tıklayarak detaya gidin." },
  { icon: ShieldCheck,    title: "Admin Paneli", desc: "Google Sheets verilerini doğrudan düzenleyin: satır ekleyin, kaldırın, hücre güncelleyin. BÜTÜN OYUNLAR'da oyun oyun gezinin." },
];

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="button-help"
        title="Yardım"
        className="fixed bottom-5 right-5 z-40 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-lg transition-all hover:scale-105"
        style={{
          background: "hsl(var(--sidebar))",
          color: "hsl(var(--sidebar-primary))",
          border: "2px solid hsl(var(--sidebar-primary) / 0.4)",
        }}
      >
        ?
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed right-5 bottom-16 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ background: "hsl(var(--sidebar))" }}
            >
              <span className="text-sm font-bold" style={{ color: "hsl(var(--sidebar-primary))" }}>
                Site Rehberi
              </span>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">
              {HELP_ITEMS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "hsl(var(--sidebar))" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-primary))" }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopNav onBellOpen={() => setNotifOpen(true)} />
      <main className="flex-1 min-h-0 overflow-auto">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <HelpButton />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/oyunlar" component={OyunlarPage} />
        <Route path="/sorgulama" component={SorgulamaPage} />
        <Route path="/dagilim" component={DagilimPage} />
        <Route path="/figuran" component={FiguranPage} />
        <Route path="/grafik" component={GrafikPage} />
        <Route path="/gorevli-olmayan" component={GorevliOlmayanPage} />
        <Route path="/arsiv-oyunlar" component={ArsivOyunlarPage} />
        <Route path="/bildirimler" component={BildirimlerPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
