export type Socket = "AM4" | "AM5" | "LGA1700";
export type Memory = "DDR4" | "DDR5";

export type Cpu = { name: string; price: number; socket: Socket; perf: number; cores: number; tdp: number; coolerIncluded: boolean };
export type Gpu = { name: string; price: number; perf: number; vram: number; watts: number; brand: "nvidia" | "amd" | "intel" };
type Board = { name: string; price: number; socket: Socket; memory: Memory; wifi: boolean };
type Ram = { name: string; price: number; memory: Memory; gb: number };
type Priced = { name: string; price: number };

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
export type Part = { kind: PartKind; name: string; price: number };
export type Build = { id: string; cpu: Cpu; gpu: Gpu; ramGb: number; parts: Part[]; total: number; score: number };

export const PRICES_NOTE = "Prices are mid-2026 estimates for Indian retailers. Memory and storage prices have been volatile, so check current listings before buying.";

const CPUS: Cpu[] = [
  { name: "AMD Ryzen 5 5600", price: 9000, socket: "AM4", perf: 58, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 7 5700X3D", price: 19000, socket: "AM4", perf: 80, cores: 8, tdp: 105, coolerIncluded: false },
  { name: "Intel Core i5-12400F", price: 10500, socket: "LGA1700", perf: 60, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "Intel Core i5-14600KF", price: 20500, socket: "LGA1700", perf: 80, cores: 14, tdp: 125, coolerIncluded: false },
  { name: "AMD Ryzen 5 7500F", price: 14000, socket: "AM5", perf: 72, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 5 7600", price: 17000, socket: "AM5", perf: 74, cores: 6, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 5 9600X", price: 21000, socket: "AM5", perf: 79, cores: 6, tdp: 65, coolerIncluded: false },
  { name: "AMD Ryzen 7 7700", price: 25500, socket: "AM5", perf: 78, cores: 8, tdp: 65, coolerIncluded: true },
  { name: "AMD Ryzen 7 7800X3D", price: 35500, socket: "AM5", perf: 93, cores: 8, tdp: 120, coolerIncluded: false },
  { name: "AMD Ryzen 7 9800X3D", price: 46000, socket: "AM5", perf: 100, cores: 8, tdp: 120, coolerIncluded: false },
];

const GPUS: Gpu[] = [
  { name: "Intel Arc B580 12GB", price: 25500, perf: 50, vram: 12, watts: 190, brand: "intel" },
  { name: "NVIDIA RTX 5060 8GB", price: 29500, perf: 54, vram: 8, watts: 145, brand: "nvidia" },
  { name: "AMD RX 9060 XT 16GB", price: 37500, perf: 63, vram: 16, watts: 160, brand: "amd" },
  { name: "NVIDIA RTX 5060 Ti 16GB", price: 45500, perf: 66, vram: 16, watts: 180, brand: "nvidia" },
  { name: "NVIDIA RTX 5070 12GB", price: 55000, perf: 80, vram: 12, watts: 250, brand: "nvidia" },
  { name: "AMD RX 9070 16GB", price: 58000, perf: 86, vram: 16, watts: 220, brand: "amd" },
  { name: "AMD RX 9070 XT 16GB", price: 65000, perf: 95, vram: 16, watts: 304, brand: "amd" },
  { name: "NVIDIA RTX 5070 Ti 16GB", price: 80000, perf: 100, vram: 16, watts: 300, brand: "nvidia" },
];

const BOARDS: Board[] = [
  { name: "MSI B550M PRO-VDH", price: 8500, socket: "AM4", memory: "DDR4", wifi: false },
  { name: "MSI B550M PRO-VDH WiFi", price: 10500, socket: "AM4", memory: "DDR4", wifi: true },
  { name: "MSI PRO B760M-E DDR4", price: 9500, socket: "LGA1700", memory: "DDR4", wifi: false },
  { name: "Gigabyte B760M Gaming X AX DDR4", price: 13500, socket: "LGA1700", memory: "DDR4", wifi: true },
  { name: "Gigabyte B650M D3HP", price: 12000, socket: "AM5", memory: "DDR5", wifi: false },
  { name: "MSI B650M Gaming Plus WiFi", price: 15000, socket: "AM5", memory: "DDR5", wifi: true },
];

const RAMS: Ram[] = [
  { name: "16GB (2×8GB) DDR4-3200", price: 6000, memory: "DDR4", gb: 16 },
  { name: "32GB (2×16GB) DDR4-3600", price: 11500, memory: "DDR4", gb: 32 },
  { name: "16GB (2×8GB) DDR5-6000", price: 9500, memory: "DDR5", gb: 16 },
  { name: "32GB (2×16GB) DDR5-6000 CL30", price: 19000, memory: "DDR5", gb: 32 },
];

const SSDS: Record<Needs["storageTb"], Priced> = {
  1: { name: "1TB NVMe Gen4 (WD Black SN7100)", price: 7500 },
  2: { name: "2TB NVMe Gen4 (WD Black SN7100)", price: 13500 },
};

const PSUS: Record<650 | 750 | 850, Priced> = {
  650: { name: "650W 80+ Bronze (MSI MAG A650BN)", price: 5000 },
  750: { name: "750W 80+ Gold ATX 3.1 (MSI MAG A750GL)", price: 8500 },
  850: { name: "850W 80+ Gold ATX 3.1 (Corsair RM850e)", price: 11500 },
};

const CASES = {
  airflow: { name: "Deepcool CC560 (mesh, 4 fans)", price: 4600 },
  showcase: { name: "Montech XR (glass, 3 ARGB fans)", price: 7800 },
};

const COOLER: Priced = { name: "Deepcool AK400 tower cooler", price: 2600 };

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

function assemble(cpu: Cpu, gpu: Gpu, ram: Ram, needs: Needs): Build | null {
  const board = BOARDS.filter((b) => b.socket === cpu.socket && b.memory === ram.memory && (!needs.wifi || b.wifi)).sort(
    (a, b) => a.price - b.price,
  )[0];
  if (!board) return null;

  const parts: Part[] = [
    { kind: "CPU", ...cpu },
    { kind: "Graphics card", ...gpu },
    { kind: "Motherboard", ...board },
    { kind: "Memory", ...ram },
    { kind: "Storage", ...SSDS[needs.storageTb] },
    { kind: "Power supply", ...PSUS[requiredPsu(cpu, gpu)] },
    { kind: "Case", ...CASES[needs.showcase ? "showcase" : "airflow"] },
  ].map(({ kind, name, price }) => ({ kind, name, price }) as Part);
  if (!cpu.coolerIncluded) parts.push({ kind: "CPU cooler", ...COOLER });

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

export function solve(needs: Needs, budget: number, count = 3) {
  const all = CPUS.flatMap((cpu) => GPUS.flatMap((gpu) => RAMS.map((ram) => assemble(cpu, gpu, ram, needs)))).filter(
    (build): build is Build => build !== null,
  );
  const ranked = all.filter((build) => build.total <= budget).sort((a, b) => b.score - a.score || a.total - b.total);

  const builds: Build[] = [];
  for (const build of ranked) {
    if (builds.length === count) break;
    if (!builds.some((picked) => picked.gpu === build.gpu)) builds.push(build);
  }
  return { builds, cheapest: Math.min(...all.map((build) => build.total)) };
}
