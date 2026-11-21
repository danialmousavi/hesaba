"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Feedback =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | null;

function getAuthErrorMessage(error: {
  message?: string;
  status?: number;
  statusText?: string;
  error?: unknown;
}) {
  const payloadMessage =
    typeof error.error === "object" &&
    error.error !== null &&
    "message" in error.error &&
    typeof error.error.message === "string"
      ? error.error.message
      : null;

  if (payloadMessage) {
    return payloadMessage;
  }

  if (error.message) {
    return error.message;
  }

  if (error.status) {
    return `ثبت‌نام انجام نشد (کد ${error.status}${error.statusText ? `: ${error.statusText}` : ""}).`;
  }

  return "ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید.";
}

export default function SignUpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !email || !password) {
      setFeedback({ kind: "error", message: "لطفاً همهٔ فیلدها را تکمیل کنید." });
      return;
    }

    if (password.length < 8) {
      setFeedback({
        kind: "error",
        message: "رمز عبور باید دست‌کم ۸ کاراکتر داشته باشد.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        setFeedback({
          kind: "error",
          message: getAuthErrorMessage(error),
        });
        return;
      }

      form.reset();
      setFeedback({
        kind: "success",
        message: "حساب شما با موفقیت ایجاد شد.",
      });
    } catch (error) {
      console.error("Sign-up failed:", error);
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-right text-slate-900"
      dir="rtl"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">حسابا</p>
        <h1 className="mt-2 font-modam text-2xl font-bold tracking-tight">
          ساخت حساب کاربری
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          اطلاعات خود را وارد کنید تا کار با حسابا را آغاز کنید.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="name">
              نام
            </label>
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="name"
              name="name"
              autoComplete="name"
              placeholder="مثلاً علی رضایی"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              ایمیل
            </label>
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              رمز عبور
            </label>
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="password"
              name="password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="mt-2 text-xs text-slate-500">حداقل ۸ کاراکتر</p>
          </div>

          {feedback ? (
            <p
              className={
                feedback.kind === "error"
                  ? "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  : "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              }
              role={feedback.kind === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "در حال ایجاد حساب…" : "ثبت‌نام"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          پیش‌تر حساب ساخته‌اید؟{" "}
          <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/sign-in">
            وارد شوید
          </Link>
        </p>
      </section>
    </main>
  );
}
