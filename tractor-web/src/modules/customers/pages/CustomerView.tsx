import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Pencil } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { fmtAddress } from '../../../shared/data/types'
import type { Customer } from '../../../shared/data/types'
import { EntityHistoryPopover } from '../../../shared/components/EntityHistoryPopover'
import { ChangeLogTimeline } from '../../../shared/components/ChangeLogTimeline'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

export default function CustomerView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Customer>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<Customer>(`/api/customers/${id}`).then(c => { setCustomer(c); setForm(c) }).finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!id) return
    const updated = await api.put<Customer>(`/api/customers/${id}`, form)
    setCustomer(updated)
    setForm(updated)
    setEditing(false)
  }

  async function handleDelete() {
    if (!id) return
    await api.delete(`/api/customers/${id}`)
    navigate('/customers', { replace: true })
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!customer) return <p className="text-sm text-gray-400">Customer not found</p>

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/customers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Delete this customer?</span>
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
            <h1 className="text-lg font-semibold text-[#1E1951]">{customer.fullName}</h1>
            <EntityHistoryPopover entityType="customer" entityId={customer._id} />
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              <Pencil size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm(customer) }} className="text-sm text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleSave} className="text-sm text-indigo-600 font-medium hover:underline">Save</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Gender" value={customer.gender} />
              <Field label="Date of Birth" value={customer.dob ? new Date(customer.dob).toLocaleDateString() : undefined} />
              <Field label="Address" value={fmtAddress(customer.address)} />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <Field label="Primary Contact" value={[customer.primaryContactName, customer.primaryContactNo].filter(Boolean).join(' — ')} />
              <Field label="Alternate Contact" value={[customer.alternateContactName, customer.alternateContactNo].filter(Boolean).join(' — ')} />
            </div>
            <p className="text-xs text-gray-400">Member since {new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.fullName ?? ''} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className={`${inputClass} col-span-2`} />
              <select value={form.gender ?? ''} onChange={e => setForm({ ...form, gender: e.target.value as Customer['gender'] })} className={inputClass}>
                <option value="">Gender —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input type="date" value={form.dob?.slice(0, 10) ?? ''} onChange={e => setForm({ ...form, dob: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.address?.line1 ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, line1: e.target.value } })} placeholder="Address Line 1" className={`${inputClass} col-span-2`} />
              <input value={form.address?.line2 ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, line2: e.target.value } })} placeholder="Address Line 2" className={`${inputClass} col-span-2`} />
              <input value={form.address?.city ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })} placeholder="City / Village" className={inputClass} />
              <input value={form.address?.taluk ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, taluk: e.target.value } })} placeholder="Taluka" className={inputClass} />
              <input value={form.address?.district ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, district: e.target.value } })} placeholder="District" className={inputClass} />
              <input value={form.address?.state ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, state: e.target.value } })} placeholder="State" className={inputClass} />
              <input value={form.address?.pinCode ?? ''} onChange={e => setForm({ ...form, address: { ...form.address, pinCode: e.target.value } })} placeholder="PIN Code" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.primaryContactName ?? ''} onChange={e => setForm({ ...form, primaryContactName: e.target.value })} placeholder="Primary Contact Name" className={inputClass} />
              <input value={form.primaryContactNo ?? ''} onChange={e => setForm({ ...form, primaryContactNo: e.target.value })} placeholder="Primary Contact No" className={inputClass} />
              <input value={form.alternateContactName ?? ''} onChange={e => setForm({ ...form, alternateContactName: e.target.value })} placeholder="Alternate Contact Name" className={inputClass} />
              <input value={form.alternateContactNo ?? ''} onChange={e => setForm({ ...form, alternateContactNo: e.target.value })} placeholder="Alternate Contact No" className={inputClass} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Change Log</p>
        <ChangeLogTimeline entityType="customer" entityId={customer._id} />
      </div>
    </div>
  )
}
