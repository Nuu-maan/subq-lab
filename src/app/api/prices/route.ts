import { after, connection } from "next/server";
import { priceStatus, refreshPrices } from "@/lib/server/live-prices";

export async function GET() {
  await connection();
  const status = await priceStatus();
  const refresh = status.stale && !status.refreshing && !status.error;
  if (refresh) after(refreshPrices);
  return Response.json({ ...status, refreshing: status.refreshing || refresh });
}

export async function POST() {
  after(refreshPrices);
  return Response.json({ ...(await priceStatus()), refreshing: true }, { status: 202 });
}
