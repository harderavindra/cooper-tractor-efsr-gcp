import { api } from '../lib/api'

export interface ChangeEntry {
  field: string
  label: string
  from:  unknown
  to:    unknown
}

export interface ChangeLogEntry {
  _id:         string
  entityType:  string
  entityId:    string
  entityLabel: string
  category:    string
  action:      'created' | 'updated' | 'deleted'
  changes:     ChangeEntry[]
  by:          { userId: string; name: string; role: string } | null
  at:          string
}

export interface ChangeLogPage {
  data:       ChangeLogEntry[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export interface ChangeLogFilters {
  entityType?: string
  category?:   string
  action?:     string
  from?:       string
  to?:         string
  page?:       number
  limit?:      number
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') parts.push(`${k}=${encodeURIComponent(v)}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

export const changeLogApi = {
  forEntity(entityType: string, entityId: string, page = 1): Promise<ChangeLogPage> {
    const q = buildQuery({ entityType, entityId, page, limit: 10 })
    return api.get<ChangeLogPage>(`/api/changelog${q}`)
  },

  list(filters: ChangeLogFilters): Promise<ChangeLogPage> {
    const q = buildQuery({
      entityType: filters.entityType,
      category:   filters.category,
      action:     filters.action,
      from:       filters.from,
      to:         filters.to,
      page:       filters.page ?? 1,
      limit:      filters.limit ?? 20,
    })
    return api.get<ChangeLogPage>(`/api/changelog${q}`)
  },
}
