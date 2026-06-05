'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Globe } from 'lucide-react';
import {
  cnGreeting,
  cnSuggestions,
  cnResponses,
  cnFallback,
  cnPlaceholders,
  enGreeting,
  enSuggestions,
  enResponses,
  enFallback,
  enPlaceholders,
  type ChatMessage,
} from '@/lib/marketing/chat/cn-messages';

interface ChatWindowProps {
  onClose: () => void;
}

export function ChatWindow({ onClose }: ChatWindowProps) {
  const [lang, setLang] = useState<'en' | 'cn'>('en');
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => [{ id: 'greeting', role: 'ai', content: enGreeting }],
  );
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const t = {
    greeting: lang === 'cn' ? cnGreeting : enGreeting,
    suggestions: lang === 'cn' ? cnSuggestions : enSuggestions,
    responses: lang === 'cn' ? cnResponses : enResponses,
    fallback: lang === 'cn' ? cnFallback : enFallback,
    placeholders: lang === 'cn' ? cnPlaceholders : enPlaceholders,
  };

  // Re-seed the greeting in the active language when the user switches EN/CN.
  // Skips the initial render (messages already seeded with the EN greeting) so
  // we never show an empty thread or wipe a just-started conversation.
  const didMountLang = useRef(false);
  useEffect(() => {
    if (!didMountLang.current) {
      didMountLang.current = true;
      return;
    }
    replyTimers.current.forEach(clearTimeout);
    replyTimers.current = [];
    setIsTyping(false);
    setMessages([{ id: 'greeting', role: 'ai', content: t.greeting }]);
  }, [lang]);

  // Clear any pending reply timers on unmount to avoid setState-after-unmount.
  useEffect(() => {
    return () => {
      replyTimers.current.forEach(clearTimeout);
      replyTimers.current = [];
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const timer = setTimeout(() => {
      const response = t.responses[text] || t.fallback;
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: response,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      replyTimers.current = replyTimers.current.filter((t) => t !== timer);
    }, 800 + Math.random() * 400);
    replyTimers.current.push(timer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="absolute bottom-20 right-0 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(195,245,59,0.15)' }}
            >
              <span className="text-sm font-bold" style={{ color: '#c3f53b' }}>AI</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AdNexus AI</p>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {isTyping ? t.placeholders.typing : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'cn' : 'en')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              aria-label={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
              title={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
            >
              <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Close chat"
            >
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-thin"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'text-white'
                    : ''
                }`}
                style={
                  msg.role === 'user'
                    ? { background: '#2563EB' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
                }
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className="rounded-xl px-3.5 py-2.5 flex items-center gap-1"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--text-tertiary)' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--text-tertiary)' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--text-tertiary)' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {t.suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors hover:bg-white/10"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholders.input}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-tertiary)] outline-none"
            aria-label="Chat message"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-lg transition-all disabled:opacity-30"
            style={{ background: input.trim() && !isTyping ? '#c3f53b' : 'var(--bg-secondary)' }}
            aria-label={t.placeholders.send}
          >
            <Send size={16} color={input.trim() && !isTyping ? '#0a0a0a' : 'var(--text-tertiary)'} />
          </button>
        </div>
      </motion.div>
    </>
  );
}
