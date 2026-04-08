// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Fabric SQL Analytics Endpoint — SFA_OPS warehouse
//
// Table naming convention (bronze → silver → gold):
//   bronze_claims   — raw claims export (Applied Epic)
//   bronze_samsara  — raw Samsara telematics events
//   silver_drivers  — enriched driver roster
//   silver_vehicles — enriched vehicle roster
//   gold_speeding   — aggregated speeding KPIs
//
// Override any table name in .env.local:
//   FABRIC_TABLE_CLAIMS=bronze_claims
//   FABRIC_TABLE_SAMSARA=bronze_samsara
//   FABRIC_TABLE_DRIVERS=silver_drivers
//   FABRIC_TABLE_VEHICLES=silver_vehicles
// ─────────────────────────────────────────────────────────────────────────────

import type { config as SqlConfig } from "mssql";

const T = {
  // RawLakeHouse — 01_Raw_Data workspace
  claims:   process.env.FABRIC_TABLE_CLAIMS   || "all_claims",
  // SFA_OPS — Distance & Speed Pulls workspace
  samsara:  process.env.FABRIC_TABLE_SAMSARA  || "gold_speeding_driver_daily",
  drivers:  process.env.FABRIC_TABLE_DRIVERS  || "silver_drivers",
  vehicles: process.env.FABRIC_TABLE_VEHICLES || "silver_vehicles",
};

export function isFabricConfigured(): boolean {
  return Boolean(
    process.env.FABRIC_SQL_ENDPOINT &&
    process.env.FABRIC_DATABASE &&
    (process.env.FABRIC_SQL_USER ||
      process.env.AZURE_SP_CLIENT_ID)
  );
}

export function getFabricConfig(): SqlConfig {
  const useSP =
    process.env.AZURE_SP_CLIENT_ID && process.env.AZURE_SP_CLIENT_SECRET;

  return {
    server: process.env.FABRIC_SQL_ENDPOINT!,
    database: process.env.FABRIC_DATABASE!,
    authentication: useSP
      ? {
          type: "azure-active-directory-service-principal-secret" as const,
          options: {
            tenantId: process.env.AZURE_SP_TENANT_ID!,
            clientId: process.env.AZURE_SP_CLIENT_ID!,
            clientSecret: process.env.AZURE_SP_CLIENT_SECRET!,
          },
        }
      : {
          type: "azure-active-directory-password" as const,
          options: {
            userName: process.env.FABRIC_SQL_USER!,
            password: process.env.FABRIC_SQL_PASSWORD!,
          },
        },
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30_000,
      requestTimeout: 60_000,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Column mapping — bronze_claims uses these exact column names:
//   ClaimNumber, DateOfLoss, PolicyYear, PolicyNumber,
//   PolicyIncept, PolicyExp, CloseDate,
//   Insured, Backer (= carrier/insurer),
//   ClaimType, Status, Category, CauseOfLoss,
//   Driver, Claimant, State, Paid, Reserve
// ─────────────────────────────────────────────────────────────────────────────
export const SQL = {

  // ── All claims (for full data load) ──────────────────────────────────────
  allClaims: `
    SELECT
      ClaimNumber                                 AS claimNumber,
      CONVERT(VARCHAR(10), DateOfLoss, 23)        AS dateOfLoss,
      PolicyYear                                  AS policyYear,
      PolicyNumber                                AS policyNumber,
      CONVERT(VARCHAR(10), PolicyIncept, 23)      AS inception,
      CONVERT(VARCHAR(10), PolicyExp, 23)         AS expiration,
      CONVERT(VARCHAR(10), CloseDate, 23)         AS closeDate,
      Insured                                     AS insured,
      ISNULL(Backer, '')                          AS carrier,
      ISNULL(ClaimType, '')                       AS claimType,
      ISNULL(Status, 'Open')                      AS status,
      ISNULL(Category, 'Other')                   AS category,
      ISNULL(CauseOfLoss, '')                     AS causeOfLoss,
      ISNULL(Driver, '')                          AS driver,
      ISNULL(Claimant, '')                        AS claimant,
      ISNULL(State, '')                           AS state,
      ISNULL(CAST(Paid AS FLOAT), 0)              AS totalPaid,
      ISNULL(CAST(Reserve AS FLOAT), 0)           AS totalReserve,
      ISNULL(CAST(Paid AS FLOAT), 0)
        + ISNULL(CAST(Reserve AS FLOAT), 0)       AS totalIncurred
    FROM dbo.${T.claims}
    ORDER BY DateOfLoss DESC
  `,

  // ── Portfolio KPIs ────────────────────────────────────────────────────────
  portfolioKPIs: `
    SELECT
      COUNT(*)                                                      AS totalClaims,
      SUM(CASE WHEN LOWER(Status) = 'open' THEN 1 ELSE 0 END)      AS openClaims,
      SUM(CASE WHEN LOWER(Status) = 'closed' THEN 1 ELSE 0 END)    AS closedClaims,
      ISNULL(SUM(CAST(Paid    AS FLOAT)), 0)                        AS totalPaid,
      ISNULL(SUM(CAST(Reserve AS FLOAT)), 0)                        AS totalReserved,
      ISNULL(SUM(CAST(Paid AS FLOAT) + CAST(Reserve AS FLOAT)), 0) AS totalIncurred,
      COUNT(DISTINCT Insured)                                       AS totalCompanies
    FROM dbo.${T.claims}
  `,

  // ── Incurred by year ──────────────────────────────────────────────────────
  incurredByYear: `
    SELECT
      CAST(YEAR(DateOfLoss) AS VARCHAR)              AS year,
      COUNT(*)                                       AS claims,
      ISNULL(SUM(CAST(Paid AS FLOAT)), 0)            AS paid,
      ISNULL(SUM(CAST(Reserve AS FLOAT)), 0)         AS reserved,
      ISNULL(SUM(CAST(Paid AS FLOAT)
           + CAST(Reserve AS FLOAT)), 0)             AS incurred
    FROM dbo.${T.claims}
    WHERE DateOfLoss IS NOT NULL
    GROUP BY YEAR(DateOfLoss)
    ORDER BY YEAR(DateOfLoss)
  `,

  // ── Claims by category ────────────────────────────────────────────────────
  claimsByCategory: `
    SELECT
      ISNULL(Category, 'Other')                         AS category,
      COUNT(*)                                           AS count,
      ISNULL(SUM(CAST(Paid AS FLOAT)
           + CAST(Reserve AS FLOAT)), 0)                AS incurred
    FROM dbo.${T.claims}
    GROUP BY Category
    ORDER BY incurred DESC
  `,

  // ── Claims by state ───────────────────────────────────────────────────────
  claimsByState: `
    SELECT
      ISNULL(State, 'Unknown')                          AS state,
      COUNT(*)                                          AS count,
      ISNULL(SUM(CAST(Paid AS FLOAT)
           + CAST(Reserve AS FLOAT)), 0)                AS incurred
    FROM dbo.${T.claims}
    WHERE State IS NOT NULL AND State <> ''
    GROUP BY State
    ORDER BY count DESC
  `,

  // ── Claims by carrier (Backer) ────────────────────────────────────────────
  claimsByCarrier: `
    SELECT
      ISNULL(Backer, 'Unknown')                         AS carrier,
      COUNT(*)                                          AS count,
      ISNULL(SUM(CAST(Paid AS FLOAT)
           + CAST(Reserve AS FLOAT)), 0)                AS incurred
    FROM dbo.${T.claims}
    GROUP BY Backer
    ORDER BY incurred DESC
  `,

  // ── All claims for a specific insured ─────────────────────────────────────
  claimsByInsured: (insured: string) => `
    SELECT
      ClaimNumber                                  AS claimNumber,
      CONVERT(VARCHAR(10), DateOfLoss, 23)         AS dateOfLoss,
      PolicyNumber                                 AS policyNumber,
      ISNULL(Backer, '')                           AS carrier,
      ISNULL(ClaimType, '')                        AS claimType,
      ISNULL(Status, 'Open')                       AS status,
      ISNULL(Category, 'Other')                    AS category,
      ISNULL(CauseOfLoss, '')                      AS causeOfLoss,
      ISNULL(Driver, '')                           AS driver,
      ISNULL(State, '')                            AS state,
      ISNULL(CAST(Paid    AS FLOAT), 0)            AS totalPaid,
      ISNULL(CAST(Reserve AS FLOAT), 0)            AS totalReserve,
      ISNULL(CAST(Paid AS FLOAT)
           + CAST(Reserve AS FLOAT), 0)            AS totalIncurred
    FROM dbo.${T.claims}
    WHERE Insured = '${insured.replace(/'/g, "''")}'
    ORDER BY DateOfLoss DESC
  `,

  // ── Active policies (derived from claims) ─────────────────────────────────
  // bronze_claims contains one row per claim; policies are derived from unique
  // PolicyNumber + PolicyIncept + PolicyExp combinations per Insured.
  activePolicies: `
    SELECT
      PolicyNumber                                  AS policyNumber,
      Insured                                       AS insured,
      ISNULL(Backer, '')                            AS carrier,
      CONVERT(VARCHAR(10), PolicyIncept, 23)        AS inception,
      CONVERT(VARCHAR(10), PolicyExp, 23)           AS expiration,
      ISNULL(ClaimType, '')                         AS claimType,
      COUNT(*)                                      AS claimCount
    FROM dbo.${T.claims}
    WHERE PolicyNumber IS NOT NULL
    GROUP BY PolicyNumber, Insured, Backer, PolicyIncept, PolicyExp, ClaimType
    ORDER BY PolicyExp ASC
  `,

  // ── Samsara: gold_speeding_driver_daily (SFA_OPS) ────────────────────────
  // Columns: company_key, driver_name, distance_miles,
  //          bucket_1_5_count, bucket_6_10_count, bucket_11_15_count, bucket_16_plus_count
  // (plus any date column — check actual table for column names)
  samsaraAll: `
    SELECT
      ISNULL(company_key,  '')  AS company_key,
      ISNULL(driver_name,  '')  AS driver_name,
      ISNULL(CAST(bucket_1_5_count    AS FLOAT), 0) AS bucket_1_5_count,
      ISNULL(CAST(bucket_6_10_count   AS FLOAT), 0) AS bucket_6_10_count,
      ISNULL(CAST(bucket_11_15_count  AS FLOAT), 0) AS bucket_11_15_count,
      ISNULL(CAST(bucket_16_plus_count AS FLOAT), 0) AS bucket_16_plus_count,
      ISNULL(CAST(distance_miles AS FLOAT), 0)       AS distance_miles
    FROM dbo.${T.samsara}
    ORDER BY company_key, driver_name
  `,

  samsaraKPIs: `
    SELECT
      COUNT(DISTINCT driver_name)                       AS uniqueDrivers,
      COUNT(DISTINCT company_key)                       AS uniqueCompanies,
      ISNULL(SUM(CAST(bucket_1_5_count    AS FLOAT) +
                 CAST(bucket_6_10_count   AS FLOAT) +
                 CAST(bucket_11_15_count  AS FLOAT) +
                 CAST(bucket_16_plus_count AS FLOAT)), 0) AS totalEvents,
      ISNULL(SUM(CAST(bucket_16_plus_count AS FLOAT)), 0) AS highSeverityEvents
    FROM dbo.${T.samsara}
  `,

  // ── Driver roster (SFA_OPS silver_drivers if available) ──────────────────
  allDrivers: `
    SELECT
      DriverID                AS driverId,
      ISNULL(DriverName, '')  AS name,
      ISNULL(Insured, '')     AS insured,
      ISNULL(LicenseState,'') AS licenseState,
      ISNULL(MVRPoints, 0)    AS mvrPoints,
      ISNULL(RiskLevel,'')    AS riskLevel
    FROM dbo.${T.drivers}
    ORDER BY MVRPoints DESC
  `,

  // ── Full-text search across claims ────────────────────────────────────────
  searchClaims: (q: string) => {
    const safe = q.replace(/'/g, "''");
    return `
      SELECT TOP 20
        ClaimNumber   AS claimNumber,
        Insured       AS insured,
        PolicyNumber  AS policyNumber,
        ISNULL(Category, 'Other') AS category,
        ISNULL(Status, '')        AS status,
        CONVERT(VARCHAR(10), DateOfLoss, 23) AS dateOfLoss,
        ISNULL(CAST(Paid AS FLOAT) + CAST(Reserve AS FLOAT), 0) AS totalIncurred
      FROM dbo.${T.claims}
      WHERE ClaimNumber  LIKE '%${safe}%'
         OR Insured      LIKE '%${safe}%'
         OR PolicyNumber LIKE '%${safe}%'
         OR Category     LIKE '%${safe}%'
         OR Driver       LIKE '%${safe}%'
      ORDER BY DateOfLoss DESC
    `;
  },
};
