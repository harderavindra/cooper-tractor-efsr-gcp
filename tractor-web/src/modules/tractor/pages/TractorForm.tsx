import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { TractorAsset, SapTractorAsset, Customer } from '../../../shared/data/types'
import { CustomerPicker } from '../../customers/components/CustomerPicker'

export default function TractorForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sapId = params.get('sap')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)

  const [tractorModel, setTractorModel] = useState('')
  const [chassisNo, setChassisNo] = useState('')
  const [engineNo, setEngineNo] = useState('')
  const [hmr, setHmr] = useState('')
  const [dispatchDate, setDispatchDate] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [pdiDate, setPdiDate] = useState('')
  const [dateOfSale, setDateOfSale] = useState('')
  const [dealerName, setDealerName] = useState('')

  useEffect(() => {
    if (!sapId) return
    api.get<SapTractorAsset>(`/api/sap-tractor-assets/${sapId}`).then(sap => {
      setTractorModel(sap.tractorModel ?? '')
      setChassisNo(sap.chassisNo ?? '')
      setEngineNo(sap.engineNo ?? '')
      setHmr(sap.hmr != null ? String(sap.hmr) : '')
      setDispatchDate(sap.dispatchDate?.slice(0, 10) ?? '')
      setInvoiceNo(sap.invoiceNo ?? '')
      setInvoiceDate(sap.invoiceDate?.slice(0, 10) ?? '')
      setRegistrationNo(sap.registrationNo ?? '')
      setPdiDate(sap.pdiDate?.slice(0, 10) ?? '')
      setDateOfSale(sap.dateOfSale?.slice(0, 10) ?? '')
      setDealerName(sap.dealerName ?? '')
    }).catch(() => {})
  }, [sapId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tractorModel.trim() || !chassisNo.trim() || !engineNo.trim()) return
    setSaving(true)
    setError('')
    try {
      const tractor = await api.post<TractorAsset>('/api/tractor-assets', {
        tractorModel, chassisNo, engineNo,
        hmr: hmr ? Number(hmr) : undefined,
        dispatchDate: dispatchDate || undefined,
        invoiceNo, invoiceDate: invoiceDate || undefined,
        registrationNo,
        customerId: customer?._id,
        pdiDate: pdiDate || undefined,
        dateOfSale: dateOfSale || undefined,
        dealerName,
      })
      navigate(`/tractor/${tractor._id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tractor')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'
  const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <button onClick={() => navigate('/tractor')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 self-start">
        <ArrowLeft size={14} /> Back to Tractor
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-[#1E1951] mb-4">New Tractor</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Model *</label>
              <input value={tractorModel} onChange={e => setTractorModel(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>HMR</label>
              <input type="number" value={hmr} onChange={e => setHmr(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Chassis No *</label>
              <input value={chassisNo} onChange={e => setChassisNo(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Engine No *</label>
              <input value={engineNo} onChange={e => setEngineNo(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Registration No</label>
              <input value={registrationNo} onChange={e => setRegistrationNo(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Dealer</label>
              <input value={dealerName} onChange={e => setDealerName(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dispatch &amp; Sale</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Dispatch Date</label>
                <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>PDI Date</label>
                <input type="date" value={pdiDate} onChange={e => setPdiDate(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Invoice No</label>
                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Date of Sale</label>
                <input type="date" value={dateOfSale} onChange={e => setDateOfSale(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</p>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => navigate('/tractor')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !tractorModel.trim() || !chassisNo.trim() || !engineNo.trim()}
              className="bg-[#1E1951] hover:bg-[#1E1951]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Tractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
