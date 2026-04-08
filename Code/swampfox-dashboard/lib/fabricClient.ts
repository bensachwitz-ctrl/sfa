// ─────────────────────────────────────────────────────────────────────────────
// Fabric SQL client — two connection pools, server-side only.
//
//  Pool A — Claims (RawLakeHouse):  FABRIC_SQL_ENDPOINT / FABRIC_DATABASE
//  Pool B — Samsara (SFA_OPS):      FABRIC_SAMSARA_ENDPOINT / FABRIC_SAMSARA_DATABASE
//
// Auth: FABRIC_SQL_USER + FABRIC_SQL_PASSWORD  (Microsoft 365 account)
//
// Usage:
//   import { queryFabric, querySamsara } from "@/lib/fabricClient";
//   const rows = await queryFabric<MyRow>(SQL.allClaims);
//
// Returns null on failure — callers fall back to local JSON automatically.
// ─────────────────────────────────────────────────────────────────────────────

type Pool = import("mssql").ConnectionPool;

const POOL_MAX_AGE_MS = 30 * 60 * 1000; // recycle after 30 min

// ── Auth helper ───────────────────────────────────────────────────────────────

function buildAuth() {
  if (process.env.AZURE_SP_CLIENT_ID && process.env.AZURE_SP_CLIENT_SECRET) {
    return {
      type: "azure-active-directory-service-principal-secret" as const,
      options: {
        tenantId: process.env.AZURE_SP_TENANT_ID!,
        clientId: process.env.AZURE_SP_CLIENT_ID!,
        clientSecret: process.env.AZURE_SP_CLIENT_SECRET!,
      },
    };
  }
  // Default: Microsoft 365 username + password
  return {
    type: "azure-active-directory-password" as const,
    options: {
      userName: process.env.FABRIC_SQL_USER!,
      password: process.env.FABRIC_SQL_PASSWORD!,
    },
  };
}

// ── Generic pool factory ──────────────────────────────────────────────────────

interface PoolState {
  pool: Pool | null;
  connecting: boolean;
  error: string | null;
  connectedAt: number;
}

function makePoolState(): PoolState {
  return { pool: null, connecting: false, error: null, connectedAt: 0 };
}

const claimsState   = makePoolState();
const samsaraState  = makePoolState();

function hasAuth(): boolean {
  return Boolean(
    (process.env.FABRIC_SQL_USER && process.env.FABRIC_SQL_PASSWORD) ||
    (process.env.AZURE_SP_CLIENT_ID && process.env.AZURE_SP_CLIENT_SECRET)
  );
}

function isClaims(): boolean {
  return Boolean(process.env.FABRIC_SQL_ENDPOINT && process.env.FABRIC_DATABASE && hasAuth());
}

function isSamsara(): boolean {
  return Boolean(process.env.FABRIC_SAMSARA_ENDPOINT && process.env.FABRIC_SAMSARA_DATABASE && hasAuth());
}

async function getPool(
  state: PoolState,
  endpoint: string,
  database: string
): Promise<Pool | null> {
  // Recycle stale pool
  if (state.pool && Date.now() - state.connectedAt > POOL_MAX_AGE_MS) {
    try { await state.pool.close(); } catch { /* ignore */ }
    state.pool = null;
  }

  if (state.pool?.connected) return state.pool;

  if (state.connecting) {
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (state.pool?.connected) return state.pool;
      if (!state.connecting) break;
    }
    return state.pool?.connected ? state.pool : null;
  }

  state.connecting = true;
  state.error = null;

  try {
    const mssql = await import("mssql");
    state.pool = await mssql.connect({
      server: endpoint,
      database,
      authentication: buildAuth(),
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 30_000,
        requestTimeout: 60_000,
      },
      pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    });
    state.connectedAt = Date.now();
    console.log(`[Fabric] Connected → ${database} @ ${endpoint.split(".")[0]}`);
    return state.pool;
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);
    console.error(`[Fabric] Connection failed (${database}):`, state.error);
    state.pool = null;
    return null;
  } finally {
    state.connecting = false;
  }
}

// ── Public query helpers ──────────────────────────────────────────────────────

/** Query the RawLakeHouse (claims) endpoint. Returns null on failure. */
export async function queryFabric<T = Record<string, unknown>>(
  sql: string
): Promise<T[] | null> {
  if (!isClaims()) return null;
  const pool = await getPool(
    claimsState,
    process.env.FABRIC_SQL_ENDPOINT!,
    process.env.FABRIC_DATABASE!
  );
  if (!pool) return null;
  try {
    const result = await pool.request().query(sql);
    return result.recordset as T[];
  } catch (err) {
    console.error("[Fabric:Claims] Query error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Query the SFA_OPS (Samsara/telematics) endpoint. Returns null on failure. */
export async function querySamsara<T = Record<string, unknown>>(
  sql: string
): Promise<T[] | null> {
  if (!isSamsara()) return null;
  const pool = await getPool(
    samsaraState,
    process.env.FABRIC_SAMSARA_ENDPOINT!,
    process.env.FABRIC_SAMSARA_DATABASE!
  );
  if (!pool) return null;
  try {
    const result = await pool.request().query(sql);
    return result.recordset as T[];
  } catch (err) {
    console.error("[Fabric:Samsara] Query error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Status check ──────────────────────────────────────────────────────────────

export async function getFabricStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  samsaraConnected: boolean;
  error: string | null;
  samsaraError: string | null;
  database: string | null;
  samsaraDatabase: string | null;
  endpoint: string | null;
}> {
  const configured = isClaims();

  if (!configured) {
    return {
      configured: false, connected: false, samsaraConnected: false,
      error: hasAuth() ? null : "Auth credentials not set (FABRIC_SQL_USER / FABRIC_SQL_PASSWORD)",
      samsaraError: null, database: null, samsaraDatabase: null, endpoint: null,
    };
  }

  // Attempt both connections in parallel
  const [claimsPool, samsaraPool] = await Promise.all([
    getPool(claimsState, process.env.FABRIC_SQL_ENDPOINT!, process.env.FABRIC_DATABASE!),
    isSamsara()
      ? getPool(samsaraState, process.env.FABRIC_SAMSARA_ENDPOINT!, process.env.FABRIC_SAMSARA_DATABASE!)
      : Promise.resolve(null),
  ]);

  return {
    configured: true,
    connected: !!claimsPool?.connected,
    samsaraConnected: !!samsaraPool?.connected,
    error: claimsState.error,
    samsaraError: samsaraState.error,
    database: process.env.FABRIC_DATABASE ?? null,
    samsaraDatabase: process.env.FABRIC_SAMSARA_DATABASE ?? null,
    endpoint: process.env.FABRIC_SQL_ENDPOINT ?? null,
  };
}
