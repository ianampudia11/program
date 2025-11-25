import { storage } from '../../storage';
import {
  InsertMessage,
  InsertConversation,
  InsertContact,
  ChannelConnection
} from '@shared/schema';
import { EventEmitter } from 'events';
import axios from 'axios';
import path from 'path';
import fsExtra from 'fs-extra';
import crypto from 'crypto';

const activeConnections = new Map<number, boolean>();
const eventEmitter = new EventEmitter();

eventEmitter.setMaxListeners(50);

const TWILIO_API_BASE = 'https://conversations.twilio.com/v1';
const TWILIO_MEDIA_BASE = 'https://mcs.us1.twilio.com/v1';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  conversationServiceSid: string;
  whatsappNumber: string;
}

interface TwilioWebhookPayload {
  EventType: string;
  ConversationSid: string;
  ParticipantSid?: string;
  MessageSid?: string;
  Author?: string;
  Body?: string;
  Media?: any;
  DateCreated?: string;
  Source?: string;
  Index?: number;
}

/**
 * Get Twilio configuration from connection data
 */
function getTwilioConfig(connection: ChannelConnection): TwilioConfig {
  const connectionData = connection.connectionData as any;
  
  if (!connectionData?.accountSid || !connectionData?.authToken || !connectionData?.conversationServiceSid) {
    throw new Error('Missing required Twilio configuration');
  }

  return {
    accountSid: connectionData.accountSid,
    authToken: connectionData.authToken,
    conversationServiceSid: connectionData.conversationServiceSid,
    whatsappNumber: connectionData.whatsappNumber || 'whatsapp:+14155238886'
  };
}

/**
 * Create Twilio API headers with authentication
 */
function createTwilioHeaders(config: TwilioConfig): Record<string, string> {
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
}

/**
 * Connect to Twilio Conversations API
 */
export async function connectToTwilioWhatsApp(connectionId: number): Promise<boolean> {
  let connection: ChannelConnection | undefined = undefined;

  try {
    connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    const config = getTwilioConfig(connection);
    
    const response = await axios.get(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}`,
      { headers: createTwilioHeaders(config) }
    );

    if (response.status === 200) {
      activeConnections.set(connectionId, true);
      
      await storage.updateChannelConnection(connectionId, { status: 'active' });
      
      
      
      eventEmitter.emit('connected', { connectionId });
      
      return true;
    } else {
      throw new Error(`Failed to connect to Twilio: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error connecting to Twilio WhatsApp for connection ${connectionId}:`, error);
    
    await storage.updateChannelConnection(connectionId, { 
      status: 'error',
      connectionData: {
        ...(connection?.connectionData as any || {}),
        lastError: error.message,
        lastErrorAt: new Date().toISOString()
      }
    });
    
    activeConnections.set(connectionId, false);
    eventEmitter.emit('error', { connectionId, error: error.message });
    
    return false;
  }
}

/**
 * Disconnect from Twilio WhatsApp
 */
export async function disconnectFromTwilioWhatsApp(connectionId: number): Promise<boolean> {
  try {
    
    
    activeConnections.delete(connectionId);
    
    await storage.updateChannelConnection(connectionId, { status: 'inactive' });
    
    eventEmitter.emit('disconnected', { connectionId });
    
    return true;
  } catch (error: any) {
    console.error(`Error disconnecting Twilio WhatsApp connection ${connectionId}:`, error);
    return false;
  }
}

/**
 * Check if Twilio WhatsApp connection is active
 */
export function isTwilioConnectionActive(connectionId: number): boolean {
  return activeConnections.get(connectionId) === true;
}

/**
 * Get all active Twilio WhatsApp connections
 */
export function getActiveTwilioConnections(): number[] {
  return Array.from(activeConnections.entries())
    .filter(([_, isActive]) => isActive)
    .map(([connectionId, _]) => connectionId);
}

/**
 * Subscribe to Twilio WhatsApp events
 */
export function subscribeToTwilioWhatsAppEvents(callback: (event: any) => void) {
  eventEmitter.on('message', callback);
  eventEmitter.on('connected', callback);
  eventEmitter.on('disconnected', callback);
  eventEmitter.on('error', callback);
}

/**
 * Format phone number for Twilio WhatsApp
 */
function formatWhatsAppNumber(phoneNumber: string): string {
  let cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
  
  cleanNumber = cleanNumber.replace(/[^\d]/g, '');
  
  if (!cleanNumber.startsWith('+')) {
    cleanNumber = `+${cleanNumber}`;
  }
  
  return `whatsapp:${cleanNumber}`;
}

/**
 * Send a text message via Twilio WhatsApp
 */
export async function sendTwilioWhatsAppMessage(
  connectionId: number,
  userId: number,
  to: string,
  message: string
): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    const config = getTwilioConfig(connection);
    const formattedTo = formatWhatsAppNumber(to);
    
    

    const conversationResponse = await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations`,
      new URLSearchParams({
        'UniqueName': `whatsapp_${to.replace(/[^\d]/g, '')}_${Date.now()}`
      }),
      { headers: createTwilioHeaders(config) }
    );

    const conversationSid = conversationResponse.data.sid;

    await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations/${conversationSid}/Participants`,
      new URLSearchParams({
        'MessagingBinding.Address': formattedTo,
        'MessagingBinding.ProxyAddress': config.whatsappNumber
      }),
      { headers: createTwilioHeaders(config) }
    );

    const messageResponse = await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations/${conversationSid}/Messages`,
      new URLSearchParams({
        'Body': message,
        'Author': config.whatsappNumber
      }),
      { headers: createTwilioHeaders(config) }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');
    
    if (!connection.companyId) {
      throw new Error('Connection company ID is required');
    }

    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_twilio'
      };
      contact = await storage.createContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_twilio',
        companyId: connection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      senderId: userId,
      content: message,
      type: 'text',
      direction: 'outbound',
      status: 'sent',
      externalId: messageResponse.data.sid,
      metadata: JSON.stringify({
        twilioConversationSid: conversationSid,
        twilioMessageSid: messageResponse.data.sid
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    return savedMessage;
  } catch (error: any) {
    console.error('Error sending Twilio WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send media message via Twilio WhatsApp
 */
export async function sendTwilioWhatsAppMediaMessage(
  connectionId: number,
  userId: number,
  to: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    const config = getTwilioConfig(connection);
    const formattedTo = formatWhatsAppNumber(to);

    

    const conversationResponse = await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations`,
      new URLSearchParams({
        'UniqueName': `whatsapp_${to.replace(/[^\d]/g, '')}_${Date.now()}`
      }),
      { headers: createTwilioHeaders(config) }
    );

    const conversationSid = conversationResponse.data.sid;

    await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations/${conversationSid}/Participants`,
      new URLSearchParams({
        'MessagingBinding.Address': formattedTo,
        'MessagingBinding.ProxyAddress': config.whatsappNumber
      }),
      { headers: createTwilioHeaders(config) }
    );

    const messageParams = new URLSearchParams({
      'Author': config.whatsappNumber
    });

    messageParams.append('MediaUrl', mediaUrl);

    if (caption) {
      messageParams.append('Body', caption);
    }

    const messageResponse = await axios.post(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}/Conversations/${conversationSid}/Messages`,
      messageParams,
      { headers: createTwilioHeaders(config) }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');

    if (!connection.companyId) {
      throw new Error('Connection company ID is required');
    }

    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_twilio'
      };
      contact = await storage.createContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_twilio',
        companyId: connection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      senderId: userId,
      content: caption || `[${mediaType.toUpperCase()}]`,
      type: mediaType,
      direction: 'outbound',
      status: 'sent',
      mediaUrl: mediaUrl,
      externalId: messageResponse.data.sid,
      metadata: JSON.stringify({
        twilioConversationSid: conversationSid,
        twilioMessageSid: messageResponse.data.sid,
        mediaType,
        filename
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    return savedMessage;
  } catch (error: any) {
    console.error('Error sending Twilio WhatsApp media message:', error);
    throw error;
  }
}

/**
 * Process a message through the flow executor (extracted for reuse)
 */
async function processMessageThroughFlowExecutor(
  message: any,
  conversation: any,
  contact: any,
  channelConnection: any
): Promise<void> {
  try {
    const flowExecutorModule = await import('../flow-executor');
    const flowExecutor = flowExecutorModule.default;

    if (contact) {
      await flowExecutor.processIncomingMessage(message, conversation, contact, channelConnection);
    }
  } catch (error) {
    console.error('Error in flow executor:', error);
    throw error;
  }
}

/**
 * Process incoming Twilio webhook
 */
export async function processTwilioWebhook(payload: TwilioWebhookPayload): Promise<void> {
  try {
    

    if (payload.EventType === 'onMessageAdded') {
      await processIncomingMessage(payload);
    } else if (payload.EventType === 'onMessageUpdated') {
      await processMessageStatusUpdate(payload);
    }
  } catch (error: any) {
    console.error('Error processing Twilio webhook:', error);
    throw error;
  }
}

/**
 * Process incoming message from Twilio webhook
 */
async function processIncomingMessage(payload: TwilioWebhookPayload): Promise<void> {
  try {
    if (payload.Author?.startsWith('whatsapp:+')) {
      
      return;
    }

    if (!payload.ConversationSid || !payload.MessageSid || !payload.Author) {
      
      return;
    }

    const phoneNumber = payload.Author.replace('whatsapp:', '').replace('+', '');

    const connections = await storage.getChannelConnectionsByType('whatsapp_twilio');
    const activeConnection = connections.find(conn => conn.status === 'active');

    if (!activeConnection) {
      
      return;
    }

    if (!activeConnection.companyId) {
      throw new Error('Connection company ID is required');
    }

    let contact = await storage.getContactByPhone(phoneNumber, activeConnection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: phoneNumber,
        phone: phoneNumber,
        companyId: activeConnection.companyId,
        source: 'whatsapp_twilio'
      };
      contact = await storage.getOrCreateContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, activeConnection.id);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: activeConnection.id,
        channelType: 'whatsapp_twilio',
        companyId: activeConnection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    let messageType = 'text';
    let content = payload.Body || '';
    let mediaUrl = null;

    if (payload.Media && Object.keys(payload.Media).length > 0) {
      const mediaKeys = Object.keys(payload.Media);
      if (mediaKeys.length > 0) {
        const mediaInfo = payload.Media[mediaKeys[0]];
        mediaUrl = mediaInfo.Url;

        if (mediaInfo.ContentType?.startsWith('image/')) {
          messageType = 'image';
        } else if (mediaInfo.ContentType?.startsWith('video/')) {
          messageType = 'video';
        } else if (mediaInfo.ContentType?.startsWith('audio/')) {
          messageType = 'audio';
        } else {
          messageType = 'document';
        }

        if (!content) {
          content = `[${messageType.toUpperCase()}]`;
        }
      }
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      content: content,
      type: messageType as any,
      direction: 'inbound',
      status: 'delivered',
      mediaUrl: mediaUrl,
      externalId: payload.MessageSid,
      metadata: JSON.stringify({
        twilioConversationSid: payload.ConversationSid,
        twilioMessageSid: payload.MessageSid,
        author: payload.Author,
        dateCreated: payload.DateCreated,
        source: payload.Source,
        index: payload.Index
      })
    };

    const savedMessage = await storage.createMessage(messageData);

    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      status: 'active'
    });

    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      });
    }

    eventEmitter.emit('message', {
      connectionId: activeConnection.id,
      message: savedMessage,
      conversation: conversation,
      contact: contact
    });




    try {
      await processMessageThroughFlowExecutor(savedMessage, conversation, contact, activeConnection);
    } catch (error) {
      console.error('Error processing message through flow executor:', error);
    }


  } catch (error: any) {
    console.error('Error processing incoming Twilio message:', error);
    throw error;
  }
}

/**
 * Process message status update from Twilio webhook
 */
async function processMessageStatusUpdate(payload: TwilioWebhookPayload): Promise<void> {
  try {
    if (!payload.MessageSid) {
      return;
    }

    const message = await storage.getMessageByExternalId(payload.MessageSid);
    if (!message) {
      
      return;
    }


    
  } catch (error: any) {
    console.error('Error processing Twilio message status update:', error);
    throw error;
  }
}

/**
 * Get connection status for Twilio WhatsApp
 */
export async function getTwilioConnectionStatus(connectionId: number): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      return { status: 'error', message: 'Connection not found' };
    }

    const isActive = isTwilioConnectionActive(connectionId);
    const config = getTwilioConfig(connection);

    if (!isActive) {
      return { status: 'disconnected', message: 'Connection is inactive' };
    }

    try {
      const response = await axios.get(
        `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}`,
        { headers: createTwilioHeaders(config) }
      );

      if (response.status === 200) {
        return {
          status: 'connected',
          message: 'Connected to Twilio WhatsApp',
          serviceInfo: {
            friendlyName: response.data.friendly_name,
            sid: response.data.sid,
            whatsappNumber: config.whatsappNumber
          }
        };
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: `Connection test failed: ${error.message}`
      };
    }

    return { status: 'unknown', message: 'Unable to determine connection status' };
  } catch (error: any) {
    console.error('Error getting Twilio connection status:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Initialize Twilio WhatsApp connection
 */
export async function initializeTwilioConnection(connectionId: number, config: {
  accountSid: string;
  authToken: string;
  conversationServiceSid: string;
  whatsappNumber: string;
}): Promise<boolean> {
  try {
    

    const headers = createTwilioHeaders(config);
    const response = await axios.get(
      `${TWILIO_API_BASE}/Services/${config.conversationServiceSid}`,
      { headers }
    );

    if (response.status === 200) {
      activeConnections.set(connectionId, true);

      await storage.updateChannelConnection(connectionId, {
        status: 'active',
        connectionData: {
          ...config,
          lastConnectedAt: new Date().toISOString(),
          serviceInfo: response.data
        }
      });

      
      return true;
    } else {
      throw new Error(`Failed to initialize connection: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error initializing Twilio WhatsApp connection ${connectionId}:`, error);

    await storage.updateChannelConnection(connectionId, {
      status: 'error',
      connectionData: {
        ...config,
        lastError: error.message,
        lastErrorAt: new Date().toISOString()
      }
    });

    return false;
  }
}

export default {
  connect: connectToTwilioWhatsApp,
  disconnect: disconnectFromTwilioWhatsApp,
  sendMessage: sendTwilioWhatsAppMessage,
  sendMedia: sendTwilioWhatsAppMediaMessage,
  isActive: isTwilioConnectionActive,
  getActiveConnections: getActiveTwilioConnections,
  subscribeToEvents: subscribeToTwilioWhatsAppEvents,
  processWebhook: processTwilioWebhook,
  getConnectionStatus: getTwilioConnectionStatus,
  initializeConnection: initializeTwilioConnection
};
