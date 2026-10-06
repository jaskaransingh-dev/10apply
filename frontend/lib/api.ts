function resolveApiBase(): string {
  const env = (process.env.NEXT_PUBLIC_API || "").trim().replace(/\/+$/, "");
  if (env) return env;
  // Runtime fallback: same host as the page, backend on :8000.
  // This fixes "Failed to fetch" when the app is opened via 127.0.0.1
  // but NEXT_PUBLIC_API was baked as localhost (or vice versa).
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

// Kept for backwards compat, but prefer apiBase() (runtime-aware).
export const API =
  (process.env.NEXT_PUBLIC_API || "").trim().replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

export function apiBase(): string {
  return resolveApiBase();
}

export function token() {
  return readSession("token");
}

export function refreshToken() {
  return readSession("refresh_token");
}

export function authUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(readSession("user") || "null");
  } catch {
    return null;
  }
}

/** Session storage. Remember-me => localStorage (survives restarts);
 *  otherwise sessionStorage (this tab only). Reads check both. */
function rememberMe(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("remember") !== "off";
}

function clean(v: string | null): string {
  const t = (v || "").trim();
  if (!t || t === "null" || t === "undefined") return "";
  return t;
}

function readSession(key: string): string {
  if (typeof window === "undefined") return "";
  return clean(localStorage.getItem(key)) || clean(sessionStorage.getItem(key));
}

export function saveSession(token: string, refresh: string, user: any, remember: boolean) {
  if (typeof window === "undefined") return;
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  localStorage.setItem("remember", remember ? "on" : "off");
  if (token) store.setItem("token", token);
  if (refresh) store.setItem("refresh_token", refresh);
  if (user) store.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  for (const s of [localStorage, sessionStorage]) {
    s.removeItem("token");
    s.removeItem("refresh_token");
    s.removeItem("user");
  }
}

/** Best-effort server logout (revokes refresh token), then clears locally. */
export async function logout() {
  const rt = refreshToken();
  const tk = token();
  try {
    if (rt || tk) {
      await fetch(`${resolveApiBase()}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        },
        body: JSON.stringify({ refresh_token: rt }),
      }).catch(() => null);
    }
  } finally {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}

/** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
let refreshPromise: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const rt = refreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${resolveApiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return false;
      saveSession(data.token, data.refresh_token || "", data.user || authUser(), rememberMe());
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const here = window.location.pathname || "";
  if (!here.startsWith("/login") && !here.startsWith("/signup")) {
    window.location.href = "/login";
  }
}

function friendlyError(e: unknown, base: string): Error {
  if (e instanceof Error) {
    // Undici / browser network failure surfaces as TypeError: Failed to fetch
    if (e.name === "TypeError" && /fetch|network|load failed/i.test(e.message)) {
      return new Error(
        `Cannot reach the API at ${base}. Is the backend running? Start it with: cd backend && uvicorn app.main:app --port 8000`
      );
    }
    // Abort / timeout
    if (e.name === "AbortError") {
      return new Error(`Request to ${base} timed out. Is the backend running?`);
    }
    return e;
  }
  return new Error(`Cannot reach the API at ${base}. Is the backend running?`);
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text.slice(0, 300) };
  }
}

export async function api(path: string, opts: RequestInit = {}, timeoutMs = 15000, _retried = false) {
  const base = resolveApiBase();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        ...(opts.headers || {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
    });
    const data = await parseBody(res);
    if (!res.ok) {
      // Expired access token? Silently refresh once and retry — this is what
      // keeps users logged in. Only falls through to login when refresh
      // is impossible (no refresh token, revoked, logged out elsewhere).
      if (res.status === 401 && !_retried && !path.startsWith("/auth/") && typeof window !== "undefined") {
        if (await tryRefresh()) {
          return api(path, opts, timeoutMs, true);
        }
        clearSession();
        redirectToLogin();
        throw new Error("Please log in to continue.");
      }
      throw new Error(data.detail || `Request failed (${res.status})`);
    }
    return data;
  } catch (e) {
    throw friendlyError(e, base);
  } finally {
    clearTimeout(t);
  }
}

/** POST/PUT helper for FormData (resume / JD upload). Don't set Content-Type manually. */
export async function apiForm(
  path: string,
  form: FormData,
  opts: RequestInit = {},
  timeoutMs = 30000
) {
  const headers = { ...(opts.headers || {}) } as Record<string, string>;
  delete headers["Content-Type"];
  return api(path, { ...opts, method: opts.method || "POST", headers, body: form }, timeoutMs);
}

/** Build an absolute URL for backend-served files (e.g. /uploads/x.pdf). */
export function fileUrl(p: string | null | undefined): string {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${resolveApiBase()}${p.startsWith("/") ? p : `/${p}`}`;
}

export function money(n: number) {
  if (!n) return "—";
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}
export function salaryRange(a: number, b: number) {
  if (!a && !b) return "Salary not listed";
  return `${money(a)} – ${money(b)}`;
}
