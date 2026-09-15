import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { Customer } from '../../../shared/data/types'

export default function CustomerForm() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('')
  const [dob, setDob] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [taluk, setTaluk] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [primaryContactName, setPrimaryContactName] = useState('')
  const [primaryContactNo, setPrimaryContactNo] = useState('')
  const [alternateContactName, setAlternateContactName] = useState('')
  const [alternateContactNo, setAlternateContactNo] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    setError('')
    try {
      const customer = await api.post<Customer>('/api/customers', {
        fullName, gender: gender || undefined, dob: dob || undefined,
        address: { line1, line2, city, taluk, district, state, pinCode },
        primaryContactName, primaryContactNo, alternateContactName, alternateContactNo,
      })
      navigate(`/customers/${customer._id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'
  const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 self-start">
        <ArrowLeft size={14} /> Back to Customers
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-[#1E1951] mb-4">New Customer</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={labelClass}>Full Name *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className={inputClass}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className={labelClass}>Address Line 1</label>
                <input value={line1} onChange={e => setLine1(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className={labelClass}>Address Line 2</label>
                <input value={line2} onChange={e => setLine2(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>City / Village</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Taluka</label>
                <input value={taluk} onChange={e => setTaluk(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>District</label>
                <input value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>State</label>
                <input value={state} onChange={e => setState(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>PIN Code</label>
                <input value={pinCode} onChange={e => setPinCode(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contacts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Primary Contact Name</label>
                <input value={primaryContactName} onChange={e => setPrimaryContactName(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Primary Contact No</label>
                <input value={primaryContactNo} onChange={e => setPrimaryContactNo(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Alternate Contact Name</label>
                <input value={alternateContactName} onChange={e => setAlternateContactName(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Alternate Contact No</label>
                <input value={alternateContactNo} onChange={e => setAlternateContactNo(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => navigate('/customers')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="bg-[#1E1951] hover:bg-[#1E1951]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
