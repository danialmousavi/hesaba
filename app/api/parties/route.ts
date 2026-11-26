import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createPartySchema, partyFields } from "@/lib/party-validation";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

const querySchema = z.object({
  search: z.string().trim().max(150).default(""),
  role: z.enum(["all", "customer", "supplier"]).default("all"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const { search, role, status, page, pageSize } = parsed.data;
  const where: Prisma.PartyWhereInput = {
    organizationId: member.organizationId,
    ...(role === "customer" ? { isCustomer: true } : role === "supplier" ? { isSupplier: true } : {}),
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };
  try {
    const [parties, total] = await prisma.$transaction([
      prisma.party.findMany({ where, select: partyFields, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.party.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return Response.json({ parties, total, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Party list failed", error);
    return Response.json({ error: "دریافت فهرست اشخاص انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه ثبت شخص ندارد." }, { status: 403 });
  const parsed = createPartySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  try {
    const party = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN", "ACCOUNTANT"]);
      return tx.party.create({ data: { ...parsed.data, organizationId: member.organizationId }, select: partyFields });
    }, { isolationLevel: "Serializable" });
    return Response.json({ party }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Party creation failed", error);
    return Response.json({ error: "ثبت شخص انجام نشد." }, { status: 500 });
  }
}
