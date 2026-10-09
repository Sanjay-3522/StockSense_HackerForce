import { Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { ProtectedRoute } from "./routes/ProtectedRoute"
import { AppLayout } from "./layouts/AppLayout"

import Login from "./pages/auth/Login"
import Signup from "./pages/auth/Signup"
import ForgotPassword from "./pages/auth/ForgotPassword"
import VerifyOtp from "./pages/auth/VerifyOtp"
import ResetPassword from "./pages/auth/ResetPassword"

import DashboardPage from "./pages/DashboardPage"
import ProductsPage from "./pages/products/ProductsPage"
import WarehousesPage from "./pages/warehouses/WarehousesPage"
import StockPage from "./pages/stock/StockPage"

import ReceiptsListPage from "./pages/receipts/ReceiptsListPage"
import ReceiptDetailPage from "./pages/receipts/ReceiptDetailPage"
import DeliveriesListPage from "./pages/deliveries/DeliveriesListPage"
import DeliveryDetailPage from "./pages/deliveries/DeliveryDetailPage"
import TransfersListPage from "./pages/transfers/TransfersListPage"
import TransferDetailPage from "./pages/transfers/TransferDetailPage"
import AdjustmentsPage from "./pages/adjustments/AdjustmentsPage"
import MoveHistoryPage from "./pages/moveHistory/MoveHistoryPage"

import InventoryOverviewPage from "./pages/intelligence/InventoryOverviewPage"
import ExplainStockChangePage from "./pages/intelligence/ExplainStockChangePage"
import InvestigatorPage from "./pages/intelligence/InvestigatorPage"
import AnomaliesPage from "./pages/intelligence/AnomaliesPage"
import SmartReorderPage from "./pages/intelligence/SmartReorderPage"
import ActionCenterPage from "./pages/intelligence/ActionCenterPage"

import SettingsPage from "./pages/settings/SettingsPage"
import ProfilePage from "./pages/settings/ProfilePage"
import NotFoundPage from "./pages/NotFoundPage"

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/products" element={<ProductsPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />

            <Route path="/receipts" element={<ReceiptsListPage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/deliveries" element={<DeliveriesListPage />} />
            <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
            <Route path="/transfers" element={<TransfersListPage />} />
            <Route path="/transfers/:id" element={<TransferDetailPage />} />
            <Route path="/adjustments" element={<AdjustmentsPage />} />
            <Route path="/move-history" element={<MoveHistoryPage />} />

            <Route path="/intelligence/overview" element={<InventoryOverviewPage />} />
            <Route path="/intelligence/explain" element={<ExplainStockChangePage />} />
            <Route path="/intelligence/investigate" element={<InvestigatorPage />} />
            <Route path="/intelligence/anomalies" element={<AnomaliesPage />} />
            <Route path="/intelligence/reorder" element={<SmartReorderPage />} />
            <Route path="/intelligence/actions" element={<ActionCenterPage />} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
