import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema, productFields } from "@/lib/product-validation";

const querySchema = z.object({
  search: z.string().trim().max(150).default(""),
  type: z.enum(["all", "goods", "service"]).default("all"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

async function membership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
}

export async function GET(request: Request) {
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const { search, type, status, page, pageSize } = parsed.data;
  const where: Prisma.ProductWhereInput = {
    organizationId: member.organizationId,
    ...(type === "all" ? {} : { type: type === "goods" ? "GOODS" : "SERVICE" }),
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
  };
  try {
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({ where, select: productFields, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return Response.json({ products, total, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Product list failed", error);
    return Response.json({ error: "دریافت فهرست کالا و خدمات انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه ثبت کالا یا خدمت ندارد." }, { status: 403 });
  const parsed = createProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  try {
    const product = await prisma.product.create({ data: { ...parsed.data, organizationId: member.organizationId }, select: productFields });
    return Response.json({ product }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "این کد در سازمان شما قبلاً استفاده شده است." }, { status: 409 });
    console.error("Product creation failed", error);
    return Response.json({ error: "ثبت کالا یا خدمت انجام نشد." }, { status: 500 });
  }
}
