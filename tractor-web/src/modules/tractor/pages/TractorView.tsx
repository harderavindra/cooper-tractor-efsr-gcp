import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Pencil } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { TractorAsset } from '../../../shared/data/types'
import { EntityHistoryPopover } from '../../../shared/components/EntityHistoryPopover'
import { ChangeLogTimeline } from '../../../shared/components/ChangeLogTimeline'

const STATUS_LABEL: Record<TractorAsset['status'], string> = {
  not_dispatched: 'Not Dispatched',
  dispatched:     'Dispatched',
  pdi_completed:  'PDI Completed',
  sold:           'Sold',
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800">{value ?? '—'}</p>
    </div>
  )
}

function dateStr(v?: string) {
  return v ? new Date(v).toLocaleDateString() : undefined
}

export default function TractorView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tractor, setTractor] = useState<TractorAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<TractorAsset>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<TractorAsset>(`/api/tractor-assets/${id}`).then(t => { setTractor(t); setForm(t) }).finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!id) return
    const updated = await api.put<TractorAsset>(`/api/tractor-assets/${id}`, form)
    setTractor(updated)
    setForm(updated)
    setEditing(false)
  }

  async function handleDelete() {
    if (!id) return
    await api.delete(`/api/tractor-assets/${id}`)
    navigate('/tractor', { replace: true })
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!tractor) return <p className="text-sm text-gray-400">Tractor not found</p>

  const customer = tractor.customerId && typeof tractor.customerId !== 'string' ? tractor.customerId : null

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/tractor" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to Tractor
        </Link>
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Delete this tractor?</span>
            <button onClick={handleDelete} className="text-red-600 font-medium hover:underline">Confirm</button>
            <button onClick={() => setConfirmDelete(false)} className="text-gray-400 hover:underline">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600">
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#1E1951]">{tractor.chassisNo}</h1>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">{STATUS_LABEL[tractor.status]}</span>
            <EntityHistoryPopover entityType="tractor_asset" entityId={tractor._id} />
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              <Pencil size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm(tractor) }} className="text-sm text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleSave} className="text-sm text-indigo-600 font-medium hover:underline">Save</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Model" value={tractor.tractorModel} />
              <Field label="Engine No" value={tractor.engineNo} />
              <Field label="HMR" value={tractor.hmr} />
              <Field label="Registration No" value={tractor.registrationNo} />
              <Field label="Dealer" value={tractor.dealerName} />
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
              <Field label="Dispatch Date" value={dateStr(tractor.dispatchDate)} />
              <Field label="PDI Date" value={dateStr(tractor.pdiDate)} />
              <Field label="Date of Sale" value={dateStr(tractor.dateOfSale)} />
              <Field label="Invoice No" value={tractor.invoiceNo} />
              <Field label="Invoice Date" value={dateStr(tractor.invoiceDate)} />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer</p>
              {customer ? (
                <Link to={`/customers/${customer._id}`} className="text-sm text-indigo-600 hover:underline">
                  {customer.fullName}{customer.primaryContactNo ? ` — ${customer.primaryContactNo}` : ''}
                </Link>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
            <p className="text-xs text-gray-400">Added on {new Date(tractor.createdAt).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input value={form.tractorModel ?? ''} onChange={e => setForm({ ...form, tractorModel: e.target.value })} placeholder="Model" className={inputClass} />
            <input value={form.hmr ?? ''} type="number" onChange={e => setForm({ ...form, hmr: Number(e.target.value) })} placeholder="HMR" className={inputClass} />
            <input value={form.chassisNo ?? ''} onChange={e => setForm({ ...form, chassisNo: e.target.value })} placeholder="Chassis No" className={inputClass} />
            <input value={form.engineNo ?? ''} onChange={e => setForm({ ...form, engineNo: e.target.value })} placeholder="Engine No" className={inputClass} />
            <input value={form.registrationNo ?? ''} onChange={e => setForm({ ...form, registrationNo: e.target.value })} placeholder="Registration No" className={inputClass} />
            <input value={form.dealerName ?? ''} onChange={e => setForm({ ...form, dealerName: e.target.value })} placeholder="Dealer" className={inputClass} />
            <label className="flex flex-col gap-1 text-xs text-gray-400">Dispatch Date
              <input type="date" value={form.dispatchDate?.slice(0, 10) ?? ''} onChange={e => setForm({ ...form, dispatchDate: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">PDI Date
              <input type="date" value={form.pdiDate?.slice(0, 10) ?? ''} onChange={e => setForm({ ...form, pdiDate: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">Date of Sale
              <input type="date" value={form.dateOfSale?.slice(0, 10) ?? ''} onChange={e => setForm({ ...form, dateOfSale: e.target.value })} className={inputClass} />
            </label>
            <input value={form.invoiceNo ?? ''} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} placeholder="Invoice No" className={inputClass} />
            <label className="flex flex-col gap-1 text-xs text-gray-400">Invoice Date
              <input type="date" value={form.invoiceDate?.slice(0, 10) ?? ''} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className={inputClass} />
            </label>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Change Log</p>
        <ChangeLogTimeline entityType="tractor_asset" entityId={tractor._id} />
      </div>
    </div>
  )
}
