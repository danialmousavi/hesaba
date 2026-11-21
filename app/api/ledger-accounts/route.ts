import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inputSchema = z.object({
  code: z.string().trim().regex(/^\d{1,20}$/, "کد حساب باید فقط شامل ۱ تا ۲۰ رقم باشد."),
  name: z.string().trim().min(2, "نام حساب باید حداقل ۲ کاراکتر باشد.").max(100),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  parentId: z.string().cuid().nullable().optional(),
});

async function membership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
}

export async function GET(request: Request) {
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const accounts = await prisma.ledgerAccount.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { code: "asc" },
    select: { id: true, parentId: true, code: true, name: true, type: true, isActive: true },
  });
  return Response.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role !== "ADMIN") {
    return Response.json({ error: "فقط مدیر سازمان می‌تواند حساب ایجاد کند." }, { status: 403 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });

  const parentId = parsed.data.parentId ?? null;
  try {
    const account = await prisma.$transaction(async (tx) => {
      if (parentId) {
        const parent = await tx.ledgerAccount.findFirst({ where: { id: parentId, organizationId: member.organizationId }, select: { type: true, isActive: true } });
        if (!parent || !parent.isActive || parent.type !== parsed.data.type) return null;
      }
      return tx.ledgerAccount.create({ data: { organizationId: member.organizationId, parentId, code: parsed.data.code, name: parsed.data.name, type: parsed.data.type }, select: { id: true, parentId: true, code: true, name: true, type: true, isActive: true } });
    }, { isolationLevel: "Serializable" });
    if (!account) return Response.json({ error: "حساب والد باید فعال، هم‌نوع و متعلق به سازمان شما باشد." }, { status: 400 });
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "این کد حساب در سازمان شما قبلاً استفاده شده است." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Ledger account creation failed", error);
    return Response.json({ error: "ایجاد حساب انجام نشد." }, { status: 500 });
  }
}
