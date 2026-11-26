"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JournalFocus() {
  const router = useRouter();
  useEffect(() => {
    function focus() {
      const id = window.location.hash.match(/^#journal-(c[a-z0-9]+)$/i)?.[1];
      if (!id) return;
      const element = document.getElementById(`journal-${id}`);
      if (element instanceof HTMLDetailsElement) { element.open = true; element.scrollIntoView({ block: "center" }); return; }
      const url = new URL(window.location.href);
      if (url.searchParams.get("focus") !== id) { url.searchParams.set("focus", id); router.replace(`${url.pathname}?${url.searchParams}${url.hash}`); }
    }
    focus(); window.addEventListener("hashchange", focus);
    return () => window.removeEventListener("hashchange", focus);
  });
  return null;
}
