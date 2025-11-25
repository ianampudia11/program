import { storage } from '../../storage';
import { InsertMessage, InsertConversation, InsertContact } from '@shared/schema';
import { EventEmitter } from 'events';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { smartWebSocketBroadcaster } from '../../utils/smart-websocket-broadcaster';
import { eventEmitterPool } from '../../utils/event-emitter-pool';
import { eventEmitterMonitor } from '../../utils/event-emitter-monitor';
import type {
  TikTokConnectionData,
  TikTokPlatformConfig,
  TikTokOAuthTokenResponse,
  TikTokUserInfo,
  TikTokMessage,
  TikTokSendMessageRequest,
  TikTokSendMessageResponse,
  TikTokAPIError,
  TikTokRateLimit
} from '@shared/types/tiktok';

interface ConnectionState {
  isActive: boolean;
  lastActivity: Date;
  errorCount: number;
  lastError: string | null;
  userInfo: TikTokUserInfo | null;
  consecutiveFailures: number;
  lastSuccessfulValidation: Date | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryAttempt: Date | null;
  rateLimit: TikTokRateLimit | null;
}





interface TypingIndicatorState {
  conversationId: number;
  userId: number;
  isTyping: boolean;
  startedAt: Date;
  timeout?: NodeJS.Timeout;
}

interface PresenceState {
  conversationId: number;
  userId: number;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  timeout?: NodeJS.Timeout;
}


const typingIndicators = new Map<number, Map<number, TypingIndicatorState>>();


const presenceStates = new Map<number, PresenceState>();


const TYPING_INDICATOR_TIMEOUT = 5000; // 5 seconds
const PRESENCE_TIMEOUT = 60000; // 1 minute
const TYPING_SIMULATION_WPM = 50; // Words per minute for realistic typing simulation





interface MessageStatusTracking {
  messageId: number;
  channelMessageId: string;
  conversationId: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  error?: string;
  readBy?: number[]; // User IDs who read the message
}


const messageStatusMap = new Map<number, MessageStatusTracking>();


const readReceiptsByConversation = new Map<number, Map<number, Date>>(); // conversationId -> Map<messageId, readAt>





interface MessageReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  createdAt: Date;
}

interface MessageMention {
  userId: number;
  userName: string;
  startIndex: number;
  length: number;
}

interface MentionNotification {
  messageId: number;
  conversationId: number;
  mentionedUserId: number;
  mentionedByUserId: number;
  messageContent: string;
  createdAt: Date;
}


const messageReactions = new Map<number, Map<string, MessageReaction[]>>(); // messageId -> Map<emoji, reactions[]>


const messageMentions = new Map<number, MessageMention[]>(); // messageId -> mentions[]


const unreadMentions = new Map<number, MentionNotification[]>(); // userId -> notifications[]


const AVAILABLE_REACTIONS = [
  '❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '🎉', '💯',
  '👏', '🙏', '💪', '✨', '⭐', '💖', '😍', '🤔', '😎', '🥳'
];

const activeConnections = new Map<number, boolean>();
const connectionStates = new Map<number, ConnectionState>();
const healthMonitoringIntervals = new Map<number, NodeJS.Timeout>();
const recoveryTimeouts = new Map<number, NodeJS.Timeout>();


const HEALTH_CHECK_INTERVALS = {
  ACTIVE: 120000,    // 2 minutes for active connections
  INACTIVE: 300000,  // 5 minutes for inactive connections
  ERROR: 60000,      // 1 minute for connections with errors
  RECOVERY: 30000    // 30 seconds during recovery
};


const ACTIVITY_THRESHOLDS = {
  INACTIVE_TIMEOUT: 600000,  // 10 minutes
  ACTIVE_THRESHOLD: 300000,  // 5 minutes
  TOKEN_VALIDATION_INTERVAL: 3600000, // 1 hour
  TOKEN_REFRESH_BUFFER: 86400000, // 24 hours (refresh 1 day before expiry)
  MAX_RECOVERY_ATTEMPTS: 3,
  RECOVERY_BACKOFF_BASE: 30000 // 30 seconds
};


const TIKTOK_API_VERSION = 'v2';
const TIKTOK_OAUTH_BASE_URL = 'https://open.tiktokapis.com';
const TIKTOK_AUTH_BASE_URL = 'https://www.tiktok.com';
const TIKTOK_BUSINESS_API_BASE_URL = 'https://business-api.tiktok.com'; // Estimated - will be confirmed with partner access


const TIKTOK_RATE_LIMIT = {
  MAX_QPS: 10, // 10 queries per second
  WINDOW_MS: 1000 // 1 second window
};


const TIKTOK_NAMESPACE = 'tiktok-service';
const pooledEmitter = eventEmitterPool.getEmitter(TIKTOK_NAMESPACE);
eventEmitterMonitor.register('tiktok-service', pooledEmitter);


const eventEmitter = pooledEmitter;





/**
 * Emit TikTok event to event emitter
 */
function emitTikTokEvent(eventName: string, data: any): void {
  eventEmitterPool.emit(TIKTOK_NAMESPACE, eventName, data);
}

/**
 * Broadcast TikTok event via WebSocket
 */
function broadcastTikTokEvent(eventType: string, data: any, options: {
  companyId?: number | null;
  userId?: number | null;
  conversationId?: number | null;
  priority?: 'high' | 'normal' | 'low';
} = {}): void {
  smartWebSocketBroadcaster.broadcast({
    type: eventType,
    data,
    companyId: options.companyId ?? undefined,
    userId: options.userId ?? undefined,
    conversationId: options.conversationId ?? undefined,
    priority: options.priority || 'normal',
    batchable: options.priority !== 'high'
  });
}





/**
 * Add reaction to a message
 */
async function addReaction(
  messageId: number,
  userId: number,
  emoji: string,
  companyId: number
): Promise<void> {
  try {

    if (!AVAILABLE_REACTIONS.includes(emoji)) {
      throw new Error(`Invalid reaction emoji: ${emoji}`);
    }


    const message = await storage.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }


    const conversation = await storage.getConversation(message.conversationId);
    if (!conversation || conversation.companyId !== companyId) {
      throw new Error('Access denied');
    }


    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, new Map());
    }

    const reactions = messageReactions.get(messageId)!;
    if (!reactions.has(emoji)) {
      reactions.set(emoji, []);
    }

    const emojiReactions = reactions.get(emoji)!;
    const existingReaction = emojiReactions.find(r => r.userId === userId);

    if (existingReaction) {
      logger.debug('tiktok', `User ${userId} already reacted with ${emoji} to message ${messageId}`);
      return;
    }


    const reaction: MessageReaction = {
      id: Date.now(), // Simple ID generation
      messageId,
      userId,
      emoji,
      createdAt: new Date()
    };

    emojiReactions.push(reaction);


    const currentMetadata = (message.metadata as any) || {};
    const currentReactions = currentMetadata.reactions || [];
    currentReactions.push({
      userId,
      emoji,
      createdAt: reaction.createdAt
    });

    await storage.updateMessage(messageId, {
      metadata: {
        ...currentMetadata,
        reactions: currentReactions
      }
    });


    emitTikTokEvent('reactionAdded', {
      messageId,
      userId,
      emoji,
      reaction
    });


    broadcastTikTokEvent('messageReaction', {
      messageId,
      conversationId: message.conversationId,
      userId,
      emoji,
      action: 'add',
      reaction
    }, {
      companyId,
      conversationId: message.conversationId,
      priority: 'normal'
    });

    logger.info('tiktok', `Reaction ${emoji} added to message ${messageId} by user ${userId}`);
  } catch (error) {
    logger.error('tiktok', 'Error adding reaction:', error);
    throw error;
  }
}

/**
 * Remove reaction from a message
 */
async function removeReaction(
  messageId: number,
  userId: number,
  emoji: string,
  companyId: number
): Promise<void> {
  try {

    const message = await storage.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }


    const conversation = await storage.getConversation(message.conversationId);
    if (!conversation || conversation.companyId !== companyId) {
      throw new Error('Access denied');
    }


    const reactions = messageReactions.get(messageId);
    if (reactions && reactions.has(emoji)) {
      const emojiReactions = reactions.get(emoji)!;
      const index = emojiReactions.findIndex(r => r.userId === userId);
      if (index !== -1) {
        emojiReactions.splice(index, 1);


        if (emojiReactions.length === 0) {
          reactions.delete(emoji);
        }
      }
    }


    const currentMetadata = (message.metadata as any) || {};
    const currentReactions = currentMetadata.reactions || [];
    const updatedReactions = currentReactions.filter(
      (r: any) => !(r.userId === userId && r.emoji === emoji)
    );

    await storage.updateMessage(messageId, {
      metadata: {
        ...currentMetadata,
        reactions: updatedReactions
      }
    });


    emitTikTokEvent('reactionRemoved', {
      messageId,
      userId,
      emoji
    });


    broadcastTikTokEvent('messageReaction', {
      messageId,
      conversationId: message.conversationId,
      userId,
      emoji,
      action: 'remove'
    }, {
      companyId,
      conversationId: message.conversationId,
      priority: 'normal'
    });

    logger.info('tiktok', `Reaction ${emoji} removed from message ${messageId} by user ${userId}`);
  } catch (error) {
    logger.error('tiktok', 'Error removing reaction:', error);
    throw error;
  }
}

/**
 * Get reactions for a message
 */
function getMessageReactions(messageId: number): Map<string, MessageReaction[]> {
  return messageReactions.get(messageId) || new Map();
}

/**
 * Get reaction summary for a message
 */
function getReactionSummary(messageId: number): { emoji: string; count: number; users: number[] }[] {
  const reactions = messageReactions.get(messageId);
  if (!reactions) return [];

  const summary: { emoji: string; count: number; users: number[] }[] = [];

  reactions.forEach((reactionList, emoji) => {
    summary.push({
      emoji,
      count: reactionList.length,
      users: reactionList.map(r => r.userId)
    });
  });

  return summary.sort((a, b) => b.count - a.count);
}

/**
 * Check if user reacted to message
 */
function hasUserReacted(messageId: number, userId: number, emoji?: string): boolean {
  const reactions = messageReactions.get(messageId);
  if (!reactions) return false;

  if (emoji) {
    const emojiReactions = reactions.get(emoji);
    return emojiReactions ? emojiReactions.some(r => r.userId === userId) : false;
  }


  for (const reactionList of Array.from(reactions.values())) {
    if (reactionList.some((r: MessageReaction) => r.userId === userId)) {
      return true;
    }
  }

  return false;
}





/**
 * Parse mentions from message content
 * Format: @username or @[User Name](userId)
 */
function parseMentions(content: string): MessageMention[] {
  const mentions: MessageMention[] = [];


  const pattern1 = /@\[([^\]]+)\]\((\d+)\)/g;
  let match;

  while ((match = pattern1.exec(content)) !== null) {
    mentions.push({
      userId: parseInt(match[2]),
      userName: match[1],
      startIndex: match.index,
      length: match[0].length
    });
  }



  const pattern2 = /@(\w+)/g;
  while ((match = pattern2.exec(content)) !== null) {

    const alreadyMatched = mentions.some(
      m => match!.index >= m.startIndex && match!.index < m.startIndex + m.length
    );

    if (!alreadyMatched) {
      mentions.push({
        userId: 0, // Would need to resolve username to userId
        userName: match[1],
        startIndex: match.index,
        length: match[0].length
      });
    }
  }

  return mentions;
}

/**
 * Add mentions to a message
 */
async function addMentionsToMessage(
  messageId: number,
  content: string,
  senderId: number,
  conversationId: number,
  companyId: number
): Promise<void> {
  try {
    const mentions = parseMentions(content);

    if (mentions.length === 0) {
      return;
    }


    messageMentions.set(messageId, mentions);


    for (const mention of mentions) {
      if (mention.userId === 0 || mention.userId === senderId) {
        continue; // Skip unresolved or self-mentions
      }

      const notification: MentionNotification = {
        messageId,
        conversationId,
        mentionedUserId: mention.userId,
        mentionedByUserId: senderId,
        messageContent: content.substring(0, 100), // First 100 chars
        createdAt: new Date()
      };

      if (!unreadMentions.has(mention.userId)) {
        unreadMentions.set(mention.userId, []);
      }
      unreadMentions.get(mention.userId)!.push(notification);


      emitTikTokEvent('userMentioned', {
        messageId,
        conversationId,
        mentionedUserId: mention.userId,
        mentionedByUserId: senderId,
        mention
      });


      broadcastTikTokEvent('mention', {
        messageId,
        conversationId,
        mentionedUserId: mention.userId,
        mentionedByUserId: senderId,
        messageContent: content.substring(0, 100),
        mention
      }, {
        companyId,
        userId: mention.userId, // Target specific user
        priority: 'high'
      });
    }

    logger.info('tiktok', `${mentions.length} mentions added to message ${messageId}`);
  } catch (error) {
    logger.error('tiktok', 'Error adding mentions:', error);
  }
}

/**
 * Get mentions for a message
 */
function getMessageMentions(messageId: number): MessageMention[] {
  return messageMentions.get(messageId) || [];
}

/**
 * Get unread mentions for a user
 */
function getUnreadMentions(userId: number): MentionNotification[] {
  return unreadMentions.get(userId) || [];
}

/**
 * Mark mention as read
 */
function markMentionAsRead(userId: number, messageId: number): void {
  const mentions = unreadMentions.get(userId);
  if (!mentions) return;

  const index = mentions.findIndex(m => m.messageId === messageId);
  if (index !== -1) {
    mentions.splice(index, 1);

    if (mentions.length === 0) {
      unreadMentions.delete(userId);
    }
  }
}

/**
 * Clear all mentions for a user
 */
function clearUserMentions(userId: number): void {
  unreadMentions.delete(userId);
}

/**
 * Format message content with mentions for display
 */
function formatMessageWithMentions(content: string, mentions: MessageMention[]): string {
  if (mentions.length === 0) return content;


  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);

  let formattedContent = content;

  for (const mention of sortedMentions) {
    const before = formattedContent.substring(0, mention.startIndex);
    const after = formattedContent.substring(mention.startIndex + mention.length);
    formattedContent = `${before}@${mention.userName}${after}`;
  }

  return formattedContent;
}





/**
 * Track message status
 */
function trackMessageStatus(
  messageId: number,
  channelMessageId: string,
  conversationId: number,
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
  error?: string
): void {
  try {
    const existing = messageStatusMap.get(messageId);
    const now = new Date();

    const tracking: MessageStatusTracking = {
      messageId,
      channelMessageId,
      conversationId,
      status,
      sentAt: existing?.sentAt || (status === 'sent' ? now : undefined),
      deliveredAt: existing?.deliveredAt || (status === 'delivered' ? now : undefined),
      readAt: existing?.readAt || (status === 'read' ? now : undefined),
      failedAt: existing?.failedAt || (status === 'failed' ? now : undefined),
      error: error || existing?.error,
      readBy: existing?.readBy || []
    };

    messageStatusMap.set(messageId, tracking);

    logger.debug('tiktok', `Message ${messageId} status tracked: ${status}`);
  } catch (error) {
    logger.error('tiktok', 'Error tracking message status:', error);
  }
}

/**
 * Get message status tracking
 */
function getMessageStatusTracking(messageId: number): MessageStatusTracking | null {
  return messageStatusMap.get(messageId) || null;
}

/**
 * Mark message as read by user
 */
async function markMessageAsRead(
  messageId: number,
  userId: number,
  companyId: number
): Promise<void> {
  try {

    const message = await storage.getMessageById(messageId);
    if (!message) {
      logger.warn('tiktok', `Message ${messageId} not found for read receipt`);
      return;
    }


    await storage.updateMessage(messageId, { status: 'read' });


    const tracking = messageStatusMap.get(messageId);
    if (tracking) {
      if (!tracking.readBy) {
        tracking.readBy = [];
      }
      if (!tracking.readBy.includes(userId)) {
        tracking.readBy.push(userId);
      }
      tracking.readAt = new Date();
      tracking.status = 'read';
    }


    if (!readReceiptsByConversation.has(message.conversationId)) {
      readReceiptsByConversation.set(message.conversationId, new Map());
    }
    const conversationReceipts = readReceiptsByConversation.get(message.conversationId)!;
    conversationReceipts.set(messageId, new Date());


    emitTikTokEvent('messageRead', {
      messageId,
      userId,
      conversationId: message.conversationId,
      readAt: new Date()
    });


    broadcastTikTokEvent('messageStatusUpdate', {
      messageId,
      conversationId: message.conversationId,
      status: 'read',
      readBy: tracking?.readBy || [userId],
      readAt: new Date()
    }, {
      companyId,
      conversationId: message.conversationId,
      priority: 'normal'
    });

    logger.debug('tiktok', `Message ${messageId} marked as read by user ${userId}`);
  } catch (error) {
    logger.error('tiktok', 'Error marking message as read:', error);
  }
}

/**
 * Mark all messages in conversation as read
 */
async function markConversationAsRead(
  conversationId: number,
  userId: number,
  companyId: number
): Promise<void> {
  try {

    const messages = await storage.getMessagesByConversation(conversationId);
    const unreadMessages = messages.filter(msg =>
      msg.status !== 'read' && msg.senderType === 'contact'
    );


    for (const message of unreadMessages) {
      await markMessageAsRead(message.id, userId, companyId);
    }


    broadcastTikTokEvent('conversationRead', {
      conversationId,
      userId,
      messageCount: unreadMessages.length,
      readAt: new Date()
    }, {
      companyId,
      conversationId,
      priority: 'normal'
    });

    logger.info('tiktok', `Conversation ${conversationId} marked as read by user ${userId} (${unreadMessages.length} messages)`);
  } catch (error) {
    logger.error('tiktok', 'Error marking conversation as read:', error);
  }
}

/**
 * Get read receipts for a message
 */
function getMessageReadReceipts(messageId: number): { userId: number; readAt: Date }[] {
  const tracking = messageStatusMap.get(messageId);
  if (!tracking || !tracking.readBy) {
    return [];
  }

  return tracking.readBy.map(userId => ({
    userId,
    readAt: tracking.readAt || new Date()
  }));
}

/**
 * Get delivery status for a message
 */
async function getMessageDeliveryStatus(messageId: number): Promise<{
  status: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  error?: string;
  readBy?: number[];
} | null> {
  try {
    const message = await storage.getMessageById(messageId);
    if (!message) {
      return null;
    }

    const tracking = messageStatusMap.get(messageId);

    return {
      status: message.status || 'unknown',
      sentAt: tracking?.sentAt,
      deliveredAt: tracking?.deliveredAt,
      readAt: tracking?.readAt,
      failedAt: tracking?.failedAt,
      error: tracking?.error,
      readBy: tracking?.readBy
    };
  } catch (error) {
    logger.error('tiktok', 'Error getting message delivery status:', error);
    return null;
  }
}

/**
 * Send read receipt to TikTok (if supported by API)
 */
async function sendReadReceipt(
  connectionId: number,
  messageId: string
): Promise<void> {
  try {




    logger.debug('tiktok', `Read receipt sent for message ${messageId}`);
  } catch (error) {
    logger.error('tiktok', 'Error sending read receipt:', error);
  }
}





/**
 * Start typing indicator for a user in a conversation
 */
function startTypingIndicator(conversationId: number, userId: number, companyId: number): void {
  try {

    if (!typingIndicators.has(conversationId)) {
      typingIndicators.set(conversationId, new Map());
    }

    const conversationTyping = typingIndicators.get(conversationId)!;


    const existingState = conversationTyping.get(userId);
    if (existingState?.timeout) {
      clearTimeout(existingState.timeout);
    }


    const timeout = setTimeout(() => {
      stopTypingIndicator(conversationId, userId, companyId);
    }, TYPING_INDICATOR_TIMEOUT);

    conversationTyping.set(userId, {
      conversationId,
      userId,
      isTyping: true,
      startedAt: new Date(),
      timeout
    });


    broadcastTikTokEvent('userTyping', {
      conversationId,
      userId,
      isTyping: true
    }, {
      companyId,
      conversationId,
      priority: 'high'
    });

    logger.debug('tiktok', `User ${userId} started typing in conversation ${conversationId}`);
  } catch (error) {
    logger.error('tiktok', 'Error starting typing indicator:', error);
  }
}

/**
 * Stop typing indicator for a user in a conversation
 */
function stopTypingIndicator(conversationId: number, userId: number, companyId: number): void {
  try {
    const conversationTyping = typingIndicators.get(conversationId);
    if (!conversationTyping) return;

    const state = conversationTyping.get(userId);
    if (!state) return;


    if (state.timeout) {
      clearTimeout(state.timeout);
    }


    conversationTyping.delete(userId);


    if (conversationTyping.size === 0) {
      typingIndicators.delete(conversationId);
    }


    broadcastTikTokEvent('userTyping', {
      conversationId,
      userId,
      isTyping: false
    }, {
      companyId,
      conversationId,
      priority: 'normal'
    });

    logger.debug('tiktok', `User ${userId} stopped typing in conversation ${conversationId}`);
  } catch (error) {
    logger.error('tiktok', 'Error stopping typing indicator:', error);
  }
}

/**
 * Get typing users in a conversation
 */
function getTypingUsers(conversationId: number): number[] {
  const conversationTyping = typingIndicators.get(conversationId);
  if (!conversationTyping) return [];

  return Array.from(conversationTyping.values())
    .filter(state => state.isTyping)
    .map(state => state.userId);
}

/**
 * Update user presence status
 */
function updatePresenceStatus(
  userId: number,
  conversationId: number,
  status: 'online' | 'offline' | 'away',
  companyId: number
): void {
  try {

    const existingState = presenceStates.get(userId);
    if (existingState?.timeout) {
      clearTimeout(existingState.timeout);
    }


    let timeout: NodeJS.Timeout | undefined;
    if (status === 'online') {
      timeout = setTimeout(() => {
        updatePresenceStatus(userId, conversationId, 'away', companyId);
      }, PRESENCE_TIMEOUT);
    }


    presenceStates.set(userId, {
      conversationId,
      userId,
      status,
      lastSeen: new Date(),
      timeout
    });


    broadcastTikTokEvent('userPresence', {
      userId,
      conversationId,
      status,
      lastSeen: new Date()
    }, {
      companyId,
      conversationId,
      priority: 'normal'
    });

    logger.debug('tiktok', `User ${userId} presence updated to ${status}`);
  } catch (error) {
    logger.error('tiktok', 'Error updating presence status:', error);
  }
}

/**
 * Get user presence status
 */
function getUserPresence(userId: number): PresenceState | null {
  return presenceStates.get(userId) || null;
}

/**
 * Calculate realistic typing delay based on message length
 */
function calculateTypingDelay(message: string): number {
  const words = message.split(/\s+/).length;
  const baseDelay = (words / TYPING_SIMULATION_WPM) * 60 * 1000;


  const randomFactor = 0.7 + Math.random() * 0.6;
  const delay = baseDelay * randomFactor;


  return Math.min(Math.max(delay, 1000), 5000);
}

/**
 * Simulate typing indicator before sending message
 */
async function simulateTyping(
  conversationId: number,
  userId: number,
  companyId: number,
  message: string
): Promise<void> {
  try {

    startTypingIndicator(conversationId, userId, companyId);


    const delay = calculateTypingDelay(message);


    await new Promise(resolve => setTimeout(resolve, delay));


    stopTypingIndicator(conversationId, userId, companyId);
  } catch (error) {
    logger.error('tiktok', 'Error simulating typing:', error);

    stopTypingIndicator(conversationId, userId, companyId);
  }
}





/**
 * Get or create connection state
 */
function getConnectionState(connectionId: number): ConnectionState {
  if (!connectionStates.has(connectionId)) {
    connectionStates.set(connectionId, {
      isActive: false,
      lastActivity: new Date(),
      errorCount: 0,
      lastError: null,
      userInfo: null,
      consecutiveFailures: 0,
      lastSuccessfulValidation: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryAttempt: null,
      rateLimit: null
    });
  }
  return connectionStates.get(connectionId)!;
}

/**
 * Update connection activity
 */
function updateConnectionActivity(connectionId: number, success: boolean = true, error?: string) {
  const state = getConnectionState(connectionId);
  state.lastActivity = new Date();

  if (success) {
    state.errorCount = 0;
    state.consecutiveFailures = 0;
    state.lastError = null;
    state.isActive = true;
    state.lastSuccessfulValidation = new Date();
    

    if (state.isRecovering) {
      state.isRecovering = false;
      state.recoveryAttempts = 0;
      state.lastRecoveryAttempt = null;
      logger.info('tiktok', `Connection ${connectionId} recovered successfully`);
      

      const recoveryTimeout = recoveryTimeouts.get(connectionId);
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout);
        recoveryTimeouts.delete(connectionId);
      }
    }
  } else {
    state.errorCount++;
    state.consecutiveFailures++;
    state.lastError = error || 'Unknown error';
    

    if (state.consecutiveFailures >= 3 && !state.isRecovering) {
      initiateConnectionRecovery(connectionId);
    }
  }
}

/**
 * Get adaptive health check interval based on connection state
 */
function getAdaptiveHealthCheckInterval(state: ConnectionState): number {
  if (state.isRecovering) {
    return HEALTH_CHECK_INTERVALS.RECOVERY;
  }
  if (state.errorCount > 0) {
    return HEALTH_CHECK_INTERVALS.ERROR;
  }
  if (state.isActive) {
    return HEALTH_CHECK_INTERVALS.ACTIVE;
  }
  return HEALTH_CHECK_INTERVALS.INACTIVE;
}





/**
 * Get TikTok platform configuration
 */
async function getPlatformConfig(): Promise<TikTokPlatformConfig> {
  const config = await storage.getPartnerConfiguration('tiktok');
  
  if (!config || !config.isActive) {
    throw new Error('TikTok platform configuration not found or inactive');
  }

  return {
    clientKey: config.partnerApiKey,
    clientSecret: config.partnerId, // Stored in partnerId field
    webhookUrl: config.partnerWebhookUrl || '',
    webhookSecret: (config as any).webhookVerifyToken || undefined,
    apiVersion: TIKTOK_API_VERSION,
    apiBaseUrl: TIKTOK_BUSINESS_API_BASE_URL,
    partnerId: config.partnerId,
    partnerName: (config.publicProfile as any)?.companyName || undefined,
    logoUrl: (config.publicProfile as any)?.logoUrl || undefined,
    redirectUrl: config.redirectUrl || undefined
  };
}





/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TikTokOAuthTokenResponse> {
  try {
    const platformConfig = await getPlatformConfig();
    
    const response = await axios.post(
      `${TIKTOK_OAUTH_BASE_URL}/${TIKTOK_API_VERSION}/oauth/token/`,
      new URLSearchParams({
        client_key: platformConfig.clientKey,
        client_secret: platformConfig.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    logger.info('tiktok', 'Successfully exchanged authorization code for access token');
    return response.data;
  } catch (error) {
    logger.error('tiktok', 'Error exchanging authorization code:', error);
    throw handleTikTokError(error);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<TikTokOAuthTokenResponse> {
  try {
    const platformConfig = await getPlatformConfig();
    
    const response = await axios.post(
      `${TIKTOK_OAUTH_BASE_URL}/${TIKTOK_API_VERSION}/oauth/token/`,
      new URLSearchParams({
        client_key: platformConfig.clientKey,
        client_secret: platformConfig.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    logger.info('tiktok', 'Successfully refreshed access token');
    return response.data;
  } catch (error) {
    logger.error('tiktok', 'Error refreshing access token:', error);
    throw handleTikTokError(error);
  }
}

/**
 * Check if token needs refresh and refresh if necessary
 */
async function ensureValidToken(connectionId: number): Promise<string> {
  const connection = await storage.getChannelConnection(connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }

  const connectionData = connection.connectionData as TikTokConnectionData;
  const now = Date.now();
  

  if (connectionData.tokenExpiresAt && connectionData.tokenExpiresAt < now + ACTIVITY_THRESHOLDS.TOKEN_REFRESH_BUFFER) {
    logger.info('tiktok', `Token expiring soon for connection ${connectionId}, refreshing...`);
    
    try {
      const tokenResponse = await refreshAccessToken(connectionData.refreshToken);
      

      const updatedConnectionData: TikTokConnectionData = {
        ...connectionData,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: now + (tokenResponse.expires_in * 1000),
        lastSyncAt: now,
        status: 'active'
      };
      
      await storage.updateChannelConnection(connectionId, {
        accessToken: tokenResponse.access_token,
        connectionData: updatedConnectionData
      });
      
      updateConnectionActivity(connectionId, true);
      logger.info('tiktok', `Token refreshed successfully for connection ${connectionId}`);
      
      return tokenResponse.access_token;
    } catch (error) {
      logger.error('tiktok', `Failed to refresh token for connection ${connectionId}:`, error);
      await handleTokenExpiration(connectionId);
      throw error;
    }
  }
  
  return connectionData.accessToken;
}





/**
 * Get TikTok user information
 */
async function getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  try {
    const response = await axios.get(
      `${TIKTOK_OAUTH_BASE_URL}/${TIKTOK_API_VERSION}/user/info/`,
      {
        params: {
          fields: 'open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,username'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    logger.debug('tiktok', 'Successfully retrieved user info');
    return response.data.data.user;
  } catch (error) {
    logger.error('tiktok', 'Error getting user info:', error);
    throw handleTikTokError(error);
  }
}





/**
 * Start health monitoring for a connection
 */
function startHealthMonitoring(connectionId: number) {
  stopHealthMonitoring(connectionId);

  const performHealthCheck = async () => {
    try {
      const connection = await storage.getChannelConnection(connectionId);
      if (!connection) {
        stopHealthMonitoring(connectionId);
        return;
      }

      const state = getConnectionState(connectionId);
      const timeSinceValidation = state.lastSuccessfulValidation
        ? Date.now() - state.lastSuccessfulValidation.getTime()
        : Infinity;


      if (timeSinceValidation > ACTIVITY_THRESHOLDS.TOKEN_VALIDATION_INTERVAL) {
        await validateTokenHealth(connectionId);
      }


      await ensureValidToken(connectionId);


      if (!state.isActive) {
        state.isActive = true;
        const connection = await storage.updateChannelConnectionStatus(connectionId, 'active');


        emitTikTokEvent('connectionStatusUpdate', {
          connectionId,
          status: 'active'
        });


        if (connection) {
          broadcastTikTokEvent('connectionStatusUpdate', {
            connectionId,
            status: 'active',
            connection: connection
          }, {
            companyId: connection.companyId,
            priority: 'normal'
          });
        }

        logger.info('tiktok', `Connection ${connectionId} marked as active`);
      }


      const nextInterval = getAdaptiveHealthCheckInterval(state);
      const timeout = setTimeout(performHealthCheck, nextInterval);
      healthMonitoringIntervals.set(connectionId, timeout);

    } catch (error) {
      logger.error('tiktok', `Health monitoring error for connection ${connectionId}:`, error);
      updateConnectionActivity(connectionId, false, error instanceof Error ? error.message : 'Health check failed');


      const timeout = setTimeout(performHealthCheck, HEALTH_CHECK_INTERVALS.ERROR);
      healthMonitoringIntervals.set(connectionId, timeout);
    }
  };


  performHealthCheck();
}

/**
 * Stop health monitoring for a connection
 */
function stopHealthMonitoring(connectionId: number) {
  const interval = healthMonitoringIntervals.get(connectionId);
  if (interval) {
    clearTimeout(interval);
    healthMonitoringIntervals.delete(connectionId);
  }


  const recoveryTimeout = recoveryTimeouts.get(connectionId);
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
    recoveryTimeouts.delete(connectionId);
  }
}

/**
 * Validate token health by making a test API call
 */
async function validateTokenHealth(connectionId: number): Promise<boolean> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      return false;
    }

    const connectionData = connection.connectionData as TikTokConnectionData;
    const accessToken = connectionData.accessToken;

    if (!accessToken) {
      return false;
    }


    await getUserInfo(accessToken);

    updateConnectionActivity(connectionId, true);
    logger.debug('tiktok', `Token validation successful for connection ${connectionId}`);
    return true;
  } catch (error: any) {
    logger.warn('tiktok', `Token validation failed for connection ${connectionId}:`, error.message);


    if (error.response?.status === 401 || error.response?.status === 403) {
      await handleTokenExpiration(connectionId);
    } else {
      updateConnectionActivity(connectionId, false, error.message);
    }

    return false;
  }
}

/**
 * Handle token expiration by updating connection status and notifying
 */
async function handleTokenExpiration(connectionId: number): Promise<void> {
  try {
    const connection = await storage.updateChannelConnectionStatus(connectionId, 'error');

    const state = getConnectionState(connectionId);
    state.lastError = 'Access token expired or invalid';
    state.isActive = false;


    emitTikTokEvent('connectionError', {
      connectionId,
      error: 'Access token expired or invalid',
      requiresReauth: true
    });


    if (connection) {
      broadcastTikTokEvent('connectionError', {
        connectionId,
        status: 'error',
        error: 'Access token expired or invalid',
        requiresReauth: true,
        connection: connection
      }, {
        companyId: connection.companyId,
        priority: 'high'
      });
    }

    logger.error('tiktok', `Access token expired for connection ${connectionId}`);
  } catch (error) {
    logger.error('tiktok', `Error handling token expiration for connection ${connectionId}:`, error);
  }
}

/**
 * Initiate connection recovery process
 */
async function initiateConnectionRecovery(connectionId: number): Promise<void> {
  const state = getConnectionState(connectionId);

  if (state.isRecovering) {
    return; // Already recovering
  }

  if (state.recoveryAttempts >= ACTIVITY_THRESHOLDS.MAX_RECOVERY_ATTEMPTS) {
    logger.error('tiktok', `Max recovery attempts reached for connection ${connectionId}`);
    await storage.updateChannelConnectionStatus(connectionId, 'error');
    return;
  }

  state.isRecovering = true;
  state.recoveryAttempts++;
  state.lastRecoveryAttempt = new Date();

  logger.info('tiktok', `Initiating recovery for connection ${connectionId} (attempt ${state.recoveryAttempts})`);


  const backoffDelay = ACTIVITY_THRESHOLDS.RECOVERY_BACKOFF_BASE * Math.pow(2, state.recoveryAttempts - 1);

  const recoveryTimeout = setTimeout(async () => {
    try {

      await ensureValidToken(connectionId);


      const isValid = await validateTokenHealth(connectionId);

      if (isValid) {
        logger.info('tiktok', `Connection ${connectionId} recovered successfully`);
        updateConnectionActivity(connectionId, true);
      } else {
        logger.warn('tiktok', `Connection ${connectionId} recovery failed, will retry`);
        updateConnectionActivity(connectionId, false, 'Recovery validation failed');
      }
    } catch (error) {
      logger.error('tiktok', `Connection ${connectionId} recovery error:`, error);
      updateConnectionActivity(connectionId, false, error instanceof Error ? error.message : 'Recovery failed');
    }
  }, backoffDelay);

  recoveryTimeouts.set(connectionId, recoveryTimeout);
}





/**
 * Send a text message via TikTok Business Messaging API
 */
async function sendMessage(
  connectionId: number,
  recipientId: string,
  messageContent: string,
  messageType: 'text' | 'image' | 'video' = 'text'
): Promise<TikTokSendMessageResponse> {
  try {
    const accessToken = await ensureValidToken(connectionId);
    const platformConfig = await getPlatformConfig();


    const messageRequest: TikTokSendMessageRequest = {
      recipient: {
        id: recipientId
      },
      message: messageType === 'text' ? {
        text: messageContent
      } : {
        attachment: {
          type: messageType,
          payload: {
            url: messageContent // For media, messageContent should be URL
          }
        }
      }
    };



    const response = await axios.post(
      `${platformConfig.apiBaseUrl}/${TIKTOK_API_VERSION}/messages`,
      messageRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    updateConnectionActivity(connectionId, true);
    logger.info('tiktok', `Message sent successfully via connection ${connectionId}`);

    return response.data;
  } catch (error) {
    logger.error('tiktok', `Error sending message via connection ${connectionId}:`, error);
    updateConnectionActivity(connectionId, false, error instanceof Error ? error.message : 'Send message failed');
    throw handleTikTokError(error);
  }
}

/**
 * Send a message and save to database
 */
async function sendAndSaveMessage(
  connectionId: number,
  conversationId: number,
  recipientId: string,
  messageContent: string,
  messageType: 'text' | 'image' | 'video' = 'text'
): Promise<any> {
  try {

    const sendResponse = await sendMessage(connectionId, recipientId, messageContent, messageType);


    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }


    const messageData: InsertMessage = {
      conversationId: conversationId,
      direction: 'outbound',
      senderId: null, // Outgoing message from system
      senderType: 'agent',
      content: messageContent,
      type: messageType,
      status: 'sent',
      externalId: sendResponse.message_id || `tiktok_${Date.now()}`,
      metadata: {
        platform: 'tiktok',
        recipientId: recipientId,
        sendResponse: sendResponse
      },
      createdAt: new Date()
    };

    const savedMessage = await storage.createMessage(messageData);


    trackMessageStatus(
      savedMessage.id,
      savedMessage.externalId || '',
      conversationId,
      'sent'
    );


    await addMentionsToMessage(
      savedMessage.id,
      messageContent,
      savedMessage.senderId || 0,
      conversationId,
      connection.companyId || 0
    );


    emitTikTokEvent('messageSent', {
      connectionId,
      conversationId,
      message: savedMessage
    });


    broadcastTikTokEvent('newMessage', savedMessage, {
      companyId: connection.companyId,
      conversationId: conversationId,
      priority: 'high'
    });


    broadcastTikTokEvent('conversationUpdated', conversation, {
      companyId: connection.companyId,
      conversationId: conversationId,
      priority: 'normal'
    });


    broadcastTikTokEvent('messageStatusUpdate', {
      messageId: savedMessage.id,
      conversationId: conversationId,
      status: 'sent',
      sentAt: new Date()
    }, {
      companyId: connection.companyId,
      conversationId: conversationId,
      priority: 'normal'
    });

    logger.info('tiktok', `Message saved to database: ${savedMessage.id}`);
    return savedMessage;
  } catch (error) {
    logger.error('tiktok', `Error in sendAndSaveMessage:`, error);
    throw error;
  }
}





/**
 * Process incoming webhook event from TikTok
 */
async function processWebhookEvent(payload: any): Promise<void> {
  try {
    logger.debug('tiktok', 'Processing webhook event:', JSON.stringify(payload, null, 2));

    const eventType = payload.event_type || payload.type;

    switch (eventType) {
      case 'message':
      case 'message.received':
        await handleIncomingMessage(payload);
        break;

      case 'message.delivered':
        await handleMessageDelivered(payload);
        break;

      case 'message.read':
        await handleMessageRead(payload);
        break;

      case 'message.failed':
        await handleMessageFailed(payload);
        break;

      default:
        logger.warn('tiktok', `Unknown webhook event type: ${eventType}`);
    }
  } catch (error) {
    logger.error('tiktok', 'Error processing webhook event:', error);
    throw error;
  }
}

/**
 * Handle incoming message from TikTok user
 */
async function handleIncomingMessage(payload: any): Promise<void> {
  try {
    const message = payload.message;
    const sender = payload.sender || message.from;
    const recipient = payload.recipient || message.to;


    const connections = await storage.getChannelConnectionsByType('tiktok');
    const connection = connections.find(conn => {
      const data = conn.connectionData as any;
      return data?.openId === recipient.id || data?.unionId === recipient.id;
    });

    if (!connection) {
      logger.warn('tiktok', `No connection found for recipient ${recipient.id}`);
      return;
    }


    let contact = await storage.getContactByIdentifier(sender.id, 'tiktok');
    if (!contact) {
      const contactData: InsertContact = {
        companyId: connection.companyId,
        name: sender.name || sender.display_name || 'TikTok User',
        identifier: sender.id,
        identifierType: 'tiktok',
        source: 'tiktok',
        avatarUrl: sender.avatar_url
      };
      contact = await storage.getOrCreateContact(contactData);
      logger.info('tiktok', `Created new contact: ${contact.id} for TikTok user ${sender.id}`);
    }


    let conversation = await storage.getConversationByContactAndChannel(
      contact.id,
      connection.id
    );

    if (!conversation) {
      const conversationData: InsertConversation = {
        companyId: connection.companyId,
        contactId: contact.id,
        channelType: 'tiktok',
        channelId: connection.id,
        status: 'open',
        lastMessageAt: new Date()
      };
      conversation = await storage.createConversation(conversationData);
      logger.info('tiktok', `Created new conversation: ${conversation.id}`);
    }


    const messageContent = message.text || message.content || '';
    const messageType = message.type || 'text';

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      direction: 'inbound',
      senderId: contact.id,
      senderType: 'contact',
      content: messageContent,
      type: messageType,
      status: 'received',
      externalId: message.id || message.message_id,
      metadata: {
        platform: 'tiktok',
        senderId: sender.id,
        timestamp: message.timestamp || Date.now(),
        rawMessage: message
      },
      createdAt: new Date()
    };

    const savedMessage = await storage.createMessage(messageData);


    const updatedConversation = await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date()
    });


    updateConnectionActivity(connection.id, true);


    emitTikTokEvent('messageReceived', {
      connectionId: connection.id,
      conversationId: conversation.id,
      contactId: contact.id,
      message: savedMessage,
      conversation: updatedConversation,
      contact: contact
    });


    broadcastTikTokEvent('newMessage', savedMessage, {
      companyId: connection.companyId,
      conversationId: conversation.id,
      priority: 'high'
    });


    if (updatedConversation) {
      broadcastTikTokEvent('conversationUpdated', updatedConversation, {
        companyId: connection.companyId,
        conversationId: conversation.id,
        priority: 'normal'
      });
    }


    try {
      const unreadCount = await storage.getUnreadCount(conversation.id);
      broadcastTikTokEvent('unreadCountUpdated', {
        conversationId: conversation.id,
        unreadCount
      }, {
        companyId: connection.companyId,
        conversationId: conversation.id,
        priority: 'normal'
      });
    } catch (error) {
      logger.error('tiktok', 'Error broadcasting unread count update:', error);
    }

    logger.info('tiktok', `Processed incoming message: ${savedMessage.id} from ${sender.id}`);
  } catch (error) {
    logger.error('tiktok', 'Error handling incoming message:', error);
    throw error;
  }
}

/**
 * Handle message delivered status update
 */
async function handleMessageDelivered(payload: any): Promise<void> {
  try {
    const messageId = payload.message_id || payload.message?.id;

    if (!messageId) {
      logger.warn('tiktok', 'Message delivered event missing message_id');
      return;
    }


    const message = await storage.getMessageByExternalId(messageId);
    if (message) {
      await storage.updateMessage(message.id, { status: 'delivered' });


      trackMessageStatus(
        message.id,
        messageId,
        message.conversationId,
        'delivered'
      );


      emitTikTokEvent('messageStatusUpdate', {
        messageId: message.id,
        status: 'delivered'
      });


      const conversation = await storage.getConversation(message.conversationId);
      if (conversation) {
        const tracking = getMessageStatusTracking(message.id);
        broadcastTikTokEvent('messageStatusUpdate', {
          messageId: message.id,
          conversationId: message.conversationId,
          status: 'delivered',
          deliveredAt: tracking?.deliveredAt || new Date()
        }, {
          companyId: conversation.companyId,
          conversationId: message.conversationId,
          priority: 'normal'
        });
      }

      logger.debug('tiktok', `Message ${messageId} marked as delivered`);
    }
  } catch (error) {
    logger.error('tiktok', 'Error handling message delivered:', error);
  }
}

/**
 * Handle message read status update
 */
async function handleMessageRead(payload: any): Promise<void> {
  try {
    const messageId = payload.message_id || payload.message?.id;

    if (!messageId) {
      logger.warn('tiktok', 'Message read event missing message_id');
      return;
    }


    const message = await storage.getMessageByExternalId(messageId);
    if (message) {
      await storage.updateMessage(message.id, { status: 'read' });


      trackMessageStatus(
        message.id,
        messageId,
        message.conversationId,
        'read'
      );


      emitTikTokEvent('messageStatusUpdate', {
        messageId: message.id,
        status: 'read'
      });


      const conversation = await storage.getConversation(message.conversationId);
      if (conversation) {
        const tracking = getMessageStatusTracking(message.id);
        broadcastTikTokEvent('messageStatusUpdate', {
          messageId: message.id,
          conversationId: message.conversationId,
          status: 'read',
          readAt: tracking?.readAt || new Date(),
          readBy: tracking?.readBy || []
        }, {
          companyId: conversation.companyId,
          conversationId: message.conversationId,
          priority: 'normal'
        });
      }

      logger.debug('tiktok', `Message ${messageId} marked as read`);
    }
  } catch (error) {
    logger.error('tiktok', 'Error handling message read:', error);
  }
}

/**
 * Handle message failed status update
 */
async function handleMessageFailed(payload: any): Promise<void> {
  try {
    const messageId = payload.message_id || payload.message?.id;
    const error = payload.error || 'Unknown error';

    if (!messageId) {
      logger.warn('tiktok', 'Message failed event missing message_id');
      return;
    }


    const message = await storage.getMessageByExternalId(messageId);
    if (message) {
      await storage.updateMessage(message.id, {
        status: 'failed',
        metadata: {
          ...(message.metadata as any),
          error: error
        }
      });


      trackMessageStatus(
        message.id,
        messageId,
        message.conversationId,
        'failed',
        error
      );


      emitTikTokEvent('messageStatusUpdate', {
        messageId: message.id,
        status: 'failed',
        error: error
      });


      const conversation = await storage.getConversation(message.conversationId);
      if (conversation) {
        const tracking = getMessageStatusTracking(message.id);
        broadcastTikTokEvent('messageStatusUpdate', {
          messageId: message.id,
          conversationId: message.conversationId,
          status: 'failed',
          error: error,
          failedAt: tracking?.failedAt || new Date()
        }, {
          companyId: conversation.companyId,
          conversationId: message.conversationId,
          priority: 'high'
        });
      }

      logger.error('tiktok', `Message ${messageId} failed: ${error}`);
    }
  } catch (error) {
    logger.error('tiktok', 'Error handling message failed:', error);
  }
}





/**
 * Verify TikTok webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  try {

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('tiktok', 'Error verifying webhook signature:', error);
    return false;
  }
}





/**
 * Handle TikTok API errors and convert to standardized format
 */
function handleTikTokError(error: any): TikTokAPIError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as any;

    const tikTokError: TikTokAPIError = {
      error: {
        code: responseData?.error?.code || 'UNKNOWN_ERROR',
        message: responseData?.error?.message || axiosError.message || 'Unknown error occurred',
        log_id: responseData?.error?.log_id
      }
    };

    return tikTokError;
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  };
}

/**
 * Check if error is retryable
 */
function isRetryableError(statusCode: number): boolean {

  return statusCode === 429 || statusCode >= 500;
}





/**
 * Initialize a TikTok connection
 */
async function initializeConnection(connectionId: number): Promise<void> {
  try {
    logger.info('tiktok', `Initializing connection ${connectionId}`);

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }


    activeConnections.set(connectionId, true);


    const connectionData = connection.connectionData as TikTokConnectionData;
    const userInfo = await getUserInfo(connectionData.accessToken);

    const state = getConnectionState(connectionId);
    state.userInfo = userInfo;
    state.isActive = true;


    startHealthMonitoring(connectionId);


    await storage.updateChannelConnectionStatus(connectionId, 'active');

    logger.info('tiktok', `Connection ${connectionId} initialized successfully`);
  } catch (error) {
    logger.error('tiktok', `Error initializing connection ${connectionId}:`, error);
    throw error;
  }
}

/**
 * Disconnect a TikTok connection
 */
async function disconnectConnection(connectionId: number): Promise<void> {
  try {
    logger.info('tiktok', `Disconnecting connection ${connectionId}`);


    stopHealthMonitoring(connectionId);


    activeConnections.delete(connectionId);
    connectionStates.delete(connectionId);


    await storage.updateChannelConnectionStatus(connectionId, 'disconnected');

    logger.info('tiktok', `Connection ${connectionId} disconnected successfully`);
  } catch (error) {
    logger.error('tiktok', `Error disconnecting connection ${connectionId}:`, error);
    throw error;
  }
}

/**
 * Get connection status
 */
function getConnectionStatus(connectionId: number): ConnectionState | null {
  return connectionStates.get(connectionId) || null;
}

/**
 * Initialize all active TikTok connections on server startup
 */
async function initializeAllConnections(): Promise<void> {
  try {
    logger.info('tiktok', 'Initializing all active TikTok connections...');

    const connections = await storage.getChannelConnectionsByType('tiktok');

    let initializedCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      if (connection.status === 'active' || connection.status === 'connected') {
        try {
          await initializeConnection(connection.id);
          initializedCount++;
          logger.info('tiktok', `Initialized connection ${connection.id} (${connection.accountName})`);
        } catch (error) {
          errorCount++;
          logger.error('tiktok', `Failed to initialize connection ${connection.id}:`, error);
        }
      }
    }

    logger.info('tiktok', `TikTok initialization complete: ${initializedCount} connections initialized, ${errorCount} errors`);
  } catch (error) {
    logger.error('tiktok', 'Error initializing TikTok connections:', error);
    throw error;
  }
}





/**
 * Subscribe to TikTok events
 */
export function subscribeToTikTokEvents(
  eventType: 'connectionStatusUpdate',
  callback: (data: { connectionId: number; status: string }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'connectionError',
  callback: (data: { connectionId: number; error: string; requiresReauth?: boolean }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'messageReceived',
  callback: (data: { connectionId: number; conversationId: number; contactId: number; message: any; conversation?: any; contact?: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'messageSent',
  callback: (data: { connectionId: number; conversationId: number; message: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'messageStatusUpdate',
  callback: (data: { messageId: number; status: string; error?: string }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'userTyping',
  callback: (data: { conversationId: number; userId: number; isTyping: boolean }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'userPresence',
  callback: (data: { userId: number; conversationId: number; status: 'online' | 'offline' | 'away'; lastSeen: Date }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'messageRead',
  callback: (data: { messageId: number; userId: number; conversationId: number; readAt: Date }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'conversationRead',
  callback: (data: { conversationId: number; userId: number; messageCount: number; readAt: Date }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'reactionAdded',
  callback: (data: { messageId: number; userId: number; emoji: string; reaction: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'reactionRemoved',
  callback: (data: { messageId: number; userId: number; emoji: string }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'messageReaction',
  callback: (data: { messageId: number; conversationId: number; userId: number; emoji: string; action: 'add' | 'remove'; reaction?: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'userMentioned',
  callback: (data: { messageId: number; conversationId: number; mentionedUserId: number; mentionedByUserId: number; mention: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: 'mention',
  callback: (data: { messageId: number; conversationId: number; mentionedUserId: number; mentionedByUserId: number; messageContent: string; mention: any }) => void
): () => void;
export function subscribeToTikTokEvents(
  eventType: string,
  callback: (data: any) => void
): () => void {
  return eventEmitterPool.subscribe(TIKTOK_NAMESPACE, eventType, callback);
}





export const TikTokService = {

  getPlatformConfig,


  exchangeCodeForToken,
  refreshAccessToken,
  ensureValidToken,


  getUserInfo,


  initializeConnection,
  initializeAllConnections,
  disconnectConnection,
  getConnectionStatus,
  startHealthMonitoring,
  stopHealthMonitoring,


  sendMessage,
  sendAndSaveMessage,


  processWebhookEvent,
  verifyWebhookSignature,


  startTypingIndicator,
  stopTypingIndicator,
  getTypingUsers,
  updatePresenceStatus,
  getUserPresence,
  simulateTyping,


  markMessageAsRead,
  markConversationAsRead,
  getMessageReadReceipts,
  getMessageDeliveryStatus,
  getMessageStatusTracking,
  sendReadReceipt,


  addReaction,
  removeReaction,
  getMessageReactions,
  getReactionSummary,
  hasUserReacted,
  AVAILABLE_REACTIONS,


  parseMentions,
  addMentionsToMessage,
  getMessageMentions,
  getUnreadMentions,
  markMentionAsRead,
  clearUserMentions,
  formatMessageWithMentions,


  eventEmitter,


  subscribeToEvents: subscribeToTikTokEvents,


  handleTikTokError
};

export default TikTokService;

