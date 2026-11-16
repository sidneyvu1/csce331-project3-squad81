import React, { useEffect, useRef, useState } from 'react';

const GREETING = 'Hi! I can help you pick a drink, answer menu questions, or add drinks to your cart. What are you in the mood for?';
const SUGGESTIONS = ['What do you recommend?', 'What toppings do you have?', 'Add a classic milk tea with pearls'];

export default function AssistantChat({ disabled, onAddItems }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [messages, sending, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
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
        body: JSON.stringify({ messages: next })
      });
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : {};
      if (!response.ok) throw new Error(data.error || 'The assistant is unavailable right now.');
      if (data.cartItems?.length) onAddItems(data.cartItems);
      setMessages([...next, { role: 'assistant', text: data.reply, added: data.cartItems?.length ? data.cartItems : undefined }]);
    } catch (failure) {
      setError(failure.message || 'The assistant is unavailable right now.');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return <button type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open ordering assistant">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      Ask the assistant
    </button>;
  }

  return <section className="assistant-panel" role="dialog" aria-label="Ordering assistant">
    <header className="assistant-header">
      <strong>Ordering assistant</strong>
      <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button>
    </header>
    <div className="assistant-messages" role="log" aria-live="polite">
      <p className="assistant-bubble assistant-bubble-bot">{GREETING}</p>
      {messages.map((message, index) => <div key={index} className={`assistant-bubble ${message.role === 'user' ? 'assistant-bubble-user' : 'assistant-bubble-bot'}`}>
        <p>{message.text}</p>
        {message.added && <ul className="assistant-added">{message.added.map((item, i) => <li key={i}>Added to cart: {item.quantity} × {item.name}</li>)}</ul>}
      </div>)}
      {messages.length === 0 && <div className="assistant-suggestions">{SUGGESTIONS.map((text) => <button key={text} type="button" className="manager-small-button" onClick={() => send(text)} disabled={sending || disabled}>{text}</button>)}</div>}
      {sending && <p className="assistant-bubble assistant-bubble-bot assistant-typing" aria-label="Assistant is typing">…</p>}
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <div ref={endRef} />
    </div>
    <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
      <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Ask or order a drink" aria-label="Message the assistant" disabled={disabled} />
      <button type="submit" className="submit-order-button" disabled={sending || disabled || !draft.trim()}>Send</button>
    </form>
  </section>;
}
