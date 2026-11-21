import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const date = z.iso.date().refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const inputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  startDate: date,
  endDate: date,
}).refine((value) => value.endDate > value.startDate, {
  message: "تاریخ پایان باید بعد از تاریخ شروع باشد.",
});

async function membership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true, user: { select: { id: true, name: true } } },
  });
}

export async function GET(request: Request) {
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const years = await prisma.fiscalYear.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true, status: true },
  });
  return Response.json({ years }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }
  const member = await membership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role !== "ADMIN") return Response.json({ error: "فقط مدیر می‌تواند سال مالی ایجاد کند." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  try {
    const overlap = await prisma.fiscalYear.findFirst({
      where: { organizationId: member.organizationId, startDate: { lte: new Date(`${parsed.data.endDate}T00:00:00.000Z`) }, endDate: { gte: new Date(`${parsed.data.startDate}T00:00:00.000Z`) } },
      select: { id: true },
    });
    if (overlap) return Response.json({ error: "بازهٔ تاریخ با یک سال مالی دیگر هم‌پوشانی دارد." }, { status: 409 });
    const year = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.create({
      data: {
        organizationId: member.organizationId,
        name: parsed.data.name,
        startDate: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
        endDate: new Date(`${parsed.data.endDate}T00:00:00.000Z`),
      },
      select: { id: true, name: true, startDate: true, endDate: true, status: true },
      });
      await tx.fiscalYearEvent.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, actorId: member.user.id, actorName: member.user.name, type: "CREATED", details: { name: year.name, startDate: parsed.data.startDate, endDate: parsed.data.endDate } } });
      return year;
    });
    return Response.json({ year }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "نام سال مالی تکراری است یا یک سال مالی باز وجود دارد." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004") {
      return Response.json({ error: "بازهٔ تاریخ با یک سال مالی دیگر هم‌پوشانی دارد." }, { status: 409 });
    }
    console.error("Fiscal year creation failed", error);
    return Response.json({ error: "ایجاد سال مالی انجام نشد." }, { status: 500 });
  }
}
