import { NextResponse } from "next/server";
import { generateMonthlyDuesForAllSites } from "@/lib/dues-generation";

export const runtime = "nodejs";

/**
 * Her ayın 1'inde tetiklenmesi gereken uç nokta — barındırma platformundan bağımsız tasarlandı
 * (Vercel Cron, sistem cron'u + curl, GitHub Actions scheduled workflow vb. herhangi biri
 * `Authorization: Bearer <CRON_SECRET>` header'ıyla bu route'u tetikleyebilir).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateMonthlyDuesForAllSites();
  return NextResponse.json(result);
}

// Vercel Cron GET isteğiyle tetikler ve CRON_SECRET'i Authorization header'ına otomatik ekler;
// POST ise platform bağımsız manuel/harici tetikleme için (curl, GitHub Actions vb.) korunuyor.
export const GET = handle;
export const POST = handle;
