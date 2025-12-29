'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, serverTimestamp, off } from 'firebase/database';
import { rtdb } from '@/src/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

interface ChatPanelProps {
  eventId: string;
  batchNumber: number;
  isEnabled: boolean;
}

export default function ChatPanel({ eventId, batchNumber, isEnabled }: ChatPanelProps) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Use local storage to persist draft message if user navigates away
  const [newMessage, setNewMessage, clearNewMessage] = useLocalStorage(`chat_draft_${eventId}_${batchNumber}`, '');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPath = `events/${eventId}/batches/${batchNumber}/chat`;

  // Subscribe to messages
  useEffect(() => {
    if (!eventId || !batchNumber) return;
    
    const messagesRef = ref(rtdb, chatPath);
    
    // onValue returns the unsubscribe function
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList: ChatMessage[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          userId: msg.userId,
          userName: msg.userName,
          message: msg.message,
          timestamp: msg.timestamp || Date.now(), // Fallback for pending writes
        }));
        
        // Sort by timestamp
        messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    }, (error) => {
      console.error('Chat subscription error:', error);
    });

    return () => unsubscribe();
  }, [eventId, batchNumber, chatPath]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !isEnabled) {
      return;
    }

    setIsSending(true);

    const userName = userData?.email?.split('@')[0] || user.email?.split('@')[0] || 'User';

    try {
      const messagesRef = ref(rtdb, chatPath);
      await push(messagesRef, {
        userId: user.uid,
        userName: userName,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      
      clearNewMessage();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isEnabled) {
    return (
      <div className="bg-[var(--surface-subtle)] rounded-2xl shadow-sm p-6">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-charcoal mb-2">
            Practice Phase in Progress
          </h3>
          <p className="text-gray-600">
            Text chat is disabled during the practice phase to help everyone focus.
            <br />
            It will reopen during the closing phase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-subtle)] rounded-2xl shadow-sm flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-charcoal">
          Batch {batchNumber} Chat
        </h3>
        <p className="text-sm text-gray-500">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = user?.uid === msg.userId;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[70%] rounded-lg px-4 py-2
                    ${
                      isOwnMessage
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-white border border-[var(--border)] text-[var(--text-primary)] shadow-sm'
                    }
                  `}
                >
                  {!isOwnMessage && (
                    <div className="text-xs font-semibold mb-1 opacity-70">
                      {msg.userName}
                    </div>
                  )}
                  <div className="break-words">{msg.message}</div>
                  <div
                    className={`
                      text-xs mt-1 opacity-60
                      ${isOwnMessage ? 'text-right' : 'text-left'}
                    `}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isEnabled || isSending}
            className="flex-1"
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || !isEnabled || isSending}
          >
            {isSending ? '...' : 'Send'}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Be respectful and supportive. Messages are visible to all batch participants.
        </p>
      </form>
    </div>
  );
}
