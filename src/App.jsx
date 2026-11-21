import React from 'react';
import ReadAloud from './components/accessibility/ReadAloud';
import { StaffProvider, StaffRoute } from './auth/StaffAuth';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PortalHub from './pages/PortalHub';
import ManagerDashboard from './pages/ManagerDashboard';
import CashierScreen from './pages/CashierScreen';
import CustomerKiosk from './pages/CustomerKiosk';
import KitchenDisplay from './pages/KitchenDisplay';
import LanguageSwitcher from './components/kiosk/LanguageSwitcher';
import { LanguageProvider } from './components/kiosk/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <StaffProvider>
          <LanguageSwitcher />
          <Routes>
            <Route path="/" element={<PortalHub />} />
            <Route path="/manager" element={<StaffRoute roles={['manager']}><ManagerDashboard /></StaffRoute>} />
            <Route path="/cashier" element={<StaffRoute roles={['manager', 'cashier']}><CashierScreen /></StaffRoute>} />
            <Route path="/kiosk" element={<ReadAloud><CustomerKiosk /></ReadAloud>} />
            <Route path="/kitchen" element={<StaffRoute roles={['manager', 'kitchen']}><KitchenDisplay /></StaffRoute>} />
          </Routes>
        </StaffProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
