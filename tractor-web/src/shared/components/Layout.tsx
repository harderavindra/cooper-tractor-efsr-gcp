import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import OfflineBanner from './OfflineBanner'

export default function Layout() {
  return (
    <>
      <OfflineBanner />
      <div className="flex gap-3 h-screen bg-gray-100 p-5">
        <Sidebar />
        <main className="flex-1 overflow-y-auto rounded-2xl">
          <Outlet />
        </main>
      </div>
    </>
  )
}
