import React, { useEffect, useRef, useState } from 'react';
import { translate as t } from './kioskText';

export default function AssistantChat({ disabled, onAddItems, language = 'en' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const wasOpened = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [messages, sending, open]);
  useEffect(() => {
    if (open) { wasOpened.current = true; inputRef.current?.focus(); }
    else if (wasOpened.current) launcherRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    const next = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    setDraft('');
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, language })
      });
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : {};
      if (!response.ok) throw new Error(data.error || t(language, 'assistantUnavailable'));
      if (data.cartItems?.length) onAddItems(data.cartItems);
      setMessages([...next, { role: 'assistant', text: data.reply, added: data.cartItems?.length ? data.cartItems : undefined }]);
    } catch (failure) {
      setError(failure.message || t(language, 'assistantUnavailable'));
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return <button ref={launcherRef} type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-label={t(language, 'openAssistant')}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      {t(language, 'assistantLauncher')}
    </button>;
  }

  return <section className="assistant-panel" role="dialog" aria-label={t(language, 'assistant')}>
    <header className="assistant-header">
      <h2>{t(language, 'assistant')}</h2>
      <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label={t(language, 'closeAssistant')}>×</button>
    </header>
    <div className="assistant-messages" role="log" aria-live="polite">
      <p className="assistant-bubble assistant-bubble-bot">{t(language, 'assistantGreeting')}</p>
      {messages.map((message, index) => <div key={index} className={`assistant-bubble ${message.role === 'user' ? 'assistant-bubble-user' : 'assistant-bubble-bot'}`}>
        <p>{message.text}</p>
        {message.added && <ul className="assistant-added">{message.added.map((item, i) => <li key={i}>{t(language, 'assistantAdded', { quantity: item.quantity, name: item.name })}</li>)}</ul>}
      </div>)}
      {messages.length === 0 && <div className="assistant-suggestions">{['recommend', 'toppingQuestion', 'addClassicMilkTea'].map((key) => {
        const suggestion = t(language, key);
        return <button key={key} type="button" className="manager-small-button" onClick={() => send(suggestion)} disabled={sending || disabled}>{suggestion}</button>;
      })}</div>}
      {sending && <p className="assistant-bubble assistant-bubble-bot assistant-typing" aria-label={t(language, 'assistantTyping')}>…</p>}
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <div ref={endRef} />
    </div>
    <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
      <label className="sr-only" htmlFor="assistant-message">{t(language, 'messageAssistant')}</label>
      <input id="assistant-message" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder={t(language, 'askOrder')} aria-label={t(language, 'messageAssistant')} disabled={disabled} />
      <button type="submit" className="submit-order-button" disabled={sending || disabled || !draft.trim()}>{t(language, 'send')}</button>
    </form>
  </section>;
}
