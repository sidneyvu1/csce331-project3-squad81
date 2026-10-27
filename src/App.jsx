import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PortalHub from './pages/PortalHub';
import ManagerDashboard from './pages/ManagerDashboard';
import CashierScreen from './pages/CashierScreen';
import CustomerKiosk from './pages/CustomerKiosk';
import KitchenDisplay from './pages/KitchenDisplay';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalHub />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/cashier" element={<CashierScreen />} />
        <Route path="/kiosk" element={<CustomerKiosk />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
      </Routes>
    </BrowserRouter>
  );
}
