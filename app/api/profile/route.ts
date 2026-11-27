import { auth } from "@/lib/auth";

const options = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { ...options, status: 401 });
  return Response.json({ profile: { id: session.user.id, name: session.user.name, email: session.user.email, emailVerified: session.user.emailVerified, createdAt: session.user.createdAt } }, options);
}
