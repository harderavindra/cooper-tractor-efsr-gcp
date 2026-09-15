import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/context/AuthContext'
import OfflineBanner from '../../../shared/components/OfflineBanner'
import { MobileBottomNav } from './MobileBottomNav'

const INNER_PAGE = /^\/mobile\/pdi\/(new|[0-9a-fA-F]{24})/

export default function MobileLayout() {
  const { role } = useAuth()
  const location = useLocation()

  if (role === 'admin' || role === 'rsm') {
    return <Navigate to="/dashboard" replace />
  }

  const isInnerPage = INNER_PAGE.test(location.pathname)

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-start justify-center py-3 px-3 sm:py-6 sm:px-10">
      <div
        className="w-full max-w-[420px] h-[calc(100vh-24px)] sm:h-[calc(100vh-48px)] rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col relative"
        style={{ background: 'radial-gradient(105.71% 33.55% at 50% 78.29%, #F5BC9D 0%, #F6F6F6 100%)' }}
      >
        <OfflineBanner />
        {isInnerPage ? (
          <main className="flex-1 overflow-hidden flex flex-col">
            <Outlet />
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto pb-[100px]">
              <Outlet />
            </main>
            <MobileBottomNav />
          </>
        )}
      </div>
    </div>
  )
}
