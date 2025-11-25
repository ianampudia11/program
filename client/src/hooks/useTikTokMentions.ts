import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useToast } from './use-toast';


const useWebSocket = () => {
  return {
    socket: null,
    subscribe: (_event: string, _callback: (data: any) => void) => {

      return () => {};
    }
  };
};

interface MentionNotification {
  messageId: number;
  conversationId: number;
  mentionedUserId: number;
  mentionedByUserId: number;
  messageContent: string;
  createdAt: Date;
}

interface MentionSuggestion {
  userId: number;
  userName: string;
  displayName: string;
  avatar?: string;
}

/**
 * Hook for managing mentions
 */
export function useTikTokMentions() {
  const { socket, subscribe } = useWebSocket();
  const { toast } = useToast();
  const [unreadMentions, setUnreadMentions] = useState<MentionNotification[]>([]);

  /**
   * Load unread mentions
   */
  const loadUnreadMentions = useCallback(async () => {
    try {
      const response = await fetch('/api/tiktok/mentions/unread');
      if (response.ok) {
        const data = await response.json();
        setUnreadMentions(data.mentions || []);
      }
    } catch (error) {
      console.error('Error loading unread mentions:', error);
    }
  }, []);

  /**
   * Mark mention as read
   */
  const markMentionAsRead = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`/api/tiktok/mentions/${messageId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        setUnreadMentions(prev => prev.filter(m => m.messageId !== messageId));
      }
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  }, []);

  /**
   * Clear all mentions
   */
  const clearAllMentions = useCallback(async () => {
    try {
      const response = await fetch('/api/tiktok/mentions', {
        method: 'DELETE'
      });

      if (response.ok) {
        setUnreadMentions([]);
      }
    } catch (error) {
      console.error('Error clearing mentions:', error);
    }
  }, []);

  /**
   * Listen to mention notifications via WebSocket
   */
  useEffect(() => {
    if (!socket) return;

    const unsubscribe = subscribe('mention', (data: any) => {
      const notification: MentionNotification = {
        messageId: data.messageId,
        conversationId: data.conversationId,
        mentionedUserId: data.mentionedUserId,
        mentionedByUserId: data.mentionedByUserId,
        messageContent: data.messageContent,
        createdAt: new Date(data.createdAt || Date.now())
      };

      setUnreadMentions(prev => [notification, ...prev]);


      toast({
        title: 'You were mentioned',
        description: data.messageContent.substring(0, 50) + '...',
        duration: 5000
      });
    });

    return () => {
      unsubscribe();
    };
  }, [socket, subscribe, toast]);


  useEffect(() => {
    loadUnreadMentions();
  }, [loadUnreadMentions]);

  return {
    unreadMentions,
    unreadCount: unreadMentions.length,
    loadUnreadMentions,
    markMentionAsRead,
    clearAllMentions
  };
}

/**
 * Hook for mention input with autocomplete
 */
export function useMentionInput(
  initialValue: string = '',
  users: MentionSuggestion[] = []
) {
  const [value, setValue] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  /**
   * Parse current mention query
   */
  const getCurrentMentionQuery = useCallback((text: string, cursorPosition: number): string | null => {

    let atIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atIndex = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (atIndex === -1) return null;


    const query = text.substring(atIndex + 1, cursorPosition);
    

    if (query.includes(' ') || query.includes('\n')) {
      return null;
    }

    setMentionStart(atIndex);
    return query;
  }, []);

  /**
   * Filter users based on query
   */
  const filterUsers = useCallback((query: string): MentionSuggestion[] => {
    if (!query) return users.slice(0, 5);

    const lowerQuery = query.toLowerCase();
    return users
      .filter(user =>
        user.userName.toLowerCase().includes(lowerQuery) ||
        user.displayName.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  }, [users]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((newValue: string, cursorPosition?: number) => {
    setValue(newValue);

    const cursor = cursorPosition ?? inputRef.current?.selectionStart ?? newValue.length;
    const query = getCurrentMentionQuery(newValue, cursor);

    if (query !== null) {
      const filtered = filterUsers(query);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStart(null);
    }
  }, [getCurrentMentionQuery, filterUsers]);

  /**
   * Insert mention
   */
  const insertMention = useCallback((user: MentionSuggestion) => {
    if (mentionStart === null || !inputRef.current) return;

    const cursor = inputRef.current.selectionStart || value.length;
    const before = value.substring(0, mentionStart);
    const after = value.substring(cursor);
    

    const mention = `@[${user.displayName}](${user.userId})`;
    const newValue = before + mention + ' ' + after;
    const newCursor = before.length + mention.length + 1;

    setValue(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(null);


    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursor;
        inputRef.current.selectionEnd = newCursor;
        inputRef.current.focus();
      }
    }, 0);
  }, [mentionStart, value]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, insertMention]);

  /**
   * Parse mentions from text
   */
  const parseMentions = useCallback((text: string): { userId: number; userName: string }[] => {
    const mentions: { userId: number; userName: string }[] = [];
    const pattern = /@\[([^\]]+)\]\((\d+)\)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        userName: match[1],
        userId: parseInt(match[2])
      });
    }

    return mentions;
  }, []);

  /**
   * Format text for display (remove mention syntax)
   */
  const formatForDisplay = useCallback((text: string): string => {
    return text.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1');
  }, []);

  return {
    value,
    setValue,
    showSuggestions,
    suggestions,
    selectedIndex,
    inputRef,
    handleChange,
    handleKeyDown,
    insertMention,
    parseMentions,
    formatForDisplay
  };
}

/**
 * Hook for parsing mentions from text
 * Returns array of mention segments for rendering
 */
export function useMentionHighlight(text: string) {
  const [segments, setSegments] = useState<Array<{ type: 'text' | 'mention'; content: string; userId?: number; index?: number }>>([]);

  useEffect(() => {
    const pattern = /@\[([^\]]+)\]\((\d+)\)/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: number; index?: number }> = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {

      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }


      parts.push({
        type: 'mention',
        content: match[1],
        userId: parseInt(match[2]),
        index: match.index
      });

      lastIndex = match.index + match[0].length;
    }


    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    setSegments(parts);
  }, [text]);

  return segments;
}

