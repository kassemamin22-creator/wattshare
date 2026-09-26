// Defines all of the app's routes: the public pages plus the protected subscriber, manager
// and admin dashboards, each with its nested pages.
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Subscribe from './pages/Subscribe'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import ChartPage from './pages/dashboard/ChartPage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import AccountSettingsPage from './pages/dashboard/AccountSettingsPage'
import ForecastPage from './pages/dashboard/ForecastPage'
import BillingPage from './pages/dashboard/BillingPage'
import ReportIssuePage from './pages/dashboard/ReportIssuePage'
import OwnerDashboardLayout from './pages/owner/OwnerDashboardLayout'
import SubscribersPage from './pages/owner/SubscribersPage'
import PendingApprovalsPage from './pages/owner/PendingApprovalsPage'
import PendingAmpereChangesPage from './pages/owner/PendingAmpereChangesPage'
import OwnerChartPage from './pages/owner/ChartPage'
import IssuesPage from './pages/owner/IssuesPage'
import BillsPage from './pages/owner/BillsPage'
import AddSubscriberPage from './pages/owner/AddSubscriberPage'
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout'
import UsersPage from './pages/admin/UsersPage'
import SubscriptionsPage from './pages/admin/SubscriptionsPage'
import AdminBillsPage from './pages/admin/BillsPage'
import AddManagerPage from './pages/admin/AddManagerPage'
import AdminAddSubscriberPage from './pages/admin/AddSubscriberPage'
import PricingPage from './pages/admin/PricingPage'
import AdminAccountSettingsPage from './pages/admin/AccountSettingsPage'
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
              <OwnerDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="subscribers" replace />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="pending-approvals" element={<PendingApprovalsPage />} />
          <Route path="pending-ampere-changes" element={<PendingAmpereChangesPage />} />
          <Route path="chart" element={<OwnerChartPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="add-subscriber" element={<AddSubscriberPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="bills" element={<AdminBillsPage />} />
          <Route path="add-manager" element={<AddManagerPage />} />
          <Route path="add-subscriber" element={<AdminAddSubscriberPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="account-settings" element={<AdminAccountSettingsPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

export default App
