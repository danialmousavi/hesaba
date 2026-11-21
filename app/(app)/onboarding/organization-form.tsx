"use client";

import { useActionState } from "react";
import { createInitialOrganization } from "./actions";
import type { OrganizationActionState } from "./actions";

const initialOrganizationActionState: OrganizationActionState = { error: null };

export function OrganizationForm() {
  const [state, formAction, isPending] = useActionState(
    createInitialOrganization,
    initialOrganizationActionState,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="name">
          نام سازمان
        </label>
        <input
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          id="name"
          name="name"
          autoComplete="organization"
          placeholder="مثلاً شرکت نمونه"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="slug">
          شناسهٔ یکتا
        </label>
        <input
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          id="slug"
          name="slug"
          type="text"
          dir="ltr"
          autoComplete="off"
          placeholder="sample-company"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          فقط حروف انگلیسی کوچک، عدد و خط تیره؛ مانند sample-company
        </p>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "در حال ایجاد سازمان…" : "ایجاد و ادامه"}
      </button>
    </form>
  );
}
