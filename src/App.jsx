import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/ui'
import { AppShell } from './components/layout/AppShell'
import { Spinner } from './components/ui'

// Pages
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import ContractWizard from './pages/contracts/ContractWizard'
import ContractPreview from './pages/contracts/ContractPreview'
import COWizard from './pages/contracts/COWizard'
import COPreview from './pages/contracts/COPreview'
import Invoices from './pages/Invoices'
import Leads from './pages/Leads'
import More from './pages/More'
import Admin from './pages/Admin'
import Payroll from './pages/Payroll'
import Expenses from './pages/Expenses'
import CustomerPortal from './pages/CustomerPortal'
import PL from './pages/PL'
import Schedule from './pages/Schedule'
import AllContracts from './pages/AllContracts'
import AllChangeOrders from './pages/AllChangeOrders'
import EstimateWizard from './pages/contracts/EstimateWizard'
import EstimatePreview from './pages/contracts/EstimatePreview'
import TemplateSetup from './pages/TemplateSetup'
import CrewView from './pages/CrewView'
import Materials from './pages/Materials'
import CommLog from './pages/CommLog'

function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400 font-display font-bold">Loading Field OS…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/portal/:token" element={<CustomerPortal />} />
      <Route path="/*" element={
        <AuthGuard>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:jobId" element={<JobDetail />} />
              <Route path="/jobs/:jobId/contract/new" element={<ContractWizard />} />
              <Route path="/jobs/:jobId/estimate/new" element={<EstimateWizard />} />
              <Route path="/jobs/:jobId/estimate/preview" element={<EstimatePreview />} />
              <Route path="/jobs/:jobId/contract/preview" element={<ContractPreview />} />
              <Route path="/jobs/:jobId/co/new" element={<COWizard />} />
              <Route path="/jobs/:jobId/co/preview" element={<COPreview />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/more" element={<More />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/pl" element={<PL />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/contracts" element={<AllContracts />} />
              <Route path="/change-orders" element={<AllChangeOrders />} />
              <Route path="/template-setup" element={<TemplateSetup />} />
              <Route path="/crew" element={<CrewView />} />
              <Route path="/jobs/:jobId/materials" element={<Materials />} />
              <Route path="/jobs/:jobId/comms" element={<CommLog />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </AuthGuard>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider />
      <AppRoutes />
    </AuthProvider>
  )
}
