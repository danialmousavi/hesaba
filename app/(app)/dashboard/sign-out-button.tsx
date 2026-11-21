"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setErrorMessage(null);
    setIsSigningOut(true);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        setErrorMessage(error.message || "خروج از حساب انجام نشد. دوباره تلاش کنید.");
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setErrorMessage("ارتباط با سرویس خروج برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="text-left">
      <button
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSigningOut}
        onClick={handleSignOut}
        type="button"
      >
        {isSigningOut ? "در حال خروج…" : "خروج از حساب"}
      </button>
      {errorMessage ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
