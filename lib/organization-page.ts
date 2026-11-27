import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guardOrganizationRead, organizationContext, OrganizationContextError, type OrganizationContext } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

type PageOrganization = OrganizationContext & { organization: { id: string; name: string; slug: string; createdAt: Date } };

export async function readOrganizationPage<T>(read: (tx: Prisma.TransactionClient, member: PageOrganization) => Promise<T>) {
  const request = new Request("http://localhost/", { headers: await headers() });
  const context = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (context instanceof OrganizationContextError) {
    if (context.status === 401) redirect("/sign-in");
    if (context.status === 403) redirect("/onboarding");
    redirect("/select-organization");
  }
  if (isTransactionConflict(context)) redirect("/select-organization");
  if (context instanceof Error) throw context;
  try {
    return await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, context);
      const organization = await tx.organization.findUnique({ where: { id: context.organizationId }, select: { id: true, name: true, slug: true, createdAt: true } });
      if (!organization) throw new OrganizationContextError(409, "سازمان معتبر نیست.");
      const member = { ...context, organization };
      return { member, data: await read(tx, member) };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof OrganizationContextError || isTransactionConflict(error)) redirect("/select-organization");
    throw error;
  }
}
