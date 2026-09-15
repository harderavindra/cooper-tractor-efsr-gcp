export interface TicketAging {
  d0to2: number
  d3to5: number
  d6to10: number
  d10plus: number
}

export interface RegionSummaryRow {
  regionId: string | null
  regionName: string
  total: number
  open: number
  closed: number
}

export interface CategorySummaryRow {
  category: string
  subCategory: string
  total: number
}

export interface ProductSummaryRow {
  gensetModel: string
  total: number
}

export interface MonthlyTrendRow {
  month: string
  created: number
  closed: number
}

export interface DashboardKpis {
  totalTickets: number
  openTickets: number
  closedTickets: number
  pendingPreApprovals: number
  pendingPartApprovals: number
  avgResponseTimeMs: number | null
  avgResolutionTimeMs: number | null
  avgEngineerProductivity: number | null
  slaCompliancePct: number | null
  slaBreaches: number
  ticketAging: TicketAging
  regionWiseSummary: RegionSummaryRow[]
  complaintCategorySummary: CategorySummaryRow[]
  productSummary: ProductSummaryRow[]
  monthlyTrend: MonthlyTrendRow[]
}

export interface PerformanceRow {
  id: string
  name: string
  assigned: number
  accepted: number
  completed: number
  closed: number
  avgResolutionTimeMs: number | null
  slaCompliancePct: number | null
}

export interface RsmPerformanceRow {
  id: string
  name: string
  ticketVolume: number
  avgPreApprovalDecisionMs: number | null
  avgPartApprovalDecisionMs: number | null
  totalApprovalsHandled: number
}

export interface DashboardQuery {
  from?: string
  to?: string
  region?: string
}
