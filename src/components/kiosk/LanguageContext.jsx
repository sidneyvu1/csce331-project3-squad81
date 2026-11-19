import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext(null);

function applyGoogleLanguage(language) {
  const target = language === 'zh' ? 'zh-CN' : language;
  document.cookie = `googtrans=/en/${target};path=/`;
  const select = document.querySelector('.goog-te-combo');
  if (select && select.value !== target) {
    select.value = target;
    select.dispatchEvent(new Event('change'));
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('zh');
  const [kioskWelcomeVisible, setKioskWelcomeVisible] = useState(false);

  useEffect(() => {
    const handleGoogleTranslateReady = () => applyGoogleLanguage(language);
    window.addEventListener('google-translate-ready', handleGoogleTranslateReady);
    applyGoogleLanguage(language);
    return () => window.removeEventListener('google-translate-ready', handleGoogleTranslateReady);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, kioskWelcomeVisible, setKioskWelcomeVisible }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider.');
  return context;
}
