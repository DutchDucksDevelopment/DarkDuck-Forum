import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_API_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

/**
 * Custom fetch wrapper for Supabase.
 *
 * 1. Strips double quotes from the `columns` query parameter,
 *    which breaks Supabase's count queries when they get encoded twice.
 * 2. Guarantees that `apikey` and `Authorization` headers are always
 *    present, while preserving any headers the Supabase client
 *    has already set (e.g. the user's access token).
 */
const customFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const urlObj = new URL(url);

  // Remove ALL double quotes from the columns parameter
  if (urlObj.searchParams.has("columns")) {
    const columns = urlObj.searchParams.get("columns");
    urlObj.searchParams.set("columns", columns?.split('"').join("") || "");
    url = urlObj.toString();
  }

  // Start from any headers already set by the Supabase client
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // apikey must always be present
  headers.apikey = supabaseKey;

  // Preserve an existing Authorization header (e.g. the user's
  // access token); fall back to the anon key if none is set
  if (!headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${supabaseKey}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export const supaClient = createClient<Database>(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      apikey: supabaseKey,
    },
    fetch: customFetch,
  },
  db: {
    schema: "public",
  },
});
