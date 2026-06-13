'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MessageSquare, Send, ShieldCheck } from 'lucide-react';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface AgentConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function AgentChatPanel() {
  const t = useTranslations('aiAgent');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: listLoading } = useQuery({
    queryKey: ['agent', 'conversations'],
    queryFn: async (): Promise<AgentConversation[]> => {
      const res = await fetch('/api/v2/agent/conversations');
      if (!res.ok) throw new Error(t('failedToFetchConversation'));
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const createConversation = useMutation({
    mutationFn: async (): Promise<AgentConversation> => {
      const res = await fetch('/api/v2/agent/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(t('failedToCreateConversation'));
      const json = await res.json();
      return json.data;
    },
    onSuccess: (conv) => {
      setConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] });
    },
  });

  const bootstrapRef = useRef(false);

  useEffect(() => {
    if (listLoading || conversationId || bootstrapRef.current) return;

    if (conversations && conversations.length > 0) {
      bootstrapRef.current = true;
      setConversationId(conversations[0].id);
      return;
    }

    if (conversations && conversations.length === 0 && !createConversation.isPending) {
      bootstrapRef.current = true;
      createConversation.mutate();
    }
  }, [listLoading, conversations, conversationId, createConversation.isPending, createConversation.mutate]);

  const { data: conversationData, isLoading: convLoading } = useQuery({
    queryKey: ['agent', 'conversation', conversationId],
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<{ messages: AgentMessage[] }> => {
      const res = await fetch(`/api/v2/agent/conversations/${conversationId}`);
      if (!res.ok) throw new Error(t('failedToFetchConversation'));
      const json = await res.json();
      return { messages: json.data?.messages ?? [] };
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string): Promise<AgentMessage[]> => {
      const res = await fetch(`/api/v2/agent/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(t('failedToSendMessage'));
      const json = await res.json();
      return json.data ?? [];
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(
        ['agent', 'conversation', conversationId],
        (old: { messages: AgentMessage[] } | undefined) => {
          const existing = old?.messages ?? [];
          const existingIds = new Set(existing.map((m) => m.id));
          const toAdd = newMessages.filter((m) => !existingIds.has(m.id));
          return { messages: [...existing, ...toAdd] };
        },
      );
      setInput('');
    },
  });

  const messages = conversationData?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !conversationId || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
  };

  const isLoading = listLoading || convLoading || createConversation.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {t('chatTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('chatDescription')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{t('chatGuardrailNote')}</span>
        </div>

        <div className="flex h-80 flex-col rounded-lg border bg-muted/30">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('chatEmpty')}</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-8 rounded-lg bg-primary/10 p-3 text-sm'
                      : 'mr-8 rounded-lg border bg-background p-3 text-sm'
                  }
                >
                  <p className="mb-1 text-xs font-medium capitalize text-muted-foreground">
                    {message.role === 'user' ? t('chatYou') : t('chatOperator')}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t bg-background p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatInputPlaceholder')}
              disabled={!conversationId || sendMessage.isPending}
              aria-label={t('chatInputPlaceholder')}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!conversationId || !input.trim() || sendMessage.isPending}
              aria-label={t('chatSend')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {sendMessage.isError ? (
          <p className="text-sm text-destructive">{tc('error')}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
