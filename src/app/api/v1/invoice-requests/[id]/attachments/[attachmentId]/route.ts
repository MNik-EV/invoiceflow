import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { prisma } from "@/lib/db/prisma";
import { getDocumentStorage } from "@/modules/attachments/infrastructure/local-document-storage";
import { requireIdentity } from "@/modules/identity/application/session";
import { assertCanViewRequest } from "@/modules/identity/domain/permissions";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const context = await getRequestContext();
  try {
    const identity = await requireIdentity();
    const { id, attachmentId } = await params;
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, requestId: id, storageStatus: "AVAILABLE" },
      include: { request: { select: { creatorId: true } } },
    });
    if (!attachment)
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "فایل پیدا نشد." } },
        { status: 404 },
      );
    assertCanViewRequest(identity, attachment.request.creatorId);
    const bytes = await getDocumentStorage().read(attachment.storageKey);
    const safeName = encodeURIComponent(attachment.originalName);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mediaType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${attachment.mediaType === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${safeName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "x-request-id": context.correlationId,
      },
    });
  } catch (error) {
    const response = toErrorResponse(error, context.correlationId);
    return NextResponse.json(response.body, { status: response.status });
  }
}
