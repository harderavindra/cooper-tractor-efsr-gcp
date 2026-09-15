import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ClipboardCheck, Settings, Wrench, User } from 'lucide-react'
import logoSrc from '../../../assets/logo.svg'

function TabIcon({ isActive, children }: { isActive: boolean; children: ReactNode }) {
  return (
    <span className={isActive ? 'text-white' : 'text-white/40'}>
      {children}
    </span>
  )
}

export function MobileBottomNav() {
  return (
    <div className="absolute bottom-0 left-0 w-full bg-gray-50/10 backdrop-blur-md rounded-t-full flex justify-center pb-2 px-4 z-20">
      <div className="bg-[#11101C] rounded-full px-3 py-2 flex items-center gap-1 shadow-lg">
        <NavLink
          to="/mobile/pdi"
          className={({ isActive }) => `w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-white/15' : ''}`}
        >
          {({ isActive }) => <TabIcon isActive={isActive}><ClipboardCheck size={20} /></TabIcon>}
        </NavLink>

        <NavLink
          to="/mobile/installation"
          className={({ isActive }) => `w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-white/15' : ''}`}
        >
          {({ isActive }) => <TabIcon isActive={isActive}><Settings size={20} /></TabIcon>}
        </NavLink>

        <NavLink
          to="/mobile"
          end
          aria-label="Dashboard"
          className="w-16 h-16 -mt-3 rounded-full bg-[#E76124] ring-4 ring-[#1A1A2E] shadow-lg flex items-center justify-center shrink-0"
        >
          <img src={logoSrc} alt="Dashboard" className="w-9 h-9" />
        </NavLink>

        <NavLink
          to="/mobile/service"
          className={({ isActive }) => `w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-white/15' : ''}`}
        >
          {({ isActive }) => <TabIcon isActive={isActive}><Wrench size={20} /></TabIcon>}
        </NavLink>

        <NavLink
          to="/mobile/profile"
          className={({ isActive }) => `w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-white/15' : ''}`}
        >
          {({ isActive }) => <TabIcon isActive={isActive}><User size={20} /></TabIcon>}
        </NavLink>
      </div>
    </div>
  )
}
