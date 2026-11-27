"use client";

// The rendered page's organization is a precondition, never an authorization source.
const invalidatedKey = "__hesabaOrganizationInvalidated";

function hasChangedOrganization() {
  return Boolean((window as Window & { [invalidatedKey]?: boolean })[invalidatedKey]);
}

/** Prevent a response from a previous organization being rendered after a tab change. */
export function invalidateOrganizationRequests() {
  (window as Window & { [invalidatedKey]?: boolean })[invalidatedKey] = true;
}

export function organizationFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const address = new URL(request?.url ?? String(input), window.location.origin);
  const organizationId = document.querySelector<HTMLElement>("[data-active-organization-id]")?.dataset.activeOrganizationId;
  if (!organizationId || address.origin !== window.location.origin || !address.pathname.startsWith("/api/") || address.pathname === "/api/organizations/active" || ["GET", "HEAD", "OPTIONS"].includes(method)) {
    return window.fetch(input, init).then((response) => {
      if (hasChangedOrganization()) throw new DOMException("سازمان فعال تغییر کرده است.", "AbortError");
      return response;
    });
  }
  const headers = new Headers(init?.headers ?? request?.headers);
  headers.set("x-expected-organization-id", organizationId);
  return window.fetch(input, { ...init, headers }).then((response) => {
    if (hasChangedOrganization()) throw new DOMException("سازمان فعال تغییر کرده است.", "AbortError");
    return response;
  });
}
