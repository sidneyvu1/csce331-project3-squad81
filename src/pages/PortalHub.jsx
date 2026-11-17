import React from 'react';
import { StaffControls } from '../auth/StaffAuth';
import { Link } from 'react-router-dom';
import { translate as t } from '../components/kiosk/kioskText';
import { useLanguage } from '../components/kiosk/LanguageContext';
import './pages.css';

export default function PortalHub() {
  const { language } = useLanguage();

  return (
    <div className="hub-container" lang={language === 'zh' ? 'zh-CN' : language}>
      <header className="hub-header">
        <h1>{t(language, 'portalTitle')}</h1>
        <StaffControls language={language} />
        <p className="subtitle">{t(language, 'selectView')}</p>
      </header>

      <div className="button-grid">
        <Link to="/cashier" className="hub-button">
          <h2>{t(language, 'cashierScreen')}</h2>
          <p>{t(language, 'processOrders')}</p>
        </Link>

        <Link to="/manager" className="hub-button">
          <h2>{t(language, 'managerDashboard')}</h2>
          <p>{t(language, 'viewAnalytics')}</p>
        </Link>

        <Link to="/kiosk" className="hub-button">
          <h2>{t(language, 'customerKiosk')}</h2>
          <p>{t(language, 'selfServiceOrdering')}</p>
        </Link>

        <Link to="/kitchen" className="hub-button">
          <h2>{t(language, 'kitchenDisplay')}</h2>
          <p>{t(language, 'viewManageOrders')}</p>
        </Link>
      </div>
    </div>
  );
}
