'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, lazy, Suspense } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { chatPulse } from '@/lib/marketing/animations';

const ChatWindow = lazy(() => import('./ChatWindow').then((m) => ({ default: m.ChatWindow })));

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <Suspense fallback={null}>
            <ChatWindow onClose={() => setIsOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
        style={{ background: '#c3f53b' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={chatPulse.animate}
        transition={chatPulse.animate.transition}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X size={24} color="#0a0a0a" aria-hidden="true" />
        ) : (
          <MessageCircle size={24} color="#0a0a0a" aria-hidden="true" />
        )}
      </motion.button>
    </div>
  );
}
