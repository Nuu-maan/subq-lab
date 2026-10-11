export type Socket = "AM4" | "AM5" | "LGA1700";
export type Memory = "DDR4" | "DDR5";

type Listed = { name: string; price: number; asin: string; listing?: string };
export type Cpu = Listed & { socket: Socket; perf: number; cores: number; tdp: number; coolerIncluded: boolean };
export type Gpu = Listed & { perf: number; vram: number; watts: number; brand: "nvidia" | "amd" };
type Board = Listed & { socket: Socket; memory: Memory; wifi: boolean };
type Ram = Listed & { memory: Memory; gb: number };

export type Needs = {
  resolution: "1080p" | "1440p" | "4k";
  workload: "esports" | "aaa" | "mixed";
  streaming: boolean;
  wifi: boolean;
  showcase: boolean;
  storageTb: 1 | 2;
  upgradePath: boolean;
};

export type PartKind = "CPU" | "Graphics card" | "Motherboard" | "Memory" | "Storage" | "Power supply" | "Case" | "CPU cooler";
export type Store = "amazon" | "flipkart";
export type Offer = { store: Store; price: number; url: string; title: string; inStock: boolean };
export type PriceBook = { checkedAt: string; offers: Record<string, Offer[]> };
export type Part = {
  kind: PartKind;
  name: string;
  price: number;
  asin: string;
  store: Store;
  url: string;
  live: boolean;
  alternative?: { store: Store; price: number };
};
export type Build = { id: string; cpu: Cpu; gpu: Gpu; ramGb: number; parts: Part[]; total: number; score: number };

export const SNAPSHOT_DATE = "11 Oct 2026";

export const amazonUrl = (asin: string) => `https://www.amazon.in/dp/${asin}`;

const CPUS: Cpu[] = [
  { name: "AMD Ryzen 5 5600", price: 15499, asin: "B09VCHR1VH", socket: "AM4", perf: 58, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "Intel Core i5-12400F", price: 13199, asin: "B09NPJRDGD", socket: "LGA1700", perf: 60, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "Intel Core i5-14400F", price: 15849, asin: "B0CQ1Y7KHV", socket: "LGA1700", perf: 68, cores: 10, tdp: 65, coolerIncluded: true },
  { name: "Intel Core i5-14600KF", price: 36499, asin: "B0CGJ4MLC8", socket: "LGA1700", perf: 80, cores: 14, tdp: 125, coolerIncluded: false },
  { name: "AMD Ryzen 5 7500F", price: 17189, asin: "B0D2RWZ2LK", socket: "AM5", perf: 72, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 5 7600", price: 21999, asin: "B0BMQJWBDM", socket: "AM5", perf: 74, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 5 9600X", price: 24999, asin: "B0D6NN6TM7", socket: "AM5", perf: 79, cores: 6, tdp: 65, coolerIncluded: false },
  { name: "AMD Ryzen 7 9700X", price: 36999, asin: "B0D6NMDNNX", socket: "AM5", perf: 84, cores: 8, tdp: 65, coolerIncluded: false },
  { name: "AMD Ryzen 7 7800X3D", price: 45539, asin: "B0BTZB7F88", socket: "AM5", perf: 93, cores: 8, tdp: 120, coolerIncluded: false },
  { name: "AMD Ryzen 7 9800X3D", price: 53689, asin: "B0DKFMSMYK", socket: "AM5", perf: 100, cores: 8, tdp: 120, coolerIncluded: false },
];

const GPUS: Gpu[] = [
  { name: "RTX 5060 8GB", listing: "ZOTAC Gaming GeForce RTX 5060 AMP Core 8GB", price: 57419, asin: "B0HD5MWBFS", perf: 54, vram: 8, watts: 145, brand: "nvidia" },
  { name: "RX 9060 XT 16GB", listing: "ASUS Dual Radeon RX 9060 XT 16GB", price: 62200, asin: "B0FNM457WX", perf: 63, vram: 16, watts: 160, brand: "amd" },
  { name: "RTX 5070 12GB", listing: "ZOTAC Gaming GeForce RTX 5070 Twin Edge OC 12GB", price: 98099, asin: "B0F5X1XQTH", perf: 80, vram: 12, watts: 250, brand: "nvidia" },
  { name: "RTX 5060 Ti 16GB", listing: "GIGABYTE GeForce RTX 5060 Ti WINDFORCE 16G", price: 99500, asin: "B0F5BB8P3Q", perf: 66, vram: 16, watts: 180, brand: "nvidia" },
  { name: "RX 9070 XT 16GB", listing: "ASUS Prime Radeon RX 9070 XT OC 16GB", price: 102769, asin: "B0DSG52H7D", perf: 95, vram: 16, watts: 304, brand: "amd" },
  { name: "RTX 5070 Ti 16GB", listing: "MSI GeForce RTX 5070 Ti 16G Ventus 3X OC", price: 163679, asin: "B0DV9GC9SR", perf: 100, vram: 16, watts: 300, brand: "nvidia" },
];

const BOARDS: Board[] = [
  { name: "MSI B550M-A PRO", price: 7149, asin: "B08P2FGBW5", socket: "AM4", memory: "DDR4", wifi: false },
  { name: "MSI B550M PRO-VDH WiFi", price: 10109, asin: "B08BWP2PCF", socket: "AM4", memory: "DDR4", wifi: true },
  { name: "GIGABYTE B760M K V2 DDR4", price: 8629, asin: "B0FH4J2PDR", socket: "LGA1700", memory: "DDR4", wifi: false },
  { name: "MSI PRO B760M-A WiFi DDR4", price: 16999, asin: "B09XZTFBV9", socket: "LGA1700", memory: "DDR4", wifi: true },
  { name: "MSI PRO B650M-E", price: 9155, asin: "B0DTHK5YS9", socket: "AM5", memory: "DDR5", wifi: false },
  { name: "ASUS B650M-AYW WiFi", price: 10599, asin: "B0FDGGP85D", socket: "AM5", memory: "DDR5", wifi: true },
];

const RAMS: Ram[] = [
  { name: "Patriot Viper Steel 16GB (2×8GB) DDR4-3200", price: 13499, asin: "B07KXMWHBY", memory: "DDR4", gb: 16 },
  { name: "Patriot Viper Steel 32GB (2×16GB) DDR4-3200", price: 25999, asin: "B07N3TXFFX", memory: "DDR4", gb: 32 },
  { name: "Patriot Viper Venom 16GB (2×8GB) DDR5-5600", price: 26999, asin: "B09XY6PBG9", memory: "DDR5", gb: 16 },
  { name: "Patriot Viper Venom 32GB (2×16GB) DDR5-6000 CL30", price: 49999, asin: "B0D4NLSP87", memory: "DDR5", gb: 32 },
];

const SSDS: Record<Needs["storageTb"], Listed> = {
  1: { name: "Crucial E100 1TB NVMe Gen4", price: 15599, asin: "B0DQSJYD12" },
  2: { name: "KIOXIA EXCERIA Basic 2TB NVMe Gen4", price: 27999, asin: "B0FXG7G7RH" },
};

const PSUS: Record<650 | 750 | 850, Listed> = {
  650: { name: "650W MSI MAG A650BN (80+ Bronze)", price: 5180, asin: "B09GW3QZLJ" },
  750: { name: "750W MSI MAG A750GN PCIE5 (80+ Gold)", price: 8298, asin: "B0BSLMB28P" },
  850: { name: "850W MSI MAG A850GL PCIE5 (80+ Gold)", price: 10489, asin: "B0C7LJFVZN" },
};

const CASES: Record<"airflow" | "showcase", Listed> = {
  airflow: { name: "Ant Esports ICE-300 Mesh V2", price: 3528, asin: "B0C5BW1P2K" },
  showcase: { name: "Montech XR Panoramic, white (3 ARGB fans)", price: 8000, asin: "B0D5PQTCS9" },
};

const COOLER: Listed = { name: "Cooler Master Hyper 212 Spectrum V3 ARGB", price: 1865, asin: "B0BR5B1S3G" };

export function catalog(): { kind: PartKind; item: Listed }[] {
  return [
    ...CPUS.map((item) => ({ kind: "CPU" as const, item })),
    ...GPUS.map((item) => ({ kind: "Graphics card" as const, item })),
    ...BOARDS.map((item) => ({ kind: "Motherboard" as const, item })),
    ...RAMS.map((item) => ({ kind: "Memory" as const, item })),
    ...Object.values(SSDS).map((item) => ({ kind: "Storage" as const, item })),
    ...Object.values(PSUS).map((item) => ({ kind: "Power supply" as const, item })),
    ...Object.values(CASES).map((item) => ({ kind: "Case" as const, item })),
    { kind: "CPU cooler" as const, item: COOLER },
  ];
}

export function requiredPsu(cpu: Cpu, gpu: Gpu): 650 | 750 | 850 {
  if (gpu.watts < 280) return 650;
  return cpu.tdp >= 120 ? 850 : 750;
}

export function rate(cpu: Cpu, gpu: Gpu, ramGb: number, needs: Needs) {
  const gpuWeight =
    { "1080p": 0.55, "1440p": 0.7, "4k": 0.82 }[needs.resolution] + { esports: -0.15, aaa: 0.05, mixed: 0 }[needs.workload];
  let score = gpuWeight * gpu.perf + (1 - gpuWeight) * cpu.perf;
  if (gpu.vram < 12 && needs.resolution !== "1080p") score -= 8;
  if (needs.streaming) score += (cpu.cores >= 8 ? 4 : 0) + (gpu.brand === "nvidia" ? 3 : 0);
  if (ramGb >= 32) score += needs.streaming || needs.workload !== "esports" ? 5 : 2;
  if (needs.upgradePath && cpu.socket === "AM5") score += 3;
  return Math.round(score * 10) / 10;
}

function shortTitle(title: string) {
  const cut = title.split(/\s(?:\d+\s?GB\s)?GDDR|\s[|(]|,\s/)[0];
  return cut.length > 72 ? `${cut.slice(0, 71)}…` : cut;
}

function toPart(kind: PartKind, item: Listed, book?: PriceBook): Part | null {
  const name = item.listing ?? item.name;
  const offers = book?.offers[item.asin];
  if (!offers) return { kind, name, price: item.price, asin: item.asin, store: "amazon", url: amazonUrl(item.asin), live: false };

  const [best, next] = offers.filter((offer) => offer.inStock).sort((a, b) => a.price - b.price);
  if (!best) return null;
  return {
    kind,
    name: best.store === "flipkart" && kind === "Graphics card" ? shortTitle(best.title) : name,
    price: best.price,
    asin: item.asin,
    store: best.store,
    url: best.url,
    live: true,
    alternative: next && next.store !== best.store ? { store: next.store, price: next.price } : undefined,
  };
}

function assemble(cpu: Cpu, gpu: Gpu, ram: Ram, needs: Needs, book?: PriceBook): Build | null {
  const board = BOARDS.filter((b) => b.socket === cpu.socket && b.memory === ram.memory && (!needs.wifi || b.wifi))
    .map((item) => toPart("Motherboard", item, book))
    .filter((part) => part !== null)
    .sort((a, b) => a.price - b.price)[0];
  if (!board) return null;

  const required = [
    toPart("CPU", cpu, book),
    toPart("Graphics card", gpu, book),
    board,
    toPart("Memory", ram, book),
    toPart("Storage", SSDS[needs.storageTb], book),
    toPart("Power supply", PSUS[requiredPsu(cpu, gpu)], book),
    toPart("Case", CASES[needs.showcase ? "showcase" : "airflow"], book),
    cpu.coolerIncluded ? undefined : toPart("CPU cooler", COOLER, book),
  ].filter((part) => part !== undefined);
  if (required.some((part) => part === null)) return null;
  const parts = required as Part[];

  return {
    id: `${cpu.name}+${gpu.name}+${ram.gb}`,
    cpu,
    gpu,
    ramGb: ram.gb,
    parts,
    total: parts.reduce((sum, part) => sum + part.price, 0),
    score: rate(cpu, gpu, ram.gb, needs),
  };
}

export function solve(needs: Needs, budget: number, book?: PriceBook, count = 3) {
  const all = CPUS.flatMap((cpu) => GPUS.flatMap((gpu) => RAMS.map((ram) => assemble(cpu, gpu, ram, needs, book)))).filter(
    (build): build is Build => build !== null,
  );
  const ranked = all.filter((build) => build.total <= budget).sort((a, b) => b.score - a.score || a.total - b.total);

  const builds: Build[] = [];
  for (const build of ranked) {
    if (builds.length === count) break;
    if (!builds.some((picked) => picked.gpu === build.gpu)) builds.push(build);
  }
  return { builds, cheapest: all.length ? Math.min(...all.map((build) => build.total)) : null };
}
