import { storage } from '../../storage';
import {
  InsertMessage,
  InsertConversation,
  InsertContact,
  ChannelConnection
} from '@shared/schema';
import { EventEmitter } from 'events';
import axios from 'axios';
import {
  parseDialog360Error,
  createErrorResponse,
  logDialog360Error,
  Dialog360ErrorCode
} from './360dialog-errors';
import path from 'path';
import fsExtra from 'fs-extra';

const activeConnections = new Map<number, boolean>();
const eventEmitter = new EventEmitter();

eventEmitter.setMaxListeners(50);

const DIALOG_360_API_BASE = 'https://waba-v2.360dialog.io';

interface Dialog360Config {
  apiKey: string;
  phoneNumber: string;
  webhookUrl?: string;
}

interface Dialog360WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          image?: any;
          video?: any;
          audio?: any;
          document?: any;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
        errors?: Array<{
          code: number;
          title: string;
          message: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Get 360Dialog configuration from connection data
 */
function get360DialogConfig(connection: ChannelConnection): Dialog360Config {
  const connectionData = connection.connectionData as any;
  
  if (!connectionData?.apiKey || !connectionData?.phoneNumber) {
    throw new Error('Missing required 360Dialog configuration');
  }

  return {
    apiKey: connectionData.apiKey,
    phoneNumber: connectionData.phoneNumber,
    webhookUrl: connectionData.webhookUrl
  };
}

/**
 * Create 360Dialog API headers with authentication
 */
function create360DialogHeaders(config: Dialog360Config): Record<string, string> {
  return {
    'D360-API-KEY': config.apiKey,
    'Content-Type': 'application/json'
  };
}

/**
 * Connect to 360Dialog WhatsApp API
 */
export async function connectTo360DialogWhatsApp(connectionId: number): Promise<boolean> {
  let connection: ChannelConnection | undefined;

  try {


    connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    const config = get360DialogConfig(connection);
    
    const response = await axios.get(
      `${DIALOG_360_API_BASE}/v1/configs/webhook`,
      { headers: create360DialogHeaders(config) }
    );

    if (response.status === 200) {
      activeConnections.set(connectionId, true);
      
      await storage.updateChannelConnection(connectionId, { status: 'active' });
      
      
      
      eventEmitter.emit('connected', { connectionId });
      
      return true;
    } else {
      throw new Error(`Failed to connect to 360Dialog: ${response.statusText}`);
    }
  } catch (error: any) {
    const dialog360Error = parseDialog360Error(error);
    logDialog360Error('connection', dialog360Error, connectionId);

    await storage.updateChannelConnection(connectionId, {
      status: 'error',
      connectionData: {
        ...(connection?.connectionData || {}),
        lastError: dialog360Error.message,
        lastErrorAt: new Date().toISOString(),
        errorCode: dialog360Error.code,
        retryable: dialog360Error.retryable
      }
    });

    activeConnections.set(connectionId, false);
    eventEmitter.emit('error', {
      connectionId,
      error: dialog360Error.userMessage,
      code: dialog360Error.code,
      retryable: dialog360Error.retryable
    });

    return false;
  }
}

/**
 * Disconnect from 360Dialog WhatsApp
 */
export async function disconnectFrom360DialogWhatsApp(connectionId: number): Promise<boolean> {
  try {
    
    
    activeConnections.delete(connectionId);
    
    await storage.updateChannelConnection(connectionId, { status: 'inactive' });
    
    eventEmitter.emit('disconnected', { connectionId });
    
    return true;
  } catch (error: any) {
    console.error(`Error disconnecting 360Dialog WhatsApp connection ${connectionId}:`, error);
    return false;
  }
}

/**
 * Check if 360Dialog WhatsApp connection is active
 */
export function is360DialogConnectionActive(connectionId: number): boolean {
  return activeConnections.get(connectionId) === true;
}

/**
 * Get all active 360Dialog WhatsApp connections
 */
export function getActive360DialogConnections(): number[] {
  return Array.from(activeConnections.entries())
    .filter(([_, isActive]) => isActive)
    .map(([connectionId, _]) => connectionId);
}

/**
 * Subscribe to 360Dialog WhatsApp events
 */
export function subscribeTo360DialogWhatsAppEvents(callback: (event: any) => void) {
  eventEmitter.on('message', callback);
  eventEmitter.on('connected', callback);
  eventEmitter.on('disconnected', callback);
  eventEmitter.on('error', callback);
}

/**
 * Format phone number for 360Dialog WhatsApp
 */
function formatWhatsAppNumber(phoneNumber: string): string {
  let cleanNumber = phoneNumber.replace(/^whatsapp:/, '').replace(/^\+/, '');
  
  cleanNumber = cleanNumber.replace(/[^\d]/g, '');
  
  return cleanNumber;
}

/**
 * Send a text message via 360Dialog WhatsApp
 */
export async function send360DialogWhatsAppMessage(
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

    if (!connection.companyId) {
      throw new Error(`Connection ${connectionId} has no associated company`);
    }


    const config = get360DialogConfig(connection);
    const formattedTo = formatWhatsAppNumber(to);
    
    

    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "text",
      text: {
        body: message
      }
    };

    const messageResponse = await axios.post(
      `${DIALOG_360_API_BASE}/messages`,
      messagePayload,
      { headers: create360DialogHeaders(config) }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');
    
    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.getOrCreateContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_360dialog',
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
      externalId: messageResponse.data.messages[0].id,
      metadata: JSON.stringify({
        dialog360MessageId: messageResponse.data.messages[0].id,
        waId: messageResponse.data.contacts[0].wa_id
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
    const dialog360Error = parseDialog360Error(error);
    logDialog360Error('send_message', dialog360Error, connectionId);


    const structuredError = new Error(dialog360Error.userMessage);
    (structuredError as any).code = dialog360Error.code;
    (structuredError as any).retryable = dialog360Error.retryable;
    (structuredError as any).originalError = error;

    throw structuredError;
  }
}

/**
 * Send media message via 360Dialog WhatsApp
 */
export async function send360DialogWhatsAppMediaMessage(
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

    if (!connection.companyId) {
      throw new Error(`Connection ${connectionId} has no associated company`);
    }

    const config = get360DialogConfig(connection);
    const formattedTo = formatWhatsAppNumber(to);

    

    const messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: mediaType
    };

    messagePayload[mediaType] = {
      link: mediaUrl
    };

    if (caption) {
      messagePayload[mediaType].caption = caption;
    }

    if (mediaType === 'document' && filename) {
      messagePayload[mediaType].filename = filename;
    }

    const messageResponse = await axios.post(
      `${DIALOG_360_API_BASE}/messages`,
      messagePayload,
      { headers: create360DialogHeaders(config) }
    );

    

    const cleanTo = to.replace(/[^\d]/g, '');

    let contact = await storage.getContactByPhone(cleanTo, connection.companyId);
    if (!contact) {
      const contactData: InsertContact = {
        name: cleanTo,
        phone: cleanTo,
        companyId: connection.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.getOrCreateContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: connectionId,
        channelType: 'whatsapp_360dialog',
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
      externalId: messageResponse.data.messages[0].id,
      metadata: JSON.stringify({
        dialog360MessageId: messageResponse.data.messages[0].id,
        waId: messageResponse.data.contacts[0].wa_id,
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
    console.error('Error sending 360Dialog WhatsApp media message:', error);
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
 * Process incoming 360Dialog webhook
 */
export async function process360DialogWebhook(payload: Dialog360WebhookPayload): Promise<void> {
  try {
    

    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            if (change.value.messages) {
              for (const message of change.value.messages) {
                await processIncoming360DialogMessage(message, change.value.metadata, change.value.contacts);
              }
            }
            if (change.value.statuses) {
              for (const status of change.value.statuses) {
                await process360DialogMessageStatusUpdate(status);
              }
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error processing 360Dialog webhook:', error);
    throw error;
  }
}

/**
 * Process incoming message from 360Dialog webhook
 */
async function processIncoming360DialogMessage(
  message: any,
  metadata: any,
  contacts?: any[]
): Promise<void> {
  try {
    

    const phoneNumber = message.from;

    const connections = await storage.getChannelConnectionsByType('whatsapp_360dialog');
    const activeConnection = connections.find(conn => conn.status === 'active');

    if (!activeConnection) {

      return;
    }

    if (!activeConnection.companyId) {
      console.error('Active connection has no associated company');
      return;
    }

    let contact = await storage.getContactByPhone(phoneNumber, activeConnection.companyId);
    if (!contact) {
      const contactName = contacts?.find(c => c.wa_id === phoneNumber)?.profile?.name || phoneNumber;

      const contactData: InsertContact = {
        name: contactName,
        phone: phoneNumber,
        companyId: activeConnection.companyId,
        source: 'whatsapp_360dialog'
      };
      contact = await storage.createContact(contactData);
    }

    let conversation = await storage.getConversationByContactAndChannel(contact.id, activeConnection.id);
    if (!conversation) {
      const conversationData: InsertConversation = {
        contactId: contact.id,
        channelId: activeConnection.id,
        channelType: 'whatsapp_360dialog',
        companyId: activeConnection.companyId,
        status: 'active'
      };
      conversation = await storage.createConversation(conversationData);
    }

    let messageType = message.type || 'text';
    let content = '';
    let mediaUrl = null;

    switch (messageType) {
      case 'text':
        content = message.text?.body || '';
        break;
      case 'image':
        content = message.image?.caption || '[IMAGE]';
        mediaUrl = message.image?.id;
        break;
      case 'video':
        content = message.video?.caption || '[VIDEO]';
        mediaUrl = message.video?.id;
        break;
      case 'audio':
        content = '[AUDIO]';
        mediaUrl = message.audio?.id;
        break;
      case 'document':
        content = message.document?.caption || message.document?.filename || '[DOCUMENT]';
        mediaUrl = message.document?.id;
        break;
      default:
        content = `[${messageType.toUpperCase()}]`;
        break;
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      content: content,
      type: messageType as any,
      direction: 'inbound',
      status: 'delivered',
      mediaUrl: mediaUrl,
      externalId: message.id,
      metadata: JSON.stringify({
        dialog360MessageId: message.id,
        timestamp: message.timestamp,
        from: message.from,
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number
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
    console.error('Error processing incoming 360Dialog message:', error);
    throw error;
  }
}

/**
 * Process message status update from 360Dialog webhook
 */
async function process360DialogMessageStatusUpdate(status: any): Promise<void> {
  try {
    

    const message = await storage.getMessageByExternalId(status.id);
    if (!message) {
      
      return;
    }

    let newStatus = message.status;
    switch (status.status) {
      case 'sent':
        newStatus = 'sent';
        break;
      case 'delivered':
        newStatus = 'delivered';
        break;
      case 'read':
        newStatus = 'read';
        break;
      case 'failed':
        newStatus = 'failed';
        break;
    }

    if (newStatus !== message.status) {
      await storage.updateMessage(message.id, { status: newStatus });

      if ((global as any).broadcastToAllClients) {
        (global as any).broadcastToAllClients({
          type: 'messageStatusUpdate',
          data: { messageId: message.id, status: newStatus }
        });
      }
    }

    
  } catch (error: any) {
    console.error('Error processing 360Dialog message status update:', error);
    throw error;
  }
}

/**
 * Get connection status for 360Dialog WhatsApp
 */
export async function get360DialogConnectionStatus(connectionId: number): Promise<any> {
  try {
    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      return { status: 'error', message: 'Connection not found' };
    }

    const isActive = is360DialogConnectionActive(connectionId);
    const config = get360DialogConfig(connection);

    if (!isActive) {
      return { status: 'disconnected', message: 'Connection is inactive' };
    }

    try {
      const response = await axios.get(
        `${DIALOG_360_API_BASE}/v1/configs/webhook`,
        { headers: create360DialogHeaders(config) }
      );

      if (response.status === 200) {
        return {
          status: 'connected',
          message: 'Connected to 360Dialog WhatsApp',
          phoneNumber: config.phoneNumber,
          webhookUrl: response.data.url || 'Not configured'
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
    console.error('Error getting 360Dialog connection status:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Initialize 360Dialog WhatsApp connection
 */
export async function initialize360DialogConnection(connectionId: number, config: {
  apiKey: string;
  phoneNumber: string;
  webhookUrl?: string;
}): Promise<boolean> {
  try {
    

    const headers = create360DialogHeaders(config);
    const response = await axios.get(
      `${DIALOG_360_API_BASE}/v1/configs/webhook`,
      { headers }
    );

    if (response.status === 200 || response.status === 404) {
      activeConnections.set(connectionId, true);

      if (config.webhookUrl) {
        try {
          await axios.post(
            `${DIALOG_360_API_BASE}/v1/configs/webhook`,
            { url: config.webhookUrl },
            { headers }
          );
          
        } catch (webhookError: any) {
          
        }
      }

      await storage.updateChannelConnection(connectionId, {
        status: 'active',
        connectionData: {
          ...config,
          lastConnectedAt: new Date().toISOString()
        }
      });

      
      return true;
    } else {
      throw new Error(`Failed to initialize connection: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error initializing 360Dialog WhatsApp connection ${connectionId}:`, error);

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
  connect: connectTo360DialogWhatsApp,
  disconnect: disconnectFrom360DialogWhatsApp,
  sendMessage: send360DialogWhatsAppMessage,
  sendMedia: send360DialogWhatsAppMediaMessage,
  isActive: is360DialogConnectionActive,
  getActiveConnections: getActive360DialogConnections,
  subscribeToEvents: subscribeTo360DialogWhatsAppEvents,
  processWebhook: process360DialogWebhook,
  getConnectionStatus: get360DialogConnectionStatus,
  initializeConnection: initialize360DialogConnection
};
