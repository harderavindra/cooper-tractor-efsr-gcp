import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, Phone, Briefcase } from 'lucide-react'
import { useAuth, ROLE_LABEL } from '../../../shared/context/AuthContext'
import { Avatar } from '../../../shared/components/Avatar'

export default function MobileProfile() {
  const navigate = useNavigate()
  const { name, role, dealerName, profilePic, userId, username, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 pt-2">
        <Avatar name={name ?? '?'} role={role ?? undefined} dealerName={dealerName ?? undefined} photo={profilePic ?? undefined} userId={userId ?? undefined} size="xxl" showPopover={false} />
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-400">{role ? ROLE_LABEL[role] : ''}{dealerName ? ` — ${dealerName}` : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><Briefcase size={16} /></span>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Username</p>
            <p className="text-sm text-gray-800">{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><Mail size={16} /></span>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Role</p>
            <p className="text-sm text-gray-800">{role ? ROLE_LABEL[role] : '—'}</p>
          </div>
        </div>
        {dealerName && (
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><Phone size={16} /></span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Dealer</p>
              <p className="text-sm text-gray-800">{dealerName}</p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 bg-white border border-red-200 text-red-500 text-sm font-medium rounded-2xl px-4 py-3"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}
