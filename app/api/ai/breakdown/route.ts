import { handleBreakdown } from "@/lib/ai/breakdown";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleBreakdown(request);
}
