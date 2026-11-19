import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [kioskWelcomeVisible, setKioskWelcomeVisible] = useState(false);

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
