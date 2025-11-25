import React, { useEffect, useCallback, useRef, useState } from 'react';


const useWebSocket = () => {
  return {
    socket: null,
    subscribe: (_event: string, _callback: (data: any) => void) => {

      return () => {};
    }
  };
};

interface TypingIndicatorOptions {
  conversationId: number;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook for managing TikTok typing indicators
 * Automatically sends typing status when user is typing
 */
export function useTikTokTypingIndicator({
  conversationId,
  enabled = true,
  debounceMs = 1000
}: TypingIndicatorOptions) {
  const { socket: _socket } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(async () => {
    if (!enabled || !conversationId) return;

    try {

      await fetch(`/api/tiktok/typing/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isTyping: true })
      });

      isTypingRef.current = true;


      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }


      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, debounceMs);
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }, [conversationId, enabled, debounceMs]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(async () => {
    if (!enabled || !conversationId || !isTypingRef.current) return;

    try {

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }


      await fetch(`/api/tiktok/typing/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isTyping: false })
      });

      isTypingRef.current = false;
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }, [conversationId, enabled]);

  /**
   * Handle input change - debounced typing indicator
   */
  const handleInputChange = useCallback(() => {
    if (!enabled) return;
    startTyping();
  }, [enabled, startTyping]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        stopTyping();
      }
    };
  }, [stopTyping]);

  return {
    startTyping,
    stopTyping,
    handleInputChange
  };
}

/**
 * Hook for listening to typing indicators from other users
 */
export function useTikTokTypingListener(conversationId: number) {
  const { socket, subscribe } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<number[]>([]);

  useEffect(() => {
    if (!socket || !conversationId) return;


    const unsubscribe = subscribe('userTyping', (data: any) => {
      if (data.conversationId !== conversationId) return;

      setTypingUsers(prev => {
        if (data.isTyping) {

          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        } else {

          return prev.filter(id => id !== data.userId);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [socket, conversationId, subscribe]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0
  };
}

/**
 * Hook for managing user presence status
 */
export function useTikTokPresence(conversationId: number) {
  const { socket, subscribe } = useWebSocket();
  const [presenceMap, setPresenceMap] = useState<Map<number, {
    status: 'online' | 'offline' | 'away';
    lastSeen: Date;
  }>>(new Map());

  /**
   * Update own presence status
   */
  const updatePresence = useCallback(async (status: 'online' | 'offline' | 'away') => {
    if (!conversationId) return;

    try {
      await fetch(`/api/tiktok/presence/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [conversationId]);

  /**
   * Set online when component mounts
   */
  useEffect(() => {
    updatePresence('online');


    return () => {
      updatePresence('offline');
    };
  }, [updatePresence]);

  /**
   * Listen to presence updates from other users
   */
  useEffect(() => {
    if (!socket || !conversationId) return;

    const unsubscribe = subscribe('userPresence', (data: any) => {
      if (data.conversationId !== conversationId) return;

      setPresenceMap(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          status: data.status,
          lastSeen: new Date(data.lastSeen)
        });
        return newMap;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [socket, conversationId, subscribe]);

  /**
   * Get presence for a specific user
   */
  const getUserPresence = useCallback((userId: number) => {
    return presenceMap.get(userId) || null;
  }, [presenceMap]);

  /**
   * Check if user is online
   */
  const isUserOnline = useCallback((userId: number) => {
    const presence = presenceMap.get(userId);
    return presence?.status === 'online';
  }, [presenceMap]);

  return {
    presenceMap,
    getUserPresence,
    isUserOnline,
    updatePresence
  };
}

