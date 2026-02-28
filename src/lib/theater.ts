export function trLower(s: string): string {
  return String(s)
    .replace(/İ/g, "i").replace(/I/g, "ı")
    .replace(/Ğ/g, "ğ").replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş").replace(/Ö/g, "ö").replace(/Ç/g, "ç")
    .toLowerCase();
}

export type PlayRow = {
  oyun: string;
  kategori: string;
  gorev: string;
  kisi: string;
};

export type PlaySummary = {
  name: string;
  personelCount: number;
  rowCount: number;
  categories: string[];
};

export type PersonSummary = {
  name: string;
  oyunlar: string[];
  gorevler: string[];
};

export const KNOWN_CATEGORIES = [
  "Oyuncu",
  "Figüran",
  "Figüran/Müzisyen",
  "Figüran/Yönetim",
  "Oyuncu/Figüran",
  "Koro/Dans",
  "Orkestra",
  "Tasarım",
  "Işık – Tasarım",
  "Işık Kontrol",
  "Kostüm",
  "Müzisyen",
  "Hareket / Koreografi",
  "Sahne Amiri",
  "Yönetim",
  "Yönetim/Figüran",
  "Ses – Kondüvit",
  "Ses-Kondüvit",
  "Dramaturgi",
  "Sahne Arkası",
  "Sahne Dekor (Sorumlu)",
  "Dekor/Aksesuar",
  "Video / Görüntü",
  "Peruk – Makyaj",
  "Sanatsal Denetim",
  "Uzman",
  "Yazar",
];

export function isFiguran(kategori: string): boolean {
  const k = (kategori || "").toLowerCase().trim();
  return k.includes("figüran") || k.includes("figuran");
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function parsePlayRows(headers: string[], rows: any[][]): PlayRow[] {
  const h = headers.map((h) => h.trim().toLowerCase());
  const idxOyun = h.findIndex((v) => v === "oyun" || v === "oyun adı" || v.startsWith("oyun"));
  const idxKat = h.findIndex((v) => v === "kategori" || v.startsWith("kategori"));
  const idxGov = h.findIndex((v) => v === "görev" || v.startsWith("görev"));
  const idxKisi = h.findIndex((v) => v === "kişi" || v.startsWith("kişi"));

  return rows.map((row) => ({
    oyun: decodeHtml(String(row[idxOyun] ?? "").trim()),
    kategori: decodeHtml(String(row[idxKat] ?? "").trim()),
    gorev: decodeHtml(String(row[idxGov] ?? "").trim()),
    kisi: decodeHtml(String(row[idxKisi] ?? "").trim()),
  })).filter((r) => r.oyun);
}

export function groupByPlay(rows: PlayRow[]): PlaySummary[] {
  const map = new Map<string, { people: Set<string>; rows: number; cats: Set<string> }>();
  for (const row of rows) {
    if (!map.has(row.oyun)) map.set(row.oyun, { people: new Set(), rows: 0, cats: new Set() });
    const entry = map.get(row.oyun)!;
    if (row.kisi) row.kisi.split(",").forEach((k) => entry.people.add(k.trim()));
    entry.rows++;
    if (row.kategori) entry.cats.add(row.kategori.trim());
  }
  return Array.from(map.entries())
    .map(([name, { people, rows, cats }]) => ({
      name,
      personelCount: people.size,
      rowCount: rows,
      categories: Array.from(cats).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function groupByPerson(rows: PlayRow[]): PersonSummary[] {
  const map = new Map<string, { oyunlar: Set<string>; gorevler: Set<string> }>();
  for (const row of rows) {
    if (!row.kisi) continue;
    const people = row.kisi.split(",").map((k) => k.trim()).filter(Boolean);
    for (const kisi of people) {
      if (!map.has(kisi)) map.set(kisi, { oyunlar: new Set(), gorevler: new Set() });
      const entry = map.get(kisi)!;
      entry.oyunlar.add(row.oyun);
      if (row.gorev) entry.gorevler.add(row.gorev.trim());
    }
  }
  return Array.from(map.entries())
    .map(([name, { oyunlar, gorevler }]) => ({
      name,
      oyunlar: Array.from(oyunlar).sort((a, b) => a.localeCompare(b, "tr")),
      gorevler: Array.from(gorevler).sort((a, b) => a.localeCompare(b, "tr")),
    }))
    .sort((a, b) => b.oyunlar.length - a.oyunlar.length);
}

export function isChildPlay(name: string) {
  return name.includes("Ç.O") || name.includes("(Ç)");
}

export function categoryColor(cat: string): string {
  const c = (cat || "").trim();
  if (c === "Oyuncu" || c.startsWith("Oyuncu"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (isFiguran(c))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  if (c.startsWith("Koro") || c.startsWith("Orkestra"))
    return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300";
  if (c.startsWith("Tasarım"))
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (c.startsWith("Işık"))
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (c.startsWith("Kostüm"))
    return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
  if (c.startsWith("Müzisyen"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (c.startsWith("Hareket"))
    return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
  if (c.startsWith("Sahne Amiri"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (c.startsWith("Yönetim"))
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  if (c.startsWith("Ses"))
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (c.startsWith("Dramaturgi"))
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  return "bg-secondary text-secondary-foreground";
}

export function todayTR(): string {
  return new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
