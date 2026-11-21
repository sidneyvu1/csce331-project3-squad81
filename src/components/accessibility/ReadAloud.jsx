import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../kiosk/LanguageContext';

const READABLE = 'button, a, label, h1, h2, h3, h4, p, dt, dd, legend, [data-read-aloud]';
const OMIT = 'input, textarea, select, script, style, svg, [hidden], [aria-hidden="true"], [data-read-aloud-private], [data-read-aloud-controls]';

// Read rendered labels and text only, never form values or private receipt fields.
export function readableText(element) {
  if (!element || element.closest('[data-read-aloud-private], [data-read-aloud-controls], [hidden], [aria-hidden="true"]')) return '';
  if (element.matches('input, textarea, select')) {
    return Array.from(element.labels || []).map(readableText).join('. ');
  }
  if (element.matches(':disabled')) return '';
  const clone = element.cloneNode(true);
  clone.querySelectorAll(OMIT).forEach((node) => node.remove());
  return (element.getAttribute('data-read-aloud') || element.getAttribute('aria-label') || clone.textContent || '').replace(/\s+/g, ' ').trim();
}

export default function ReadAloud({ children }) {
  const { language } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const content = useRef(null);
  const timer = useRef(null);
  const active = useRef(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    active.current = null;
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);
  useEffect(() => { stop(); return stop; }, [stop, language]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);

  function speak(text) {
    stop();
    if (!supported || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'zh' ? 'zh-CN' : language;
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((candidate) => candidate.lang.toLowerCase() === utterance.lang.toLowerCase()) || voices.find((candidate) => candidate.lang.split('-')[0] === language);
    if (voice) utterance.voice = voice;
    utterance.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error)) setMessage('Audio could not play. Try Read this screen again.');
    };
    setMessage('');
    window.speechSynthesis.speak(utterance);
  }

  function schedule(element) {
    if (!enabled || !element || active.current === element) return;
    const text = readableText(element);
    stop();
    if (!text) return;
    active.current = element;
    timer.current = setTimeout(() => {
      if (element.isConnected) speak(text);
    }, 500);
  }

  function readScreen() {
    const root = content.current;
    const scope = root.querySelector('[role="dialog"]') || root.querySelector('main') || root;
    const clone = scope.cloneNode(true);
    clone.querySelectorAll(OMIT).forEach((node) => node.remove());
    const lines = Array.from(clone.querySelectorAll(READABLE)).filter((node) => !node.parentElement?.closest(READABLE));
    const text = lines.map(readableText).filter(Boolean).join('. ');
    speak(text || readableText(clone));
  }

  return <div className="read-aloud-kiosk">
    <section className="read-aloud-controls" data-read-aloud-controls aria-label="Read aloud controls">
      <button type="button" aria-pressed={enabled} disabled={!supported} onClick={() => {
        stop(); setEnabled(!enabled);
        if (!enabled) speak('Read aloud enabled. Hover over text or use the Tab key to hear it.');
      }}>Read aloud: {enabled ? 'On' : 'Off'}</button>
      <button type="button" disabled={!supported || !enabled} onClick={readScreen}>Read this screen</button>
      <button type="button" disabled={!supported || !enabled} onClick={stop}>Stop reading</button>
      <span role="status">{!supported ? 'Read aloud is not supported in this browser.' : message || 'Optional audio help. Hover or use keyboard focus.'}</span>
    </section>
    <div ref={content}
      onPointerOver={(event) => { if (event.pointerType !== 'touch') schedule(event.target.closest(READABLE)); }}
      onPointerOut={(event) => {
        const element = event.target.closest(READABLE);
        if (element && !element.contains(event.relatedTarget)) stop();
      }}
      onFocusCapture={(event) => schedule(event.target)}
      onBlurCapture={stop}
      onClickCapture={stop}
      onKeyDownCapture={(event) => { if (event.key === 'Escape') stop(); }}>
      {children}
    </div>
  </div>;
}
