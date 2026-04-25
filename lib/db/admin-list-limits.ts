/**
 * PostgREST returns at most this many rows per HTTP request.
 * Must stay ≤ your project's `max_rows` (Supabase: Dashboard → Settings → API).
 * Default Supabase value is 1000 — do not raise this in code unless you raise that setting too.
 */
export const POSTGREST_PAGE_SIZE = 1000;

/**
 * Stop fetching after this many rows (members or diaspora lists).
 * Covers large national rolls without unbounded memory use.
 */
export const ADMIN_LIST_MAX_TOTAL_ROWS = 500_000;

/**
 * INEC export loads `portrait_data_url` in separate small queries — large base64 blobs per row
 * can exceed PostgREST / Postgres statement timeouts if fetched with full rows at 1k/page.
 */
export const INEC_PORTRAIT_FETCH_CHUNK = 5;
