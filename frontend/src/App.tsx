import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Subscribe from './pages/Subscribe'
import OwnerDashboard from './pages/OwnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import ChartPage from './pages/dashboard/ChartPage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import AccountSettingsPage from './pages/dashboard/AccountSettingsPage'
import ForecastPage from './pages/dashboard/ForecastPage'
import BillingPage from './pages/dashboard/BillingPage'
import ReportIssuePage from './pages/dashboard/ReportIssuePage'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["subscriber"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="chart" replace />} />
          <Route path="chart" element={<ChartPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="account-settings" element={<AccountSettingsPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="report-issue" element={<ReportIssuePage />} />
        </Route>
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute allowedRoles={["subscriber"]}>
              <Subscribe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ToastProvider>
  )
}

export default App
