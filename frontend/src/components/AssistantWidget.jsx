import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../services/api';

const SUGGESTIONS = [
  'How do I apply for a job?',
  'How is my match score worked out?',
  'How do I become an employer?',
  'What do I need before applying?',
];

const GREETING = {
  role: 'assistant',
  text: 'Hello. I can explain how Fursad works — finding jobs, applying, match scores, or hiring as an employer. What would you like to know?',
};

/**
 * The public assistant.
 *
 * Scoped to jobseekers and visitors on purpose. It answers from what the site
 * already shows publicly, plus the signed-in person's own record — the server
 * decides what it is allowed to read, so there is nothing here that could be
 * talked into revealing more.
 */
const AssistantWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      });
    }
  }, [open, messages]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const question = (text ?? draft).trim();
    if (!question || busy) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setDraft('');
    setBusy(true);

    try {
      const res = await api.post('/assistant', { question });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: res.data?.answer || 'I could not answer that.',
        refused: res.data?.refused,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: err.response?.status === 429
          ? 'That is a lot of questions at once — give it a few minutes.'
          : 'Something went wrong. Please try again, or use the Contact page.',
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close the assistant' : 'Ask the Fursad assistant'}
        className={`fixed bottom-5 right-5 z-40 h-14 w-14 grid place-items-center rounded-full
          shadow-lift transition-all duration-200 ${open
            ? 'bg-bg-surface text-text-secondary border border-border-subtle rotate-90'
            : 'bg-brand-deep text-text-inverse hover:bg-brand-deepHover hover:scale-105'}`}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Fursad assistant"
          className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)]
            bg-bg-surface border border-border-subtle rounded-card shadow-lift
            flex flex-col overflow-hidden animate-fade-up"
          style={{ height: 'min(540px, calc(100vh - 8rem))' }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 bg-brand-deep text-text-inverse shrink-0">
            <Sparkles size={17} className="text-brand-green" />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Fursad assistant</p>
              <p className="text-[11px] text-text-onDeepDim">Here to explain how the platform works</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-card text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-deep text-text-inverse'
                    : m.refused
                      ? 'bg-accent-ochreMuted text-accent-ochreInk border border-accent-ochre/35'
                      : 'bg-bg-elevated text-text-primary border border-border-subtle'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-card bg-bg-elevated border border-border-subtle">
                  <Loader2 size={15} className="animate-spin text-text-muted" />
                </div>
              </div>
            )}

            {messages.length === 1 && !busy && (
              <div className="flex flex-wrap gap-2 mt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-pill bg-brand-muted border border-brand-green/30
                      text-brand-deep font-medium hover:border-brand-green/60 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 p-3 border-t border-border-subtle shrink-0"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Ask about jobs, applying, or hiring..."
              disabled={busy}
              className="flex-1 h-10 px-3.5 bg-bg-primary border border-border-subtle rounded-input
                text-sm text-text-primary placeholder:text-text-muted focus:outline-none
                focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="h-10 w-10 grid place-items-center rounded-input bg-brand-green text-brand-ink
                hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AssistantWidget;
