import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_API_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

/**
 * Custom fetch wrapper for Supabase.
 *
 * Strips double quotes from the `columns` query parameter while
 * preserving the headers Supabase supplies.
 */
const customFetch = async (
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> => {
  let requestInput = input;

  if (typeof input === "string" || input instanceof URL) {
    const urlObj = new URL(input.toString());

    if (urlObj.searchParams.has("columns")) {
      const columns = urlObj.searchParams.get("columns") ?? "";
      urlObj.searchParams.set("columns", columns.replaceAll('"', ""));
      requestInput = urlObj.toString();
    }
  }

  const headers = new Headers(options.headers);
  headers.set("apikey", supabaseKey);

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${supabaseKey}`);
  }

  return fetch(requestInput, {
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
