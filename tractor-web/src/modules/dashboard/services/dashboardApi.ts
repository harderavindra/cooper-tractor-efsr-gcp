import { api } from '../../../shared/lib/api'
import type { DashboardKpis, PerformanceRow, RsmPerformanceRow, DashboardQuery } from '../types'

function toQueryString(query?: DashboardQuery): string {
  if (!query) return ''
  const params = new URLSearchParams()
  if (query.from)   params.set('from', query.from)
  if (query.to)     params.set('to', query.to)
  if (query.region) params.set('region', query.region)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const dashboardApi = {
  getKpis: (query?: DashboardQuery) =>
    api.get<DashboardKpis>(`/api/dashboard/kpis${toQueryString(query)}`),
  getEngineerPerformance: (query?: DashboardQuery) =>
    api.get<PerformanceRow[]>(`/api/dashboard/performance/engineers${toQueryString(query)}`),
  getDealerPerformance: (query?: DashboardQuery) =>
    api.get<PerformanceRow[]>(`/api/dashboard/performance/dealers${toQueryString(query)}`),
  getRsmPerformance: (query?: DashboardQuery) =>
    api.get<RsmPerformanceRow[]>(`/api/dashboard/performance/rsms${toQueryString(query)}`),
}
