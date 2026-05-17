import React, { useEffect } from 'react'
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
import ProcurementPage from './pages/ProcurementPage'
import AdvisoryPage from './pages/AdvisoryPage'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { init, initialized } = useAuth()

  useEffect(() => { init() }, [])

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117' }}>
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>Ачааллаж байна...</div>
      </div>
    )
  }

  return <>{children}</>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuth(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppInitializer>
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
              <Route path="procurement" element={<ProcurementPage />} />
              <Route path="advisory" element={<AdvisoryPage />} />
              <Route path="client" element={<ClientPortalPage />} />
            </Route>
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
