import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { guardOrganizationRead, guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";

const inputSchema = z.strictObject({ purpose: z.enum(["RECEIVABLE", "PAYABLE"]), accountId: z.string().cuid().nullable() });
const idSchema = z.string().cuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه شخص معتبر نیست." }, { status: 400 });
  try {
    const party = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      return tx.party.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { accountLinks: { select: { purpose: true, firstUsedAt: true, account: { select: { id: true, code: true, name: true, type: true, isActive: true } } }, orderBy: { purpose: "asc" } } } });
    }, { isolationLevel: "RepeatableRead" });
    if (!party) return Response.json({ error: "شخص پیدا نشد." }, { status: 404 });
    return Response.json({ links: party.accountLinks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Party account list failed", error);
    return Response.json({ error: "دریافت حساب‌های شخص انجام نشد." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role !== "ADMIN") return Response.json({ error: "فقط مدیر می‌تواند اتصال حساب را تغییر دهد." }, { status: 403 });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه شخص معتبر نیست." }, { status: 400 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "کاربرد و حساب معتبر انتخاب کنید." }, { status: 400 });
  const { purpose, accountId } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN"]);
      await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const party = await tx.party.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { isActive: true, isCustomer: true, isSupplier: true } });
      if (!party) return { error: "شخص پیدا نشد.", status: 404 } as const;
      const old = await tx.partyAccount.findUnique({ where: { organizationId_partyId_purpose: { organizationId: member.organizationId, partyId: id.data, purpose } }, select: { id: true, accountId: true, firstUsedAt: true } });
      const accountIds = [...new Set([old?.accountId, accountId].filter((value): value is string => Boolean(value)))].sort();
      for (const lockedId of accountIds) await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${lockedId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      if (old?.accountId === accountId || (!old && !accountId)) return { changed: false } as const;
      if (old && (old.firstUsedAt || await tx.journalLine.findFirst({ where: { organizationId: member.organizationId, accountId: old.accountId }, select: { id: true } }))) return { error: "حساب استفاده‌شده در سند قابل قطع یا تعویض نیست.", status: 409 } as const;
      if (accountId) {
        if (!party.isActive || (purpose === "RECEIVABLE" ? !party.isCustomer : !party.isSupplier)) return { error: "شخص باید فعال و دارای نقش مرتبط باشد.", status: 400 } as const;
        const account = await tx.ledgerAccount.findFirst({ where: { id: accountId, organizationId: member.organizationId }, select: { type: true, isActive: true } });
        if (!account || !account.isActive || account.type !== (purpose === "RECEIVABLE" ? "ASSET" : "LIABILITY")) return { error: "حساب باید فعال، هم‌سازمانی و متناسب با کاربرد باشد.", status: 400 } as const;
        if (await tx.ledgerAccount.findFirst({ where: { organizationId: member.organizationId, parentId: accountId }, select: { id: true } })) return { error: "حساب دارای زیرحساب قابل اتصال نیست.", status: 409 } as const;
        if (await tx.journalLine.findFirst({ where: { organizationId: member.organizationId, accountId }, select: { id: true } })) return { error: "حسابی که قبلاً در سند استفاده شده قابل اتصال نیست.", status: 409 } as const;
        if (await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, accountId }, select: { id: true } })) return { error: "این حساب قبلاً به شخصی اختصاص یافته است.", status: 409 } as const;
      }
      if (old && accountId) await tx.partyAccount.update({ where: { id: old.id }, data: { accountId } });
      else if (old) await tx.partyAccount.delete({ where: { id: old.id } });
      else if (accountId) await tx.partyAccount.create({ data: { organizationId: member.organizationId, partyId: id.data, purpose, accountId } });
      await tx.partyAccountEvent.create({ data: { organizationId: member.organizationId, partyId: id.data, purpose, type: old ? (accountId ? "CHANGED" : "UNLINKED") : "LINKED", actorId: member.userId, actorName: member.userName, oldAccountId: old?.accountId ?? null, newAccountId: accountId } });
      return { changed: true } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return Response.json({ error: "تغییر هم‌زمان یا استفاده تکراری از حساب رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Party account update failed", error);
    return Response.json({ error: "تغییر اتصال حساب انجام نشد." }, { status: 500 });
  }
}
