import { z } from "zod";
import { buildClosingPreview, closingInputSchema } from "@/lib/fiscal-close-preview";
import { prisma } from "@/lib/prisma";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const id = z.string().cuid().safeParse((await params).id);
  const input = closingInputSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return Response.json({ error: "اطلاعات پیش‌نمایش معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      return buildClosingPreview(tx, member.organizationId, id.data, input.data);
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json({ ...result, canConfirm: member.role === "ADMIN" && result.blockers.length === 0, previewOnly: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Fiscal closing preview failed", error);
    return Response.json({ error: "محاسبه پیش‌نمایش اختتامیه انجام نشد." }, { status: 500 });
  }
}
