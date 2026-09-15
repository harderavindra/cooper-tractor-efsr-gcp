import type { TractorAsset, SapTractorAsset } from '../../../shared/data/types'

export interface TractorFields {
  tractorModel: string
  chassisNo: string
  engineNo: string
  hmr: string
  dispatchDate: string
  invoiceNo: string
  invoiceDate: string
}

export const EMPTY_TRACTOR_FIELDS: TractorFields = {
  tractorModel: '', chassisNo: '', engineNo: '', hmr: '', dispatchDate: '', invoiceNo: '', invoiceDate: '',
}

export function fieldsFromTractor(t: TractorAsset): TractorFields {
  return {
    tractorModel: t.tractorModel ?? '', chassisNo: t.chassisNo ?? '', engineNo: t.engineNo ?? '',
    hmr: t.hmr != null ? String(t.hmr) : '', dispatchDate: t.dispatchDate?.slice(0, 10) ?? '',
    invoiceNo: t.invoiceNo ?? '', invoiceDate: t.invoiceDate?.slice(0, 10) ?? '',
  }
}

export function fieldsFromSap(s: SapTractorAsset): TractorFields {
  return {
    tractorModel: s.tractorModel ?? '', chassisNo: s.chassisNo ?? '', engineNo: s.engineNo ?? '',
    hmr: s.hmr != null ? String(s.hmr) : '', dispatchDate: s.dispatchDate?.slice(0, 10) ?? '',
    invoiceNo: s.invoiceNo ?? '', invoiceDate: s.invoiceDate?.slice(0, 10) ?? '',
  }
}

interface Props {
  fields: TractorFields
  setFields: (f: TractorFields) => void
}

export function TractorFieldsForm({ fields, setFields }: Props) {
  const inputClass = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'
  const labelClass = 'text-xs text-gray-400'
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1"><span className={labelClass}>Model *</span>
        <input value={fields.tractorModel} onChange={e => setFields({ ...fields, tractorModel: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>Chassis No *</span>
        <input value={fields.chassisNo} onChange={e => setFields({ ...fields, chassisNo: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>Engine No *</span>
        <input value={fields.engineNo} onChange={e => setFields({ ...fields, engineNo: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>HMR</span>
        <input type="number" value={fields.hmr} onChange={e => setFields({ ...fields, hmr: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>Dispatch Date</span>
        <input type="date" value={fields.dispatchDate} onChange={e => setFields({ ...fields, dispatchDate: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>Invoice No</span>
        <input value={fields.invoiceNo} onChange={e => setFields({ ...fields, invoiceNo: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1"><span className={labelClass}>Invoice Date</span>
        <input type="date" value={fields.invoiceDate} onChange={e => setFields({ ...fields, invoiceDate: e.target.value })} className={inputClass} />
      </label>
    </div>
  )
}
