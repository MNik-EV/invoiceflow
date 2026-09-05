import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getDocumentStorage } from "@/modules/attachments/infrastructure/local-document-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const allowance = await prisma.systemSetting.findUnique({
      where: { key: "lunch.allowance_toman" },
      select: { value: true },
    });
    if (!allowance) throw new Error("Required setting is missing");
    if (!(await getDocumentStorage().exists(".")))
      throw new Error("Document storage is unavailable");
    return NextResponse.json({
      status: "ready",
      checks: { database: "ok", settings: "ok", storage: "ok" },
    });
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", event: "readiness_failed", error }),
    );
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
