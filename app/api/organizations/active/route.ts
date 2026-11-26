import { z } from "zod";
import { activeOrganizationTestEnabled, resolveActiveOrganization, selectActiveOrganization } from "@/lib/active-organization";
import { isTransactionConflict } from "@/lib/prisma-errors";

const options = { headers: { "Cache-Control": "private, no-store" } };
const response = (body: object, status = 200) => Response.json(body, { ...options, status });

export async function GET(request: Request) {
  if (!activeOrganizationTestEnabled()) return response({ error: "مسیر پیدا نشد." }, 404);
  try {
    const result = await resolveActiveOrganization(request.headers);
    if (result.state === "UNAUTHENTICATED") return response({ error: "ابتدا وارد حساب شوید." }, 401);
    if (result.state === "ACTIVE") return response({ state: result.state, active: { organization: result.organization, role: result.role }, memberships: result.memberships });
    return response({ state: result.state, active: null, memberships: result.memberships });
  } catch (error) {
    if (isTransactionConflict(error)) return response({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, 409);
    console.error("Active organization resolution failed", error);
    return response({ error: "دریافت سازمان انجام نشد." }, 500);
  }
}

export async function POST(request: Request) {
  if (!activeOrganizationTestEnabled()) return response({ error: "مسیر پیدا نشد." }, 404);
  if (request.headers.get("origin") !== new URL(request.url).origin) return response({ error: "مبدأ درخواست معتبر نیست." }, 403);
  const parsed = z.strictObject({ organizationId: z.string().cuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "شناسه سازمان معتبر نیست." }, 400);
  try {
    const result = await selectActiveOrganization(request.headers, parsed.data.organizationId);
    if (result.state === "UNAUTHENTICATED") return response({ error: "ابتدا وارد حساب شوید." }, 401);
    if (result.state === "FORBIDDEN") return response({ error: "دسترسی مجاز نیست." }, 403);
    return response({ state: result.state, active: { organization: result.organization, role: result.role } });
  } catch (error) {
    if (isTransactionConflict(error)) return response({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, 409);
    console.error("Active organization selection failed", error);
    return response({ error: "انتخاب سازمان انجام نشد." }, 500);
  }
}
