function resolveApiBase(): string {
  const env = (process.env.NEXT_PUBLIC_API || "").trim().replace(/\/+$/, "");
  if (env) return env;
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

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

export function saveSession(token: string, refresh: string, user: any, remember: boolean = true) {
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
    if (e.name === "TypeError" && /fetch|network|load failed/i.test(e.message)) {
      return new Error(`Cannot reach the API at ${base}. Is the backend running?`);
    }
    if (e.name === "AbortError") {
      return new Error(`Request to ${base} timed out.`);
    }
    return e;
  }
  return new Error(`Cannot reach the API at ${base}.`);
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

export function fileUrl(p: string | null | undefined): string {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${resolveApiBase()}${p.startsWith("/") ? p : `/${p}`}`;
}

export function money(n: number, currency: string = "USD") {
  if (!n) return "—";
  const sym = currency === "EUR" ? "€" : (currency === "GBP" ? "£" : "$");
  return n >= 1000 ? `${sym}${Math.round(n / 1000)}k` : `${sym}${n}`;
}

export function salaryRange(a: number, b: number, currency: string = "USD") {
  if (!a && !b) return "Salary not listed";
  return `${money(a, currency)} – ${money(b, currency)}`;
}

// ---------- Marketplace Helpers ----------
export async function getCandidateJobs() {
  return api("/api/candidate/jobs");
}

export async function applyToJob(jobId: string) {
  return api(`/api/candidate/apply/${jobId}`, { method: "POST" });
}

export async function uploadResumeFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm("/api/resumes/upload", form);
}

export async function getCandidateResumeStatus() {
  return api("/api/candidate/resume/status");
}

export async function getCandidateProjects() {
  return api("/api/candidate/projects");
}

export async function addCandidateProject(proj: { label: string; url: string; project_type?: string; description?: string }) {
  return api("/api/candidate/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proj),
  });
}

export async function deleteCandidateProject(id: string) {
  return api(`/api/candidate/projects/${id}`, { method: "DELETE" });
}

export async function getRecruiterCandidates(jobId?: string) {
  const q = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return api(`/api/employer/candidates${q}`);
}

export async function getRecruiterCandidate(id: string) {
  return api(`/api/employer/candidate/${id}`);
}

export async function getRecruiterJobs() {
  return api("/api/employer/jobs");
}

export async function createRecruiterJob(data: any) {
  return api("/api/employer/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getConversations() {
  return api("/api/conversations");
}

export async function getConversationMessages(convId: string) {
  return api(`/api/conversations/${convId}/messages`);
}

export async function sendConversationMessage(convId: string, content: string) {
  return api(`/api/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function startConversation(candidateId: string, jobId?: string, initialMessage?: string) {
  return api("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, initial_message: initialMessage }),
  });
}

export async function magicLogin(email: string, inviteCode?: string) {
  return api("/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, invite_code: inviteCode }),
  });
}

export async function validateInvitation(token: string) {
  return api(`/invitations/validate?token=${encodeURIComponent(token)}`);
}

export async function forgotPassword(email: string) {
  return api("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return api("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function onboardCandidate(data: any) {
  return api("/api/candidate/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function onboardCandidateWithFile(formData: FormData) {
  const base = resolveApiBase();
  const res = await fetch(`${base}/api/candidate/onboard-file`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Failed to complete onboarding.");
  }
  return data;
}

export async function joinRecruiterWaitlist(data: {
  name: string;
  email: string;
  company_name: string;
  company_website?: string;
  hiring_needs?: string;
}) {
  return api("/api/recruiter-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function joinWaitlist(email: string, name?: string, inviteCode?: string) {
  return api("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, invite_code: inviteCode }),
  });
}

export async function joinCandidateWaitlist(data: {
  name?: string;
  email: string;
  role_interest?: string;
  current_company?: string;
  linkedin_url?: string;
  notes?: string;
}) {
  return api("/api/candidate-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function trigger10amDispatch() {
  return api("/api/candidate/run-10am", {
    method: "POST",
  });
}

export async function getCandidateProfile() {
  return api("/api/candidate/profile");
}

export async function updateCandidateProfile(data: any) {
  return api("/api/candidate/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}


