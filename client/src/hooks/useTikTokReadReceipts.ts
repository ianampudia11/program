import React, { useEffect, useCallback, useState } from 'react';


const useWebSocket = () => {
  return {
    socket: null,
    subscribe: (_event: string, _callback: (data: any) => void) => {

      return () => {};
    }
  };
};

interface MessageDeliveryStatus {
  status: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  error?: string;
  readBy?: number[];
}

interface ReadReceipt {
  userId: number;
  readAt: Date;
}

/**
 * Hook for managing read receipts and delivery status
 */
export function useTikTokReadReceipts(conversationId: number) {
  const { socket, subscribe } = useWebSocket();
  const [messageStatuses, setMessageStatuses] = useState<Map<number, MessageDeliveryStatus>>(new Map());

  /**
   * Mark a message as read
   */
  const markMessageAsRead = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  /**
   * Mark entire conversation as read
   */
  const markConversationAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/tiktok/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark conversation as read');
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [conversationId]);

  /**
   * Get delivery status for a message
   */
  const getMessageStatus = useCallback(async (messageId: number): Promise<MessageDeliveryStatus | null> => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to get message status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Error getting message status:', error);
      return null;
    }
  }, []);

  /**
   * Get read receipts for a message
   */
  const getReadReceipts = useCallback(async (messageId: number): Promise<ReadReceipt[]> => {
    try {
      const response = await fetch(`/api/tiktok/messages/${messageId}/receipts`);
      
      if (!response.ok) {
        throw new Error('Failed to get read receipts');
      }

      const data = await response.json();
      return data.receipts || [];
    } catch (error) {
      console.error('Error getting read receipts:', error);
      return [];
    }
  }, []);

  /**
   * Listen to message status updates via WebSocket
   */
  useEffect(() => {
    if (!socket || !conversationId) return;

    const unsubscribe = subscribe('messageStatusUpdate', (data: any) => {
      if (data.conversationId !== conversationId) return;

      setMessageStatuses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.messageId);

        newMap.set(data.messageId, {
          status: data.status,
          sentAt: data.sentAt ? new Date(data.sentAt) : existing?.sentAt,
          deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : existing?.deliveredAt,
          readAt: data.readAt ? new Date(data.readAt) : existing?.readAt,
          failedAt: data.failedAt ? new Date(data.failedAt) : existing?.failedAt,
          error: data.error || existing?.error,
          readBy: data.readBy || existing?.readBy
        });

        return newMap;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [socket, conversationId, subscribe]);

  /**
   * Get status for a specific message
   */
  const getStatus = useCallback((messageId: number): MessageDeliveryStatus | null => {
    return messageStatuses.get(messageId) || null;
  }, [messageStatuses]);

  /**
   * Check if message is read
   */
  const isMessageRead = useCallback((messageId: number): boolean => {
    const status = messageStatuses.get(messageId);
    return status?.status === 'read';
  }, [messageStatuses]);

  /**
   * Check if message is delivered
   */
  const isMessageDelivered = useCallback((messageId: number): boolean => {
    const status = messageStatuses.get(messageId);
    return status?.status === 'delivered' || status?.status === 'read';
  }, [messageStatuses]);

  return {
    messageStatuses,
    markMessageAsRead,
    markConversationAsRead,
    getMessageStatus,
    getReadReceipts,
    getStatus,
    isMessageRead,
    isMessageDelivered
  };
}

/**
 * Hook for auto-marking messages as read when viewed
 */
export function useAutoReadReceipts(conversationId: number, enabled: boolean = true) {
  const { markMessageAsRead } = useTikTokReadReceipts(conversationId);
  const [viewedMessages, setViewedMessages] = useState<Set<number>>(new Set());

  /**
   * Mark message as viewed (will trigger read receipt)
   */
  const markAsViewed = useCallback((messageId: number) => {
    if (!enabled) return;
    
    if (!viewedMessages.has(messageId)) {
      setViewedMessages(prev => new Set(prev).add(messageId));
      markMessageAsRead(messageId);
    }
  }, [enabled, viewedMessages, markMessageAsRead]);

  /**
   * Mark multiple messages as viewed
   */
  const markMultipleAsViewed = useCallback((messageIds: number[]) => {
    if (!enabled) return;
    
    const newMessages = messageIds.filter(id => !viewedMessages.has(id));
    if (newMessages.length > 0) {
      setViewedMessages(prev => {
        const newSet = new Set(prev);
        newMessages.forEach(id => newSet.add(id));
        return newSet;
      });
      

      newMessages.forEach(id => markMessageAsRead(id));
    }
  }, [enabled, viewedMessages, markMessageAsRead]);

  return {
    markAsViewed,
    markMultipleAsViewed,
    viewedMessages
  };
}

/**
 * Hook for tracking message visibility (Intersection Observer)
 */
export function useMessageVisibility(
  _conversationId: number,
  onMessageVisible: (messageId: number) => void,
  options?: IntersectionObserverInit
) {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const [observedElements, setObservedElements] = React.useState<Map<Element, number>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageId = observedElements.get(entry.target);
          if (messageId) {
            onMessageVisible(messageId);
          }
        }
      });
    }, {
      threshold: 0.5, // Message must be 50% visible
      ...options
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onMessageVisible, options, observedElements]);

  /**
   * Observe a message element
   */
  const observe = useCallback((element: Element, messageId: number) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
      setObservedElements(prev => new Map(prev).set(element, messageId));
    }
  }, []);

  /**
   * Stop observing an element
   */
  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      setObservedElements(prev => {
        const newMap = new Map(prev);
        newMap.delete(element);
        return newMap;
      });
    }
  }, []);

  return {
    observe,
    unobserve
  };
}

