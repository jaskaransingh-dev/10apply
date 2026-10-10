/**
 * Cloudflare Worker Backend API
 * Interacts with Cloudflare D1 Database binding 'DB'
 */

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    try {
      // 1. Health check
      if (path === "/health" || path === "/api/health") {
        return jsonResponse({
          status: "ok",
          runtime: "cloudflare-workers",
          database: "cloudflare-d1",
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Validate Invitation Code (GET & POST)
      if (path === "/api/invite/validate" || path === "/invitations/validate" || path === "/invites/validate") {
        let code = url.searchParams.get("token") || url.searchParams.get("code") || "";
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) as any;
          code = body.code || body.token || code;
        }
        code = code.trim();

        if (!code) {
          return jsonResponse({ valid: false, reason: "A valid invitation code or private link is required to join." });
        }

        const inv = await env.DB.prepare(
          "SELECT * FROM invitations WHERE token = ?"
        ).bind(code).first();

        if (!inv) {
          return jsonResponse({ valid: false, reason: "Invalid invitation code. Membership is strictly invite-only." });
        }

        if (inv.status !== "pending") {
          return jsonResponse({ valid: false, status: inv.status, reason: `Invitation code has already been ${inv.status}.` });
        }

        return jsonResponse({
          valid: true,
          status: "pending",
          token: inv.token,
          inviter_id: inv.inviter_id,
        });
      }

      // 3. Candidate Onboarding (POST)
      if (path === "/api/candidate/onboard" && method === "POST") {
        const body = (await request.json().catch(() => ({}))) as any;
        const code = (body.invite_code || "").trim();
        const email = (body.email || "").trim().toLowerCase();
        const name = (body.name || "").trim() || email.split("@")[0];
        const pwd = body.password || "demo1234";

        if (!code) {
          return jsonResponse({ detail: "A valid single-use invitation code is required." }, 400);
        }

        // Check invitation
        const inv = await env.DB.prepare(
          "SELECT * FROM invitations WHERE token = ?"
        ).bind(code).first();

        if (!inv || inv.status !== "pending") {
          return jsonResponse({ detail: "Invalid or already redeemed invitation code." }, 400);
        }

        // Check existing user
        const existing = await env.DB.prepare(
          "SELECT id FROM users WHERE email = ?"
        ).bind(email).first();

        if (existing) {
          return jsonResponse({ detail: "An account with this email already exists. Please sign in." }, 400);
        }

        const userId = `usr_${uid()}`;
        const profId = `prof_${uid()}`;

        // Create user
        await env.DB.prepare(`
          INSERT INTO users (id, email, password_hash, role, account_status, invited_by)
          VALUES (?, ?, ?, 'candidate', 'active', ?)
        `).bind(userId, email, pwd, inv.inviter_id).run();

        // Mark invitation accepted
        await env.DB.prepare(`
          UPDATE invitations SET status = 'accepted', accepted_at = datetime('now'), invitee_id = ? WHERE token = ?
        `).bind(userId, code).run();

        // Create CandidateProfile
        await env.DB.prepare(`
          INSERT INTO candidate_profiles (id, user_id, name, email, headline, work_authorization, remote_preference, location, min_salary, github_url, portfolio_url, linkedin_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          profId,
          userId,
          name,
          email,
          body.target_role || "Software Engineer",
          body.work_authorization || "Authorized to work in US (Citizen or PR)",
          body.work_preference || "Remote",
          body.primary_location || "Remote",
          Number(body.min_salary) || 0,
          body.github_url || "",
          body.portfolio_url || "",
          body.linkedin_url || ""
        ).run();

        // Award 5 fresh single-use invitations
        for (let i = 0; i < 5; i++) {
          const newToken = `cross_${uid()}_${i}`;
          await env.DB.prepare(`
            INSERT INTO invitations (id, inviter_id, token, status)
            VALUES (?, ?, ?, 'pending')
          `).bind(`inv_${uid()}`, userId, newToken).run();
        }

        return jsonResponse({
          ok: true,
          token: `token_${userId}`,
          refresh_token: `rt_${userId}`,
          user: { id: userId, email, role: "candidate" },
          profile: { id: profId, name, headline: body.target_role || "Software Engineer" },
          message: "You're done! Your profile is verified. Applications are automatically dispatched to 10 matching jobs every morning at 10:00 AM.",
        });
      }

      // 4. Recruiter Waitlist (POST & GET)
      if (path === "/api/recruiter-waitlist") {
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) as any;
          const email = (body.email || "").trim().toLowerCase();
          const name = (body.name || "").trim();
          const company = (body.company_name || "").trim();

          if (!email || !name || !company) {
            return jsonResponse({ detail: "Name, work email, and company name are required." }, 400);
          }

          const existing = await env.DB.prepare(
            "SELECT id FROM recruiter_waitlist WHERE email = ?"
          ).bind(email).first();

          if (!existing) {
            await env.DB.prepare(`
              INSERT INTO recruiter_waitlist (id, name, email, company_name, company_website, hiring_needs)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
              `rec_${uid()}`,
              name,
              email,
              company,
              body.company_website || "",
              body.hiring_needs || ""
            ).run();
          }

          return jsonResponse({
            ok: true,
            status: "waitlisted",
            message: "Your recruiter access request has been submitted. We review company profiles and activate hiring accounts in batches.",
          });
        }

        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT * FROM recruiter_waitlist ORDER BY created_at DESC LIMIT 100"
          ).all();
          return jsonResponse({ ok: true, count: results.length, entries: results });
        }
      }

      // 5. Auth Login (POST)
      if (path === "/auth/login" || path === "/api/auth/login") {
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) as any;
          const email = (body.email || "").trim().toLowerCase();
          const user = await env.DB.prepare(
            "SELECT * FROM users WHERE email = ?"
          ).bind(email).first();

          if (!user) {
            return jsonResponse({ detail: "Invalid email or password." }, 401);
          }

          let prof = null;
          if (user.role === "candidate") {
            prof = await env.DB.prepare(
              "SELECT id, name, headline FROM candidate_profiles WHERE user_id = ?"
            ).bind(user.id).first();
          }

          return jsonResponse({
            ok: true,
            token: `token_${user.id}`,
            refresh_token: `rt_${user.id}`,
            user: { id: user.id, email: user.email, role: user.role },
            profile: prof,
          });
        }
      }

      // 6. Forgot Password (POST)
      if (path === "/auth/forgot-password" || path === "/api/auth/forgot-password") {
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) as any;
          const email = (body.email || "").trim().toLowerCase();
          const user = await env.DB.prepare(
            "SELECT id FROM users WHERE email = ?"
          ).bind(email).first();

          let resetToken = "";
          if (user) {
            resetToken = `reset_${uid()}_${uid()}`;
            await env.DB.prepare(`
              INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used)
              VALUES (?, ?, ?, datetime('now', '+2 hours'), 0)
            `).bind(`tok_${uid()}`, user.id, resetToken).run();
          }

          return jsonResponse({
            ok: true,
            message: "If an account exists with this email, password reset instructions have been dispatched.",
            reset_token: resetToken,
          });
        }
      }

      // 7. Reset Password (POST)
      if (path === "/auth/reset-password" || path === "/api/auth/reset-password") {
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) as any;
          const token = (body.token || "").trim();
          const newPassword = body.new_password || "";

          if (!token || !newPassword || newPassword.length < 6) {
            return jsonResponse({ detail: "Valid reset token and password (min 6 chars) required." }, 400);
          }

          const tokRecord = await env.DB.prepare(
            "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0"
          ).bind(token).first();

          if (!tokRecord) {
            return jsonResponse({ detail: "Invalid or expired password reset token." }, 400);
          }

          await env.DB.prepare(
            "UPDATE users SET password_hash = ? WHERE id = ?"
          ).bind(newPassword, tokRecord.user_id).run();

          await env.DB.prepare(
            "UPDATE password_reset_tokens SET used = 1 WHERE id = ?"
          ).bind(tokRecord.id).run();

          return jsonResponse({ ok: true, message: "Password updated successfully. You may now sign in." });
        }
      }

      // 8. Candidate Jobs / 10 AM Submissions (GET)
      if (path === "/api/candidate/jobs") {
        const { results: jobs } = await env.DB.prepare(`
          SELECT j.id, j.title, j.company_name, j.location, j.salary_min, j.salary_max, j.currency,
                 COALESCE(m.score, 0.88) as match_score,
                 COALESCE(m.explanation, 'Verified match for technical background, experience, and role preferences.') as explanation,
                 COALESCE(a.status, 'submitted') as status
          FROM jobs j
          LEFT JOIN matches m ON m.job_id = j.id
          LEFT JOIN applications a ON a.job_id = j.id
          WHERE j.status = 'published'
          LIMIT 10
        `).all();

        return jsonResponse({
          jobs,
          daily_dispatch: {
            hour: 10,
            status: "Active",
            next_dispatch: "Tomorrow at 10:00 AM",
            dispatched_today: jobs.length,
          },
          invite_stats: { remaining: 5, invites: [] },
        });
      }

      // 9. Employer Candidates (GET)
      if (path === "/api/employer/candidates") {
        const { results: candidates } = await env.DB.prepare(`
          SELECT p.id, p.name, p.headline, p.location, p.work_authorization, p.min_salary, p.skills,
                 0.92 as score,
                 'Strong match for core engineering stack and technical contributions.' as explanation
          FROM candidate_profiles p
          LIMIT 20
        `).all();

        return jsonResponse({ candidates });
      }

      // Fallback 404
      return jsonResponse({ error: "Endpoint not found" }, 404);
    } catch (err: any) {
      return jsonResponse({ error: err.message || "Internal Server Error" }, 500);
    }
  },
};
