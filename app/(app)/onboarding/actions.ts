"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "نام سازمان باید حداقل ۲ کاراکتر باشد.").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "شناسه باید حداقل ۳ کاراکتر باشد.")
    .max(63, "شناسه نمی‌تواند بیشتر از ۶۳ کاراکتر باشد.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "شناسه فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
    ),
});

export type OrganizationActionState = {
  error: string | null;
};

export async function createInitialOrganization(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "اطلاعات واردشده معتبر نیست." };
  }

  const [existingMembership, existingOrganization] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.organization.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    }),
  ]);

  if (existingMembership) {
    redirect("/dashboard");
  }

  if (existingOrganization) {
    return { error: "این شناسهٔ سازمان قبلاً استفاده شده است." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.organization.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          memberships: {
            create: {
              userId: session.user.id,
              role: "ADMIN",
            },
          },
        },
      });
    });
  } catch {
    return { error: "ایجاد سازمان انجام نشد. ممکن است این شناسه قبلاً استفاده شده باشد." };
  }

  redirect("/dashboard");
}
