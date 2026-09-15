import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, API_BASE } from '../lib/api'

export type UserRole = 'admin' | 'rsm' | 'area_manager' | 'service_engineer' | 'service_technician' | 'dealer' | 'mechanic'

export const ROLE_LABEL: Record<UserRole, string> = {
  admin:               'Admin',
  rsm:                 'Regional Manager',
  area_manager:        'Area Service Manager',
  service_engineer:    'Service Engineer',
  service_technician:  'Service Technician',
  dealer:               'Dealer',
  mechanic:             'Mechanic',
}

export const ROLE_COLOR: Record<UserRole, string> = {
  admin:               'bg-[#1E1951] text-white',
  rsm:                 'bg-indigo-100 text-indigo-700',
  area_manager:        'bg-violet-100 text-violet-700',
  service_engineer:    'bg-teal-100 text-teal-700',
  service_technician:  'bg-cyan-100 text-cyan-700',
  dealer:               'bg-[#fde9df] text-[#E76124]',
  mechanic:             'bg-green-100 text-green-700',
}

interface AuthState {
  token:      string | null
  userId:     string | null
  username:   string | null
  name:       string | null
  role:       UserRole | null
  dealerName: string | null
  regionId:   string | null
  areaId:     string | null
  profilePic: string | null
}

interface AuthContextValue extends AuthState {
  login:         (username: string, password: string) => Promise<void>
  logout:        () => void
  setProfilePic: (url: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadState(): AuthState {
  return {
    token:      localStorage.getItem('token'),
    userId:     localStorage.getItem('userId'),
    username:   localStorage.getItem('username'),
    name:       localStorage.getItem('name'),
    role:       localStorage.getItem('role') as UserRole | null,
    dealerName: localStorage.getItem('dealerName'),
    regionId:   localStorage.getItem('regionId'),
    areaId:     localStorage.getItem('areaId'),
    profilePic: localStorage.getItem('profilePic'),
  }
}

const CLEAR_KEYS = ['token', 'refreshToken', 'userId', 'username', 'name', 'role', 'dealerName', 'regionId', 'areaId', 'profilePic']

const EMPTY_STATE: AuthState = {
  token: null, userId: null, username: null, name: null,
  role: null, dealerName: null, regionId: null, areaId: null, profilePic: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState)

  async function login(username: string, password: string) {
    const data = await api.post<{
      token: string; refreshToken: string; userId: string; username: string;
      name: string; role: UserRole; dealerName?: string; regionId?: string; areaId?: string; profilePic?: string | null
    }>('/api/auth/login', { username, password })

    localStorage.setItem('token',        data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('userId',       data.userId)
    localStorage.setItem('username',     data.username)
    localStorage.setItem('name',         data.name)
    localStorage.setItem('role',         data.role)
    localStorage.setItem('dealerName',   data.dealerName ?? '')
    localStorage.setItem('regionId',     data.regionId   ?? '')
    localStorage.setItem('areaId',       data.areaId     ?? '')
    if (data.profilePic) localStorage.setItem('profilePic', data.profilePic)
    else localStorage.removeItem('profilePic')

    setState({
      token:      data.token,
      userId:     data.userId,
      username:   data.username,
      name:       data.name,
      role:       data.role,
      dealerName: data.dealerName ?? null,
      regionId:   data.regionId   ?? null,
      areaId:     data.areaId     ?? null,
      profilePic: data.profilePic ?? null,
    })
  }

  function logout() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    CLEAR_KEYS.forEach(k => localStorage.removeItem(k))
    setState(EMPTY_STATE)
  }

  function setProfilePic(url: string | null) {
    if (url) localStorage.setItem('profilePic', url)
    else localStorage.removeItem('profilePic')
    setState(s => ({ ...s, profilePic: url }))
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setProfilePic }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
