import { useCallback, useState } from 'react'
import { api } from '../../../shared/lib/api'
import type { TractorAsset, SapTractorAsset } from '../../../shared/data/types'

export type TractorSearchState = 'idle' | 'searching' | 'found' | 'not_found' | 'sap_found'

/**
 * Search Tractor registry first; if nothing matches, fall back to the
 * SAP-Tractor import staging table. The SAP lookup is meant to be swapped
 * for a live SAP API call later without changing callers of this hook.
 */
export function useTractorSearch() {
  const [state, setState] = useState<TractorSearchState>('idle')
  const [tractor, setTractor] = useState<TractorAsset | null>(null)
  const [sapMatches, setSapMatches] = useState<SapTractorAsset[]>([])

  const search = useCallback(async (q: string) => {
    const term = q.trim()
    if (!term) { setState('idle'); setTractor(null); setSapMatches([]); return }
    setState('searching')
    try {
      const tractorResults = await api.get<TractorAsset[]>(`/api/tractor-assets/search?q=${encodeURIComponent(term)}`)
      if (tractorResults.length > 0) {
        setTractor(tractorResults[0])
        setSapMatches([])
        setState('found')
        return
      }

      const sapResults = await api.get<SapTractorAsset[]>(`/api/sap-tractor-assets/search?q=${encodeURIComponent(term)}`)
      setTractor(null)
      if (sapResults.length > 0) {
        setSapMatches(sapResults)
        setState('sap_found')
      } else {
        setSapMatches([])
        setState('not_found')
      }
    } catch {
      setState('not_found')
    }
  }, [])

  return { state, tractor, sapMatches, search }
}
