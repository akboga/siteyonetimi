import { NextResponse } from "next/server";
import { generateMonthlyDuesForAllSites } from "@/lib/dues-generation";

export const runtime = "nodejs";

/**
 * Her ayın 1'inde tetiklenmesi gereken uç nokta — barındırma platformundan bağımsız tasarlandı
 * (Vercel Cron, sistem cron'u + curl, GitHub Actions scheduled workflow vb. herhangi biri
 * `Authorization: Bearer <CRON_SECRET>` header'ıyla bu route'u tetikleyebilir).
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateMonthlyDuesForAllSites();
  return NextResponse.json(result);
}
