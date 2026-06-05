'use client';

import dynamic from 'next/dynamic';

const ChatWidget = dynamic(
  () => import('./ChatWidget').then((m) => m.ChatWidget),
  { ssr: false }
);

export function ChatWidgetWrapper() {
  return <ChatWidget />;
}
