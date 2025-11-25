import React, { useEffect, useCallback, useState } from 'react';
import { useToast } from './use-toast';


const useWebSocket = () => {
  return {
    socket: null,
    subscribe: (_event: string, _callback: (data: any) => void) => {

      return () => {};
    }
  };
};

interface ReactionSummary {
  emoji: string;
  count: number;
  users: number[];
}

interface MessageReactions {
  [messageId: number]: ReactionSummary[];
}

/**
 * Hook for managing message reactions
 */
export function useTikTokReactions(conversationId?: number) {
  const { socket, subscribe } = useWebSocket();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<MessageReactions>({});
  const [availableEmojis, setAvailableEmojis] = useState<string[]>([]);

  /**
   * Load available reaction emojis
   */
  useEffect(() => {
    const loadAvailableEmojis = async () => {
      try {
        const response = await fetch('/api/tiktok/reactions/available');
        if (response.ok) {
          const data = await response.json();
          setAvailableEmojis(data.emojis || []);
        }
      } catch (error) {
        console.error('Error loading available emojis:', error);
      }
    };

    loadAvailableEmojis();
  }, []);

  /**
   * Add reaction to a message
   */
  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add reaction');
      }


      setReactions(prev => {
        const messageReactions = prev[messageId] || [];
        const existingReaction = messageReactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {

          return {
            ...prev,
            [messageId]: messageReactions.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1 }
                : r
            )
          };
        } else {

          return {
            ...prev,
            [messageId]: [...messageReactions, { emoji, count: 1, users: [] }]
          };
        }
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: 'Failed to add reaction',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Remove reaction from a message
   */
  const removeReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }


      setReactions(prev => {
        const messageReactions = prev[messageId] || [];
        return {
          ...prev,
          [messageId]: messageReactions
            .map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1 }
                : r
            )
            .filter(r => r.count > 0)
        };
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        title: 'Failed to remove reaction',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Toggle reaction (add if not present, remove if present)
   */
  const toggleReaction = useCallback(async (messageId: number, emoji: string, userId: number) => {
    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(r => r.emoji === emoji);
    
    if (existingReaction && existingReaction.users.includes(userId)) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  }, [reactions, addReaction, removeReaction]);

  /**
   * Load reactions for a message
   */
  const loadReactions = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/reactions`);
      if (response.ok) {
        const data = await response.json();
        setReactions(prev => ({
          ...prev,
          [messageId]: data.reactions || []
        }));
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  }, []);

  /**
   * Listen to reaction updates via WebSocket
   */
  useEffect(() => {
    if (!socket) return;

    const unsubscribe = subscribe('messageReaction', (data: any) => {
      if (conversationId && data.conversationId !== conversationId) return;

      setReactions(prev => {
        const messageReactions = prev[data.messageId] || [];
        
        if (data.action === 'add') {
          const existingReaction = messageReactions.find(r => r.emoji === data.emoji);
          
          if (existingReaction) {
            return {
              ...prev,
              [data.messageId]: messageReactions.map(r =>
                r.emoji === data.emoji
                  ? { ...r, count: r.count + 1, users: [...r.users, data.userId] }
                  : r
              )
            };
          } else {
            return {
              ...prev,
              [data.messageId]: [...messageReactions, { emoji: data.emoji, count: 1, users: [data.userId] }]
            };
          }
        } else if (data.action === 'remove') {
          return {
            ...prev,
            [data.messageId]: messageReactions
              .map(r =>
                r.emoji === data.emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== data.userId) }
                  : r
              )
              .filter(r => r.count > 0)
          };
        }
        
        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [socket, conversationId, subscribe]);

  /**
   * Get reactions for a specific message
   */
  const getReactions = useCallback((messageId: number): ReactionSummary[] => {
    return reactions[messageId] || [];
  }, [reactions]);

  /**
   * Check if user reacted with specific emoji
   */
  const hasUserReacted = useCallback((messageId: number, userId: number, emoji: string): boolean => {
    const messageReactions = reactions[messageId] || [];
    const reaction = messageReactions.find(r => r.emoji === emoji);
    return reaction ? reaction.users.includes(userId) : false;
  }, [reactions]);

  /**
   * Get total reaction count for a message
   */
  const getTotalReactionCount = useCallback((messageId: number): number => {
    const messageReactions = reactions[messageId] || [];
    return messageReactions.reduce((sum, r) => sum + r.count, 0);
  }, [reactions]);

  return {
    reactions,
    availableEmojis,
    addReaction,
    removeReaction,
    toggleReaction,
    loadReactions,
    getReactions,
    hasUserReacted,
    getTotalReactionCount
  };
}

/**
 * Hook for reaction picker
 */
export function useReactionPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);

  const openPicker = useCallback((messageId: number, x: number, y: number) => {
    setTargetMessageId(messageId);
    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setTargetMessageId(null);
    setPosition(null);
  }, []);

  return {
    isOpen,
    position,
    targetMessageId,
    openPicker,
    closePicker
  };
}

