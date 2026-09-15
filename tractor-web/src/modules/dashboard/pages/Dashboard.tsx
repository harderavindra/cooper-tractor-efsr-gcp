import { useEffect, useState } from 'react'
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle, ShieldCheck,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { dashboardApi } from '../services/dashboardApi'
import type { DashboardKpis, MonthlyTrendRow } from '../types'

interface DashboardData {
  totalAssigned:        number
  completedToday:       number
  currentlyOverdue:     number
  reassignedThisMonth:  number
  avgCompletionTimeMs:  number | null
  engineersWithOverdue: { userId: string; name: string; overdueCount: number }[]
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return '—'
  const hrs  = Math.floor(ms / 3_600_000)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ${hrs % 24}h`
  if (hrs > 0)  return `${hrs}h`
  return `${Math.floor(ms / 60_000)}m`
}

function trendPct(data: MonthlyTrendRow[]): { pct: string; up: boolean } | null {
  if (data.length < 2) return null
  const prev = data[data.length - 2].created
  const curr = data[data.length - 1].created
  if (prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  return { pct: `${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 }
}

// ── Dark stat card matching reference design ─────────────────────────────────
function StatCard({
  icon, label, value, trend,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: { pct: string; up: boolean } | null
}) {
  return (
    <div className="bg-[#1E1951] rounded-2xl px-5 py-4 flex flex-col min-h-[130px]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.up ? '+' : '-'}{trend.pct}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-blue-200/60 mt-auto">{label}</p>
    </div>
  )
}

// ── SVG Line chart ────────────────────────────────────────────────────────────
function LineChart({ data }: { data: MonthlyTrendRow[] }) {
  if (!data || data.length < 2) return (
    <p className="text-xs text-gray-400 text-center py-10">Not enough data yet.</p>
  )

  const W = 540, H = 190
  const PAD = { top: 20, right: 16, bottom: 36, left: 44 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const allVals = data.flatMap(d => [d.created, d.closed])
  const maxVal  = Math.max(...allVals, 1)
  const gridMax = Math.ceil(maxVal / 50) * 50 || 50

  const xs = (i: number) => PAD.left + (i / (data.length - 1)) * cW
  const ys = (v: number) => PAD.top + (1 - v / gridMax) * cH

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ')

  const gridLines = [0, gridMax * 0.25, gridMax * 0.5, gridMax * 0.75, gridMax].map(Math.round)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {gridLines.map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={ys(v)} y2={ys(v)}
            stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <text x={PAD.left - 6} y={ys(v)} textAnchor="end" dominantBaseline="middle"
            fill="#64748B" fontSize={10}>{v}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={xs(i)} y={H - 6} textAnchor="middle" fill="#64748B" fontSize={10}>
          {d.month.slice(0, 3)}
        </text>
      ))}

      {/* Area fills */}
      <path
        d={`${linePath(data.map(d => d.created))} L${xs(data.length - 1)},${ys(0)} L${xs(0)},${ys(0)} Z`}
        fill="#818CF8" fillOpacity={0.08}
      />
      <path
        d={`${linePath(data.map(d => d.closed))} L${xs(data.length - 1)},${ys(0)} L${xs(0)},${ys(0)} Z`}
        fill="#2DD4BF" fillOpacity={0.08}
      />

      {/* Lines */}
      <path d={linePath(data.map(d => d.created))} fill="none"
        stroke="#818CF8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={linePath(data.map(d => d.closed))} fill="none"
        stroke="#2DD4BF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(d.created)} r={3.5} fill="#818CF8" stroke="#1a2060" strokeWidth={1.5} />
          <circle cx={xs(i)} cy={ys(d.closed)} r={3.5} fill="#2DD4BF" stroke="#1a2060" strokeWidth={1.5} />
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left + cW / 2 - 70}, ${H - 2})`}>
        <circle cx={0} cy={0} r={4} fill="#818CF8" />
        <text x={8} y={0} dominantBaseline="middle" fill="#94A3B8" fontSize={10}>opened</text>
        <circle cx={62} cy={0} r={4} fill="#2DD4BF" />
        <text x={70} y={0} dominantBaseline="middle" fill="#94A3B8" fontSize={10}>closed</text>
      </g>
    </svg>
  )
}

// ── SVG Donut chart ──────────────────────────────────────────────────────────
const DONUT_COLORS = ['#2DD4BF', '#818CF8', '#F59E0B', '#EF4444', '#94A3B8']

function DonutChart({ segments, centerLabel }: {
  segments: { label: string; value: number }[]
  centerLabel: string | number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-10">No data.</p>

  const cx = 90, cy = 90, r = 62, strokeW = 22
  const circumference = 2 * Math.PI * r
  const GAP = 3
  const filled = segments.filter(s => s.value > 0)
  const available = circumference - GAP * filled.length

  let cumulative = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 180 180" className="w-44 h-44">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d5a" strokeWidth={strokeW} />

        {filled.map((seg, i) => {
          const dash = (seg.value / total) * available
          const offset = circumference / 4 - cumulative
          cumulative += dash + GAP
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
            />
          )
        })}

        {/* Center */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" fontFamily="sans-serif">
          {Number(centerLabel).toLocaleString()}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748B" fontSize={10} fontFamily="sans-serif">Total</text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs w-full px-2">
        {filled.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-slate-400 truncate">{seg.label}</span>
            <span className="text-slate-200 font-semibold ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]     = useState<DashboardData | null>(null)
  const [kpis, setKpis]     = useState<DashboardKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>('/api/dashboard'),
      dashboardApi.getKpis().catch(() => null),
    ])
      .then(([d, k]) => { setData(d); setKpis(k) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>
  if (error)   return <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 m-6">{error}</div>
  if (!data)   return null

  const trend      = kpis ? trendPct(kpis.monthlyTrend) : null

  const agingSegments = kpis ? [
    { label: '0–2 days',  value: kpis.ticketAging.d0to2 },
    { label: '3–5 days',  value: kpis.ticketAging.d3to5 },
    { label: '6–10 days', value: kpis.ticketAging.d6to10 },
    { label: '10+ days',  value: kpis.ticketAging.d10plus },
    { label: 'Closed',    value: kpis.closedTickets },
  ] : []

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E1951] mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">Operations overview</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Total Tickets"
          value={(kpis?.totalTickets ?? data.totalAssigned).toLocaleString()}
          trend={trend}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed Today"
          value={data.completedToday}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Currently Overdue"
          value={data.currentlyOverdue}
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="SLA Compliance"
          value={kpis?.slaCompliancePct !== null && kpis?.slaCompliancePct !== undefined
            ? `${kpis.slaCompliancePct.toFixed(0)}%` : '—'}
        />
      </div>

      {/* Second stat row — KPI details */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Response Time"
          value={fmtDuration(kpis?.avgResponseTimeMs ?? null)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Resolution Time"
          value={fmtDuration(kpis?.avgResolutionTimeMs ?? data.avgCompletionTimeMs)}
        />
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="SLA Breaches"
          value={kpis?.slaBreaches ?? 0}
        />
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Open Tickets"
          value={(kpis?.openTickets ?? 0).toLocaleString()}
        />
      </div>

      {/* ── Bottom 2-column charts ── */}
      {kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {/* Monthly Ticket Trend — wider col */}
          <div className="lg:col-span-3 bg-[#1E1951] rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-white mb-4">Monthly Ticket Trend</p>
            <LineChart data={kpis.monthlyTrend} />
          </div>

          {/* Status Distribution — narrower col */}
          <div className="lg:col-span-2 bg-[#1E1951] rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-white mb-4">Status Distribution</p>
            <DonutChart
              segments={agingSegments}
              centerLabel={kpis.totalTickets}
            />
          </div>
        </div>
      )}

      {/* ── Region summary + Engineers with overdue ── */}
      {kpis && kpis.regionWiseSummary.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Region-wise Summary</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Region</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  <th className="px-5 py-2.5 text-right font-medium">Open</th>
                  <th className="px-5 py-2.5 text-right font-medium">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpis.regionWiseSummary.map(r => (
                  <tr key={r.regionId ?? 'unassigned'} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[#1E1951]">{r.regionName}</td>
                    <td className="px-5 py-3 text-right">{r.total}</td>
                    <td className="px-5 py-3 text-right">{r.open}</td>
                    <td className="px-5 py-3 text-right">{r.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.engineersWithOverdue.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Engineers with Overdue Tasks</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Engineer</th>
                    <th className="px-5 py-2.5 text-right font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.engineersWithOverdue.map(e => (
                    <tr key={e.userId} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#1E1951]">{e.name}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {e.overdueCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
