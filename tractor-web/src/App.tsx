import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './shared/context/AuthContext'
import ProtectedRoute from './shared/components/ProtectedRoute'
import Layout from './shared/components/Layout'
import NotFound from './shared/components/NotFound'
import Login from './modules/auth/pages/Login'
import Dashboard from './modules/dashboard/pages/Dashboard'
import UserManagement from './modules/users/pages/UserManagement'
import MasterSetup from './modules/setup/pages/MasterSetup'
import AuditLogPage from './modules/setup/pages/AuditLogPage'
import CustomerListing from './modules/customers/pages/CustomerListing'
import CustomerForm from './modules/customers/pages/CustomerForm'
import CustomerView from './modules/customers/pages/CustomerView'
import TractorListing from './modules/tractor/pages/TractorListing'
import TractorForm from './modules/tractor/pages/TractorForm'
import TractorView from './modules/tractor/pages/TractorView'
import SapTractorListing from './modules/tractor/pages/SapTractorListing'
import PdiListing from './modules/pdi/pages/PdiListing'
import NewPdi from './modules/pdi/pages/NewPdi'
import PdiRecord from './modules/pdi/pages/PdiRecord'
import MobileLayout from './modules/mobile/components/MobileLayout'
import MobileDashboard from './modules/mobile/pages/MobileDashboard'
import MobilePdiListing from './modules/mobile/pages/MobilePdiListing'
import MobileNewPdi from './modules/mobile/pages/MobileNewPdi'
import MobilePdiRecord from './modules/mobile/pages/MobilePdiRecord'
import MobileInstallation from './modules/mobile/pages/MobileInstallation'
import MobileServicePlaceholder from './modules/mobile/pages/MobileServicePlaceholder'
import MobileProfile from './modules/mobile/pages/MobileProfile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="setup" element={<MasterSetup />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="customers" element={<CustomerListing />} />
              <Route path="customers/new" element={<CustomerForm />} />
              <Route path="customers/:id" element={<CustomerView />} />
              <Route path="tractor" element={<TractorListing />} />
              <Route path="tractor/new" element={<TractorForm />} />
              <Route path="tractor/:id" element={<TractorView />} />
              <Route path="sap-tractor" element={<SapTractorListing />} />
              <Route path="pdi" element={<PdiListing />} />
              <Route path="pdi/new" element={<NewPdi />} />
              <Route path="pdi/:id" element={<PdiRecord />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/mobile" element={<MobileLayout />}>
              <Route index element={<MobileDashboard />} />
              <Route path="pdi" element={<MobilePdiListing />} />
              <Route path="pdi/new" element={<MobileNewPdi />} />
              <Route path="pdi/:id" element={<MobilePdiRecord />} />
              <Route path="installation" element={<MobileInstallation />} />
              <Route path="service" element={<MobileServicePlaceholder />} />
              <Route path="profile" element={<MobileProfile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
