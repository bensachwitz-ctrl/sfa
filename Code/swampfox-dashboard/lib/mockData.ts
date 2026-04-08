// ─────────────────────────────────────────────────────────────────────────────
// Realistic mock data — mirrors the shape of Applied Epic data in Fabric.
// Used as fallback when FABRIC_SQL_ENDPOINT is not yet configured.
// ─────────────────────────────────────────────────────────────────────────────

export interface Company {
  // ── Always present ──────────────────────────────────────────────────────────
  id: string;
  accountName: string;
  accountCode: string;

  // ── From master data (JSON) — available now ─────────────────────────────────
  dotNumber?: string;
  city?: string;
  state?: string;
  address?: string;
  operatingStatus?: string;
  totalPaidLosses?: number;
  openClaims?: number;
  totalIncurred?: number;
  totalReserved?: number;
  totalClaims?: number;
  topCategory?: string;
  topLine?: string;
  carriers?: string[];
  states?: string[];        // multi-state coverage
  riskScore?: number;       // 0–100 derived
  lastLossDate?: string;
  firstLossDate?: string;
  vehicleInspections?: number;
  vehicleOOSRate?: number | null;
  driverInspections?: number;
  driverOOSRate?: number | null;

  // ── From Fabric / Applied Epic — populated when lakehouse is connected ──────
  fleetSize?: number;
  renewalDate?: string;
  daysToRenewal?: number;
  saferRating?: string;
  lossRatio?: number;
  renewalScore?: number;
  totalPremium?: number;
  activePolicies?: number;
  highRiskDrivers?: number;
  totalDrivers?: number;
}

export interface Policy {
  policyNumber: string;
  accountCode: string;
  accountName: string;
  carrier: string;
  coverageType: string;
  effectiveDate: string;
  expirationDate: string;
  writtenPremium: number;
  status: "Active" | "Lapsed" | "Cancelled" | "Pending";
}

export interface Claim {
  claimNumber: string;
  policyNumber: string;
  accountCode: string;
  accountName: string;
  lossDate: string;
  reportDate: string;
  lossType: string;
  status: "Open" | "Closed" | "Pending" | "Denied";
  paidAmount: number;
  reservedAmount: number;
  description: string;
}

export interface Driver {
  driverId: string;
  accountCode: string;
  accountName: string;
  name: string;
  licenseState: string;
  mvrPoints: number;
  riskLevel: "high" | "medium" | "low";
  speedingEvents30d: number;
  hardBrakingEvents30d: number;
  samsaraScore: number; // 0–100 (lower = worse)
  openClaims: number;
}

export interface ClaimsTrendPoint {
  month: string;
  claimCount: number;
  paidAmount: number;
  reservedAmount: number;
}

export interface LossRatioPoint {
  coverage: string;
  premium: number;
  paidLosses: number;
  reservedLosses: number;
  lossRatio: number;
}

export interface SamsaraEventPoint {
  week: string;
  speeding: number;
  hardBraking: number;
  harshAcceleration: number;
  harshCornering: number;
}

export interface PremiumVsLossesPoint {
  period: string;
  writtenPremium: number;
  paidLosses: number;
  incurredLosses: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Company list
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_COMPANIES: Company[] = [
  {
    id: "ACC-001",
    accountName: "Johnson Freight LLC",
    accountCode: "ACC-001",
    dotNumber: "3456789",
    city: "Columbia",
    state: "SC",
    fleetSize: 12,
    renewalDate: "2025-06-30",
    daysToRenewal: 84,
    saferRating: "Satisfactory",
    lossRatio: 68,
    renewalScore: 74,
    totalPremium: 235000,
    totalPaidLosses: 159800,
    openClaims: 2,
    activePolicies: 4,
    highRiskDrivers: 2,
    totalDrivers: 14,
  },
  {
    id: "ACC-002",
    accountName: "Palmetto Carriers Inc",
    accountCode: "ACC-002",
    dotNumber: "1234567",
    city: "Charleston",
    state: "SC",
    fleetSize: 8,
    renewalDate: "2025-04-15",
    daysToRenewal: 8,
    saferRating: "Conditional",
    lossRatio: 112,
    renewalScore: 28,
    totalPremium: 180000,
    totalPaidLosses: 201600,
    openClaims: 5,
    activePolicies: 3,
    highRiskDrivers: 4,
    totalDrivers: 9,
  },
  {
    id: "ACC-003",
    accountName: "Carolina Logistics Co",
    accountCode: "ACC-003",
    dotNumber: "9876543",
    city: "Greenville",
    state: "SC",
    fleetSize: 25,
    renewalDate: "2025-08-01",
    daysToRenewal: 116,
    saferRating: "Satisfactory",
    lossRatio: 44,
    renewalScore: 91,
    totalPremium: 520000,
    totalPaidLosses: 228800,
    openClaims: 1,
    activePolicies: 6,
    highRiskDrivers: 1,
    totalDrivers: 28,
  },
  {
    id: "ACC-004",
    accountName: "Lowcountry Hauling",
    accountCode: "ACC-004",
    dotNumber: "5432198",
    city: "Beaufort",
    state: "SC",
    fleetSize: 6,
    renewalDate: "2025-05-10",
    daysToRenewal: 33,
    saferRating: "Not Rated",
    lossRatio: 78,
    renewalScore: 55,
    totalPremium: 95000,
    totalPaidLosses: 74100,
    openClaims: 1,
    activePolicies: 3,
    highRiskDrivers: 1,
    totalDrivers: 7,
  },
  {
    id: "ACC-005",
    accountName: "Swamp Fox Transport",
    accountCode: "ACC-005",
    dotNumber: "2345678",
    city: "Florence",
    state: "SC",
    fleetSize: 5,
    renewalDate: "2025-07-22",
    daysToRenewal: 106,
    saferRating: "Satisfactory",
    lossRatio: 31,
    renewalScore: 94,
    totalPremium: 72000,
    totalPaidLosses: 22320,
    openClaims: 0,
    activePolicies: 3,
    highRiskDrivers: 0,
    totalDrivers: 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Policies by company
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_POLICIES: Policy[] = [
  // ACC-001 Johnson Freight
  { policyNumber: "POL-2024-001", accountCode: "ACC-001", accountName: "Johnson Freight LLC", carrier: "Nationwide", coverageType: "Commercial Auto Liability", effectiveDate: "2024-07-01", expirationDate: "2025-06-30", writtenPremium: 150000, status: "Active" },
  { policyNumber: "POL-2024-002", accountCode: "ACC-001", accountName: "Johnson Freight LLC", carrier: "Nationwide", coverageType: "Physical Damage", effectiveDate: "2024-07-01", expirationDate: "2025-06-30", writtenPremium: 45000, status: "Active" },
  { policyNumber: "POL-2024-003", accountCode: "ACC-001", accountName: "Johnson Freight LLC", carrier: "Great West", coverageType: "Cargo", effectiveDate: "2024-07-01", expirationDate: "2025-06-30", writtenPremium: 28000, status: "Active" },
  { policyNumber: "POL-2024-004", accountCode: "ACC-001", accountName: "Johnson Freight LLC", carrier: "Markel", coverageType: "General Liability", effectiveDate: "2024-07-01", expirationDate: "2025-06-30", writtenPremium: 12000, status: "Active" },
  // ACC-002 Palmetto Carriers
  { policyNumber: "POL-2024-010", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", carrier: "Progressive", coverageType: "Commercial Auto Liability", effectiveDate: "2024-04-15", expirationDate: "2025-04-15", writtenPremium: 120000, status: "Active" },
  { policyNumber: "POL-2024-011", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", carrier: "Progressive", coverageType: "Physical Damage", effectiveDate: "2024-04-15", expirationDate: "2025-04-15", writtenPremium: 38000, status: "Active" },
  { policyNumber: "POL-2024-012", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", carrier: "Chubb", coverageType: "General Liability", effectiveDate: "2024-04-15", expirationDate: "2025-04-15", writtenPremium: 22000, status: "Active" },
  // ACC-003 Carolina Logistics
  { policyNumber: "POL-2024-020", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Old Republic", coverageType: "Commercial Auto Liability", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 310000, status: "Active" },
  { policyNumber: "POL-2024-021", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Old Republic", coverageType: "Physical Damage", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 88000, status: "Active" },
  { policyNumber: "POL-2024-022", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Great West", coverageType: "Cargo", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 62000, status: "Active" },
  { policyNumber: "POL-2024-023", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Markel", coverageType: "General Liability", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 35000, status: "Active" },
  { policyNumber: "POL-2024-024", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Zurich", coverageType: "Workers Comp", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 18000, status: "Active" },
  { policyNumber: "POL-2024-025", accountCode: "ACC-003", accountName: "Carolina Logistics Co", carrier: "Zurich", coverageType: "Umbrella", effectiveDate: "2024-08-01", expirationDate: "2025-08-01", writtenPremium: 7000, status: "Active" },
  // ACC-004 Lowcountry Hauling
  { policyNumber: "POL-2024-030", accountCode: "ACC-004", accountName: "Lowcountry Hauling", carrier: "National Interstate", coverageType: "Commercial Auto Liability", effectiveDate: "2024-05-10", expirationDate: "2025-05-10", writtenPremium: 62000, status: "Active" },
  { policyNumber: "POL-2024-031", accountCode: "ACC-004", accountName: "Lowcountry Hauling", carrier: "National Interstate", coverageType: "Physical Damage", effectiveDate: "2024-05-10", expirationDate: "2025-05-10", writtenPremium: 21000, status: "Active" },
  { policyNumber: "POL-2024-032", accountCode: "ACC-004", accountName: "Lowcountry Hauling", carrier: "Employers", coverageType: "General Liability", effectiveDate: "2024-05-10", expirationDate: "2025-05-10", writtenPremium: 12000, status: "Active" },
  // ACC-005 Swamp Fox Transport
  { policyNumber: "POL-2024-040", accountCode: "ACC-005", accountName: "Swamp Fox Transport", carrier: "Berkley One", coverageType: "Commercial Auto Liability", effectiveDate: "2024-07-22", expirationDate: "2025-07-22", writtenPremium: 45000, status: "Active" },
  { policyNumber: "POL-2024-041", accountCode: "ACC-005", accountName: "Swamp Fox Transport", carrier: "Berkley One", coverageType: "Physical Damage", effectiveDate: "2024-07-22", expirationDate: "2025-07-22", writtenPremium: 17000, status: "Active" },
  { policyNumber: "POL-2024-042", accountCode: "ACC-005", accountName: "Swamp Fox Transport", carrier: "Great West", coverageType: "Cargo", effectiveDate: "2024-07-22", expirationDate: "2025-07-22", writtenPremium: 10000, status: "Active" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Claims by company
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CLAIMS: Claim[] = [
  // ACC-001 Johnson Freight
  { claimNumber: "CLM-2024-001", policyNumber: "POL-2024-001", accountCode: "ACC-001", accountName: "Johnson Freight LLC", lossDate: "2024-03-15", reportDate: "2024-03-17", lossType: "Auto Liability", status: "Closed", paidAmount: 45000, reservedAmount: 0, description: "Rear-end collision on I-26" },
  { claimNumber: "CLM-2024-002", policyNumber: "POL-2024-002", accountCode: "ACC-001", accountName: "Johnson Freight LLC", lossDate: "2024-07-22", reportDate: "2024-07-23", lossType: "Physical Damage", status: "Open", paidAmount: 8200, reservedAmount: 22000, description: "Side-swipe — trailer damage" },
  { claimNumber: "CLM-2024-003", policyNumber: "POL-2024-003", accountCode: "ACC-001", accountName: "Johnson Freight LLC", lossDate: "2024-10-05", reportDate: "2024-10-06", lossType: "Cargo", status: "Pending", paidAmount: 0, reservedAmount: 8500, description: "Damaged freight — refrigerated load" },
  { claimNumber: "CLM-2023-045", policyNumber: "POL-2024-001", accountCode: "ACC-001", accountName: "Johnson Freight LLC", lossDate: "2023-11-30", reportDate: "2023-12-02", lossType: "Auto Liability", status: "Closed", paidAmount: 78000, reservedAmount: 0, description: "Intersection accident — bodily injury" },
  { claimNumber: "CLM-2023-028", policyNumber: "POL-2024-002", accountCode: "ACC-001", accountName: "Johnson Freight LLC", lossDate: "2023-08-14", reportDate: "2023-08-14", lossType: "Physical Damage", status: "Closed", paidAmount: 28600, reservedAmount: 0, description: "Rollover — cab total loss" },
  // ACC-002 Palmetto Carriers (high claims)
  { claimNumber: "CLM-2024-010", policyNumber: "POL-2024-010", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-01-10", reportDate: "2024-01-11", lossType: "Auto Liability", status: "Open", paidAmount: 15000, reservedAmount: 85000, description: "Multi-vehicle accident — disputed liability" },
  { claimNumber: "CLM-2024-011", policyNumber: "POL-2024-010", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-03-28", reportDate: "2024-03-29", lossType: "Auto Liability", status: "Closed", paidAmount: 42500, reservedAmount: 0, description: "Pedestrian injury claim" },
  { claimNumber: "CLM-2024-012", policyNumber: "POL-2024-011", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-05-14", reportDate: "2024-05-15", lossType: "Physical Damage", status: "Open", paidAmount: 12000, reservedAmount: 18000, description: "Truck fire — engine total loss" },
  { claimNumber: "CLM-2024-013", policyNumber: "POL-2024-010", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-07-09", reportDate: "2024-07-10", lossType: "Auto Liability", status: "Open", paidAmount: 0, reservedAmount: 55000, description: "Serious bodily injury — litigation" },
  { claimNumber: "CLM-2024-014", policyNumber: "POL-2024-012", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-09-22", reportDate: "2024-09-23", lossType: "General Liability", status: "Open", paidAmount: 0, reservedAmount: 22000, description: "Property damage at customer dock" },
  { claimNumber: "CLM-2024-015", policyNumber: "POL-2024-011", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", lossDate: "2024-11-05", reportDate: "2024-11-06", lossType: "Physical Damage", status: "Pending", paidAmount: 0, reservedAmount: 9500, description: "Hit and run — parked trailer" },
  // ACC-003 Carolina Logistics (low claims)
  { claimNumber: "CLM-2024-020", policyNumber: "POL-2024-020", accountCode: "ACC-003", accountName: "Carolina Logistics Co", lossDate: "2024-06-18", reportDate: "2024-06-19", lossType: "Auto Liability", status: "Closed", paidAmount: 18500, reservedAmount: 0, description: "Minor fender bender — settled" },
  { claimNumber: "CLM-2024-021", policyNumber: "POL-2024-022", accountCode: "ACC-003", accountName: "Carolina Logistics Co", lossDate: "2024-09-03", reportDate: "2024-09-04", lossType: "Cargo", status: "Open", paidAmount: 6200, reservedAmount: 4100, description: "Water damage — roof leak" },
  // ACC-004 Lowcountry Hauling
  { claimNumber: "CLM-2024-030", policyNumber: "POL-2024-030", accountCode: "ACC-004", accountName: "Lowcountry Hauling", lossDate: "2024-04-12", reportDate: "2024-04-13", lossType: "Auto Liability", status: "Closed", paidAmount: 31000, reservedAmount: 0, description: "Rear-end collision" },
  { claimNumber: "CLM-2024-031", policyNumber: "POL-2024-031", accountCode: "ACC-004", accountName: "Lowcountry Hauling", lossDate: "2024-08-29", reportDate: "2024-08-30", lossType: "Physical Damage", status: "Open", paidAmount: 4200, reservedAmount: 9800, description: "Side damage — loading dock" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Drivers by company
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_DRIVERS: Driver[] = [
  // ACC-001 Johnson Freight
  { driverId: "DRV-001", accountCode: "ACC-001", accountName: "Johnson Freight LLC", name: "Marcus Williams", licenseState: "SC", mvrPoints: 8, riskLevel: "high", speedingEvents30d: 4, hardBrakingEvents30d: 6, samsaraScore: 62, openClaims: 1 },
  { driverId: "DRV-002", accountCode: "ACC-001", accountName: "Johnson Freight LLC", name: "David Chen", licenseState: "SC", mvrPoints: 3, riskLevel: "medium", speedingEvents30d: 1, hardBrakingEvents30d: 2, samsaraScore: 78, openClaims: 0 },
  { driverId: "DRV-003", accountCode: "ACC-001", accountName: "Johnson Freight LLC", name: "Patricia Moore", licenseState: "NC", mvrPoints: 0, riskLevel: "low", speedingEvents30d: 0, hardBrakingEvents30d: 1, samsaraScore: 94, openClaims: 0 },
  { driverId: "DRV-004", accountCode: "ACC-001", accountName: "Johnson Freight LLC", name: "Robert Taylor", licenseState: "SC", mvrPoints: 5, riskLevel: "high", speedingEvents30d: 3, hardBrakingEvents30d: 4, samsaraScore: 58, openClaims: 1 },
  // ACC-002 Palmetto Carriers
  { driverId: "DRV-010", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", name: "James Anderson", licenseState: "SC", mvrPoints: 12, riskLevel: "high", speedingEvents30d: 7, hardBrakingEvents30d: 9, samsaraScore: 41, openClaims: 2 },
  { driverId: "DRV-011", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", name: "Linda Jackson", licenseState: "GA", mvrPoints: 9, riskLevel: "high", speedingEvents30d: 5, hardBrakingEvents30d: 7, samsaraScore: 52, openClaims: 1 },
  { driverId: "DRV-012", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", name: "Kevin White", licenseState: "SC", mvrPoints: 7, riskLevel: "high", speedingEvents30d: 4, hardBrakingEvents30d: 5, samsaraScore: 55, openClaims: 1 },
  { driverId: "DRV-013", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", name: "Sandra Harris", licenseState: "SC", mvrPoints: 6, riskLevel: "high", speedingEvents30d: 3, hardBrakingEvents30d: 3, samsaraScore: 61, openClaims: 0 },
  { driverId: "DRV-014", accountCode: "ACC-002", accountName: "Palmetto Carriers Inc", name: "Thomas Martin", licenseState: "SC", mvrPoints: 2, riskLevel: "medium", speedingEvents30d: 1, hardBrakingEvents30d: 2, samsaraScore: 79, openClaims: 0 },
  // ACC-003 Carolina Logistics
  { driverId: "DRV-020", accountCode: "ACC-003", accountName: "Carolina Logistics Co", name: "Michael Brown", licenseState: "SC", mvrPoints: 1, riskLevel: "low", speedingEvents30d: 0, hardBrakingEvents30d: 1, samsaraScore: 91, openClaims: 0 },
  { driverId: "DRV-021", accountCode: "ACC-003", accountName: "Carolina Logistics Co", name: "Jennifer Davis", licenseState: "SC", mvrPoints: 0, riskLevel: "low", speedingEvents30d: 0, hardBrakingEvents30d: 0, samsaraScore: 97, openClaims: 0 },
  { driverId: "DRV-022", accountCode: "ACC-003", accountName: "Carolina Logistics Co", name: "Carlos Rivera", licenseState: "NC", mvrPoints: 4, riskLevel: "medium", speedingEvents30d: 2, hardBrakingEvents30d: 1, samsaraScore: 74, openClaims: 0 },
  { driverId: "DRV-023", accountCode: "ACC-003", accountName: "Carolina Logistics Co", name: "Ashley Thompson", licenseState: "SC", mvrPoints: 0, riskLevel: "low", speedingEvents30d: 0, hardBrakingEvents30d: 1, samsaraScore: 93, openClaims: 0 },
  { driverId: "DRV-024", accountCode: "ACC-003", accountName: "Carolina Logistics Co", name: "William Garcia", licenseState: "SC", mvrPoints: 6, riskLevel: "high", speedingEvents30d: 3, hardBrakingEvents30d: 4, samsaraScore: 60, openClaims: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Time-series chart data generators
// ─────────────────────────────────────────────────────────────────────────────
function genClaimsTrend(accountCode: string): ClaimsTrendPoint[] {
  const seeds: Record<string, number[]> = {
    "ACC-001": [2, 1, 0, 1, 2, 1, 3, 1, 2, 1, 1, 2],
    "ACC-002": [3, 2, 3, 4, 2, 5, 3, 4, 3, 2, 4, 3],
    "ACC-003": [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    "ACC-004": [1, 1, 0, 2, 1, 0, 1, 2, 1, 0, 1, 1],
    "ACC-005": [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  };
  const paidSeeds: Record<string, number[]> = {
    "ACC-001": [0, 28600, 0, 0, 45000, 0, 0, 8200, 0, 8500, 0, 0],
    "ACC-002": [0, 0, 42500, 0, 0, 15000, 12000, 0, 0, 0, 0, 0],
    "ACC-003": [0, 0, 0, 0, 0, 18500, 0, 0, 6200, 0, 0, 0],
    "ACC-004": [0, 0, 0, 31000, 0, 0, 0, 4200, 0, 0, 0, 0],
    "ACC-005": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const months = ["Apr '24", "May '24", "Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24", "Dec '24", "Jan '25", "Feb '25", "Mar '25"];
  const counts = seeds[accountCode] || Array(12).fill(0);
  const paid = paidSeeds[accountCode] || Array(12).fill(0);
  return months.map((month, i) => ({
    month,
    claimCount: counts[i],
    paidAmount: paid[i],
    reservedAmount: counts[i] > 0 && paid[i] === 0 ? counts[i] * 8000 : 0,
  }));
}

function genLossRatio(accountCode: string): LossRatioPoint[] {
  const data: Record<string, LossRatioPoint[]> = {
    "ACC-001": [
      { coverage: "Auto Liability", premium: 150000, paidLosses: 123000, reservedLosses: 22000, lossRatio: 82 },
      { coverage: "Physical Damage", premium: 45000, paidLosses: 28600, reservedLosses: 8200, lossRatio: 82 },
      { coverage: "Cargo", premium: 28000, paidLosses: 8500, reservedLosses: 8500, lossRatio: 61 },
      { coverage: "General Liability", premium: 12000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
    ],
    "ACC-002": [
      { coverage: "Auto Liability", premium: 120000, paidLosses: 57500, reservedLosses: 140000, lossRatio: 165 },
      { coverage: "Physical Damage", premium: 38000, paidLosses: 12000, reservedLosses: 27500, lossRatio: 104 },
      { coverage: "General Liability", premium: 22000, paidLosses: 0, reservedLosses: 22000, lossRatio: 100 },
    ],
    "ACC-003": [
      { coverage: "Auto Liability", premium: 310000, paidLosses: 18500, reservedLosses: 4100, lossRatio: 7 },
      { coverage: "Physical Damage", premium: 88000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
      { coverage: "Cargo", premium: 62000, paidLosses: 6200, reservedLosses: 0, lossRatio: 10 },
      { coverage: "General Liability", premium: 35000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
      { coverage: "Workers Comp", premium: 18000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
    ],
    "ACC-004": [
      { coverage: "Auto Liability", premium: 62000, paidLosses: 31000, reservedLosses: 9800, lossRatio: 66 },
      { coverage: "Physical Damage", premium: 21000, paidLosses: 4200, reservedLosses: 0, lossRatio: 20 },
      { coverage: "General Liability", premium: 12000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
    ],
    "ACC-005": [
      { coverage: "Auto Liability", premium: 45000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
      { coverage: "Physical Damage", premium: 17000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
      { coverage: "Cargo", premium: 10000, paidLosses: 0, reservedLosses: 0, lossRatio: 0 },
    ],
  };
  return data[accountCode] || [];
}

function genSamsaraEvents(accountCode: string): SamsaraEventPoint[] {
  const multipliers: Record<string, number> = {
    "ACC-001": 1.2, "ACC-002": 2.8, "ACC-003": 0.4, "ACC-004": 0.9, "ACC-005": 0.2,
  };
  const m = multipliers[accountCode] || 1;
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 91 + i * 7);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  });
  return weeks.map((week) => ({
    week,
    speeding: Math.round(Math.random() * 5 * m),
    hardBraking: Math.round(Math.random() * 3 * m),
    harshAcceleration: Math.round(Math.random() * 2 * m),
    harshCornering: Math.round(Math.random() * 2 * m),
  }));
}

function genPremiumVsLosses(accountCode: string): PremiumVsLossesPoint[] {
  const data: Record<string, PremiumVsLossesPoint[]> = {
    "ACC-001": [
      { period: "2022", writtenPremium: 195000, paidLosses: 88000, incurredLosses: 112000 },
      { period: "2023", writtenPremium: 215000, paidLosses: 135000, incurredLosses: 148000 },
      { period: "2024", writtenPremium: 235000, paidLosses: 159800, incurredLosses: 168000 },
    ],
    "ACC-002": [
      { period: "2022", writtenPremium: 145000, paidLosses: 98000, incurredLosses: 118000 },
      { period: "2023", writtenPremium: 162000, paidLosses: 145000, incurredLosses: 172000 },
      { period: "2024", writtenPremium: 180000, paidLosses: 201600, incurredLosses: 246500 },
    ],
    "ACC-003": [
      { period: "2022", writtenPremium: 440000, paidLosses: 155000, incurredLosses: 170000 },
      { period: "2023", writtenPremium: 488000, paidLosses: 198000, incurredLosses: 210000 },
      { period: "2024", writtenPremium: 520000, paidLosses: 228800, incurredLosses: 235000 },
    ],
    "ACC-004": [
      { period: "2022", writtenPremium: 78000, paidLosses: 55000, incurredLosses: 62000 },
      { period: "2023", writtenPremium: 88000, paidLosses: 68000, incurredLosses: 74000 },
      { period: "2024", writtenPremium: 95000, paidLosses: 74100, incurredLosses: 78000 },
    ],
    "ACC-005": [
      { period: "2022", writtenPremium: 58000, paidLosses: 12000, incurredLosses: 15000 },
      { period: "2023", writtenPremium: 65000, paidLosses: 18000, incurredLosses: 21000 },
      { period: "2024", writtenPremium: 72000, paidLosses: 22320, incurredLosses: 24000 },
    ],
  };
  return data[accountCode] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public accessor functions
// ─────────────────────────────────────────────────────────────────────────────
export function getMockCompanies(): Company[] {
  return MOCK_COMPANIES;
}

export function getMockAllPolicies(): Policy[] {
  return MOCK_POLICIES;
}

export function getMockAllClaims(): Claim[] {
  return MOCK_CLAIMS;
}

export function getMockCompanyById(id: string): Company | null {
  return MOCK_COMPANIES.find((c) => c.id === id || c.accountCode === id) ?? null;
}

export function getMockPoliciesByCompany(accountCode: string): Policy[] {
  return MOCK_POLICIES.filter((p) => p.accountCode === accountCode);
}

export function getMockClaimsByCompany(accountCode: string): Claim[] {
  return MOCK_CLAIMS.filter((c) => c.accountCode === accountCode);
}

export function getMockDriversByCompany(accountCode: string): Driver[] {
  return MOCK_DRIVERS.filter((d) => d.accountCode === accountCode);
}

export function getMockClaimsTrend(accountCode: string): ClaimsTrendPoint[] {
  return genClaimsTrend(accountCode);
}

export function getMockLossRatio(accountCode: string): LossRatioPoint[] {
  return genLossRatio(accountCode);
}

export function getMockSamsaraEvents(accountCode: string): SamsaraEventPoint[] {
  return genSamsaraEvents(accountCode);
}

export function getMockPremiumVsLosses(accountCode: string): PremiumVsLossesPoint[] {
  return genPremiumVsLosses(accountCode);
}

export function getMockKPIs() {
  return {
    totalActivePolicies: 19,
    openClaims: 9,
    atRiskDrivers: 7,
    renewalsDue30d: 3,
  };
}
