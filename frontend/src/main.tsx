import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import { useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import FleetPage from './pages/FleetPage'
import MachinePage from './pages/MachinePage'
import PMPage from './pages/PMPage'
import BreakdownsPage from './pages/BreakdownsPage'
import InventoryPage from './pages/InventoryPage'
import OrdersPage from './pages/OrdersPage'
import ClientPortalPage from './pages/ClientPortalPage'
import PredictionsPage from './pages/PredictionsPage'
import ImportPage from './pages/ImportPage'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuth(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="fleet" element={<FleetPage />} />
            <Route path="fleet/:id" element={<MachinePage />} />
            <Route path="pm" element={<PMPage />} />
            <Route path="breakdowns" element={<BreakdownsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="client" element={<ClientPortalPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
