import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { kioskLanguages, translate as t } from './kioskText';
import { useLanguage } from './LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, kioskWelcomeVisible } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedLanguage = kioskLanguages.find((option) => option.code === language) || kioskLanguages[0];

  useEffect(() => {
    let retryTimer;
    let initialized = false;

    function syncGoogleTranslate() {
      document.cookie = `googtrans=/en/${language === 'zh' ? 'zh-CN' : language};path=/`;
      const googleSelect = containerRef.current?.querySelector('.goog-te-combo');
      if (googleSelect && googleSelect.value !== (language === 'zh' ? 'zh-CN' : language)) {
        googleSelect.value = language === 'zh' ? 'zh-CN' : language;
        googleSelect.dispatchEvent(new Event('change'));
      }
    }

    function initializeGoogleTranslate() {
      if (!containerRef.current || !window.google?.translate) return;
      if (!initialized) {
        initialized = true;
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,es,zh-CN',
          autoDisplay: false
        }, 'google_translate_element');
      }
      syncGoogleTranslate();
    }

    window.googleTranslateElementInit = initializeGoogleTranslate;
    initializeGoogleTranslate();
    if (!document.querySelector('script[data-google-translate]')) {
      const script = document.createElement('script');
      script.dataset.googleTranslate = 'true';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
    retryTimer = window.setInterval(initializeGoogleTranslate, 250);

    return () => {
      window.clearInterval(retryTimer);
    };
  }, [language]);

  useEffect(() => {
    if (!open) return undefined;

    function dismiss(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.type === 'pointerdown' && !triggerRef.current?.parentElement?.contains(event.target)) {
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', dismiss, true);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss, true);
    };
  }, [open]);

  function chooseLanguage(code) {
    setLanguage(code);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const hidden = location.pathname.replace(/\/+$/, '') === '/kiosk' && kioskWelcomeVisible;

  return (
    <div className={`global-language-switcher${hidden ? ' is-hidden' : ''}`} lang={language === 'zh' ? 'zh-CN' : language}>
      <button
        ref={triggerRef}
        className="global-language-trigger"
        type="button"
        aria-label={`${t(language, 'changeLanguage')}: ${selectedLanguage.name}`}
        aria-expanded={open}
        title={t(language, 'changeLanguage')}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{selectedLanguage.flag}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m3.5 6 4.5 4 4.5-4" />
        </svg>
      </button>
      {open && (
        <div className="global-language-options" role="group" aria-label={t(language, 'language')}>
          {kioskLanguages.map((option) => (
            <button
              key={option.code}
              type="button"
              lang={option.code === 'zh' ? 'zh-CN' : option.code}
              aria-pressed={language === option.code}
              className={language === option.code ? 'is-selected' : ''}
              onClick={() => chooseLanguage(option.code)}
            >
              <span aria-hidden="true">{option.flag}</span>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
      )}
      <div id="google_translate_element" ref={containerRef} className="google-translate-engine" aria-hidden="true" />
    </div>
  );
}
