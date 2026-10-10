/**
 * Supabase Client Configuration
 * Provides browser and server Supabase clients when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Direct file upload helper for Supabase Storage bucket 'resumes'.
 */
export async function uploadResumeToSupabase(file: File, path: string): Promise<{ path?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase storage is not configured." };
  }

  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/resumes/${encodeURIComponent(path)}`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.message || "Failed to upload file to Supabase storage." };
    }

    return { path };
  } catch (err: any) {
    return { error: err.message || "Error connecting to Supabase storage." };
  }
}
