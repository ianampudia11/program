import { storage } from '../../storage';
import {
  InsertMessage,
  InsertConversation,
  InsertContact,
  ChannelConnection} from '@shared/schema';
import { EventEmitter } from 'events';
import axios from 'axios';
import path from 'path';
import fsExtra from 'fs-extra';
import crypto from 'crypto';
import FormData from 'form-data';
const activeConnections = new Map<number, boolean>();

const eventEmitter = new EventEmitter();

eventEmitter.setMaxListeners(50);

const WHATSAPP_API_VERSION = 'v22.0';
const WHATSAPP_GRAPH_URL = 'https://graph.facebook.com';

const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
fsExtra.ensureDirSync(MEDIA_DIR);

const mediaCache = new Map<string, string>();

/**
 * Normalize phone number to +E.164 format
 * @param phone The phone number to normalize
 * @returns Normalized phone number in +E.164 format
 */
function normalizePhoneToE164(phone: string): string {
  if (!phone) return phone;


  let normalized = phone.replace(/[^\d+]/g, '');


  if (normalized.startsWith('+')) {
    return normalized;
  }


  return '+' + normalized;
}

/**
 * Get file extension from media type
 */
function getFileExtensionFromMediaType(mediaType: string): string {
  switch (mediaType) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'audio': return 'mp3';
    case 'document': return 'pdf';
    default: return 'bin';
  }
}

/**
 * Get content type from media type
 */
function getContentTypeFromMediaType(mediaType: string): string {
  switch (mediaType) {
    case 'image': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'audio': return 'audio/mpeg';
    case 'document': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}



/**
 * Get a WhatsApp Business API connection status by ID
 * @param connectionId The ID of the connection
 * @param companyId The company ID for multi-tenant security
 * @returns True if connection is active, false otherwise
 */
export async function getConnectionStatus(connectionId: number, companyId: number): Promise<boolean> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }


    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      return false;
    }

    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    return activeConnections.get(connectionId) === true;
  } catch (error) {
    console.error(`Error getting connection status for ${connectionId}:`, error);
    return false;
  }
}

/**
 * Download media from a WhatsApp Business API message and save it to disk
 * @param mediaId The ID of the media from WhatsApp Business API
 * @param accessToken The access token for the connection
 * @param mediaType The type of media (image, video, audio, document)
 * @returns The URL path to the saved media file or null if failed
 */
export async function downloadAndSaveMedia(
  mediaId: string,
  accessToken: string,
  mediaType: string
): Promise<string | null> {
  try {
    const mediaKey = crypto.createHash('md5').update(mediaId).digest('hex');

    if (mediaCache.has(mediaKey)) {
      const cachedUrl = mediaCache.get(mediaKey);
      if (cachedUrl) {
        

        const filePath = path.join(process.cwd(), 'public', cachedUrl.substring(1));
        if (await fsExtra.pathExists(filePath)) {
          return cachedUrl;
        }

        
      }
      mediaCache.delete(mediaKey);
    }

    let extension = '.bin';

    switch (mediaType) {
      case 'image':
        extension = '.jpg';
        break;
      case 'video':
        extension = '.mp4';
        break;
      case 'audio':
        extension = '.mp3';
        break;
      case 'document':
        extension = '.pdf';
        break;
    }

    const mediaTypeDir = path.join(MEDIA_DIR, mediaType);
    await fsExtra.ensureDir(mediaTypeDir);

    const filename = `${mediaKey}${extension}`;
    const filepath = path.join(mediaTypeDir, filename);
    const mediaUrl = `/media/${mediaType}/${filename}`;

    

    if (await fsExtra.pathExists(filepath)) {
      
      mediaCache.set(mediaKey, mediaUrl);
      return mediaUrl;
    }

    const mediaResponse = await axios({
      url: `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${mediaId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    });

    await fsExtra.writeFile(filepath, mediaResponse.data);
    

    mediaCache.set(mediaKey, mediaUrl);

    return mediaUrl;
  } catch (error) {
    console.error('Error downloading media:', error);
    return null;
  }
}

/**
 * Verifies a WhatsApp Business API webhook signature
 * @param signature The X-Hub-Signature header value
 * @param body The raw request body (Buffer, string, or object)
 * @param appSecret The app secret for the WhatsApp Business application
 * @returns True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(signature: string, body: Buffer | string | any, appSecret: string): boolean {
  try {
    if (!signature || !appSecret) {

      return false;
    }

    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2) {

      return false;
    }

    const algorithm = signatureParts[0];
    const receivedHash = signatureParts[1];


    let bodyBuffer: Buffer;
    if (Buffer.isBuffer(body)) {
      bodyBuffer = body;
    } else if (typeof body === 'string') {
      bodyBuffer = Buffer.from(body, 'utf8');
    } else if (typeof body === 'object') {

      bodyBuffer = Buffer.from(JSON.stringify(body), 'utf8');
    } else {
      console.error('Unsupported body type for signature verification:', typeof body);
      return false;
    }

    
    const hmac = crypto.createHmac(algorithm, appSecret);
    hmac.update(bodyBuffer);
    const expectedHash = hmac.digest('hex');


    if (expectedHash === receivedHash) {

    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(receivedHash, 'hex')
    );

    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Connects to WhatsApp Business API by verifying access token
 * @param connectionId The ID of the channel connection
 * @param userId The user ID who owns this connection
 * @param companyId The company ID for multi-tenant security
 */
export async function connectToWhatsAppBusiness(connectionId: number, userId: number, companyId: number): Promise<void> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (!connection.companyId) {
      console.warn(`Connection ${connectionId} missing companyId - this may be a legacy connection. Consider updating the database.`);
    } else if (connection.companyId !== companyId) {
      console.error(`Company ID mismatch: Connection ${connectionId} belongs to company ${connection.companyId}, but user is from company ${companyId}`);
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    if (activeConnections.has(connectionId)) {
      return;
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connection.accessToken || connectionData?.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }

    try {

      const response = await axios.get(
        `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/whatsapp_business_profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.status === 200 && response.data) {
        await storage.updateChannelConnectionStatus(connectionId, 'active');

        activeConnections.set(connectionId, true);

        eventEmitter.emit('connectionStatusUpdate', {
          connectionId,
          status: 'connected'
        });

        
      } else {
        throw new Error('Failed to verify WhatsApp Business API connection');
      }
    } catch (error: any) {
      console.error('Error verifying WhatsApp Business API connection:', error.response?.data || error.message);

      await storage.updateChannelConnectionStatus(connectionId, 'error');

      eventEmitter.emit('connectionError', {
        connectionId,
        error: error.response?.data?.error?.message || error.message
      });

      throw error;
    }
  } catch (error: any) {
    console.error('Error connecting to WhatsApp Business API:', error);
    throw error;
  }
}

/**
 * Disconnects from WhatsApp Business API
 * @param connectionId The ID of the channel connection
 * @param userId The user ID who owns this connection
 * @param companyId The company ID for multi-tenant security
 */
export async function disconnectFromWhatsAppBusiness(connectionId: number, userId: number, companyId: number): Promise<boolean> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (!connection.companyId) {
      console.warn(`Connection ${connectionId} missing companyId - this may be a legacy connection. Consider updating the database.`);
    } else if (connection.companyId !== companyId) {
      console.error(`Company ID mismatch: Connection ${connectionId} belongs to company ${connection.companyId}, but user is from company ${companyId}`);
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    activeConnections.delete(connectionId);

    await storage.updateChannelConnectionStatus(connectionId, 'inactive');

    eventEmitter.emit('connectionStatusUpdate', {
      connectionId,
      status: 'disconnected'
    });

    return true;
  } catch (error) {
    console.error('Error disconnecting from WhatsApp Business API:', error);
    return false;
  }
}

/**
 * Send a text message via WhatsApp Business API
 * @param connectionId The ID of the channel connection
 * @param userId The user ID who owns this connection
 * @param companyId The company ID for multi-tenant security
 * @param to The recipient phone number (with country code, no spaces or symbols)
 * @param message The message text to send
 */
export async function sendWhatsAppBusinessMessage(
  connectionId: number,
  userId: number,
  companyId: number,
  to: string,
  message: string
): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connection.accessToken || connectionData?.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }


    const normalizedPhone = normalizePhoneToE164(to);


    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data) {
      const messageId = response.data.messages?.[0]?.id;

      return {
        success: true,
        messageId
      };
    } else {
      return {
        success: false,
        error: 'Failed to send message: Unknown error'
      };
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp Business message:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Send a template message for testing WhatsApp Business API connection
 * @param connectionId The ID of the channel connection
 * @param companyId The company ID for multi-tenant security
 * @param to The recipient phone number (with country code, no spaces or symbols)
 * @param templateName The name of the template to send (default: 'hello_world')
 * @param languageCode The language code for the template (default: 'en_US')
 */
export async function sendWhatsAppTestTemplate(
  connectionId: number,
  companyId: number,
  to: string,
  templateName: string = 'hello_world',
  languageCode: 'en_US' | 'en' | 'es' | 'pt_BR' = 'en_US'
): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connection.accessToken || connectionData?.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }


    const normalizedPhone = normalizePhoneToE164(to);


    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data) {
      const messageId = response.data.messages?.[0]?.id;

      return {
        success: true,
        messageId
      };
    } else {
      return {
        success: false,
        error: 'Failed to send template message: Unknown error'
      };
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp template message:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Send a WhatsApp template message with variables (for campaigns)
 * @param connectionId The ID of the channel connection
 * @param userId The user ID sending the message
 * @param companyId The company ID for multi-tenant security
 * @param to The recipient phone number (with country code)
 * @param templateName The name of the approved template
 * @param languageCode The language code for the template (e.g., 'en', 'en_US')
 * @param components Optional template components (header, body, buttons with variables)
 * @param skipBroadcast Whether to skip broadcasting the message to clients (default: false)
 * @returns The message result with messageId
 */
export async function sendTemplateMessage(
  connectionId: number,
  userId: number,
  companyId: number,
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters?: Array<{ type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'; text?: string; [key: string]: any }>;
    sub_type?: string;
    index?: string;
  }>,
  skipBroadcast: boolean = false
): Promise<any> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connection.accessToken || connectionData?.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }


    const normalizedPhone = normalizePhoneToE164(to);

    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };


    if (components && components.length > 0) {
      templatePayload.template.components = components;
    }


    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      templatePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data) {
      const messageId = response.data.messages?.[0]?.id;


      try {

        let contact = await storage.getContactByPhone(normalizedPhone, companyId);
        if (!contact) {
          contact = await storage.getOrCreateContact({
            companyId: companyId,
            name: normalizedPhone,
            phone: normalizedPhone,
            email: null,
            avatarUrl: null,
            identifier: normalizedPhone,
            identifierType: 'whatsapp',
            source: 'whatsapp_official',
            notes: null
          });
        }


        let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
        if (!conversation) {
          conversation = await storage.createConversation({
            companyId: companyId,
            contactId: contact.id,
            channelId: connectionId,
            channelType: 'whatsapp_official',
            status: 'open',
            assignedToUserId: userId,
            lastMessageAt: new Date()
          });
        }


        let templateRecord: any = null;
        try {
          const db = (await import('../../db')).db;
          const { campaignTemplates } = await import('@shared/schema');
          const { eq, and } = await import('drizzle-orm');
          
          const templates = await db.select()
            .from(campaignTemplates)
            .where(and(
              eq(campaignTemplates.whatsappTemplateName, templateName),
              eq(campaignTemplates.companyId, companyId)
            ))
            .limit(1);
          
          templateRecord = templates[0];
        } catch (err) {
          console.error('Error fetching template record:', err);
        }


        let messageContent = templateRecord?.content || '';
        const metadata: any = {
          templateName: templateName,
          templateLanguage: languageCode,
          templateComponents: components || [],
          messageId: messageId
        };


        if (components && components.length > 0) {
          for (const component of components) {
            if (component.type === 'header' && component.parameters) {
              for (const param of component.parameters) {
                if (param.type === 'text' && param.text) {

                  messageContent = messageContent.replace('{{1}}', param.text);
                } else if (param.type === 'image' && param.image) {
                  const imageValue = (param.image as any).link || (param.image as any).id;

                  if (imageValue && /^[0-9]+$/.test(imageValue)) {
                    try {
                      const downloadedUrl = await downloadAndSaveMedia(imageValue, accessToken, 'image');
                      metadata.headerImage = downloadedUrl || imageValue;
                    } catch (err) {
                      console.error('Error downloading header image:', err);
                      metadata.headerImage = imageValue;
                    }
                  } else {
                    metadata.headerImage = imageValue;
                  }
                } else if (param.type === 'video' && param.video) {
                  const videoValue = (param.video as any).link || (param.video as any).id;

                  if (videoValue && /^[0-9]+$/.test(videoValue)) {
                    try {
                      const downloadedUrl = await downloadAndSaveMedia(videoValue, accessToken, 'video');
                      metadata.headerVideo = downloadedUrl || videoValue;
                    } catch (err) {
                      console.error('Error downloading header video:', err);
                      metadata.headerVideo = videoValue;
                    }
                  } else {
                    metadata.headerVideo = videoValue;
                  }
                } else if (param.type === 'document' && param.document) {
                  const documentValue = (param.document as any).link || (param.document as any).id;

                  if (documentValue && /^[0-9]+$/.test(documentValue)) {
                    try {
                      const downloadedUrl = await downloadAndSaveMedia(documentValue, accessToken, 'document');
                      metadata.headerDocument = downloadedUrl || documentValue;
                    } catch (err) {
                      console.error('Error downloading header document:', err);
                      metadata.headerDocument = documentValue;
                    }
                  } else {
                    metadata.headerDocument = documentValue;
                  }
                  metadata.documentFilename = (param.document as any).filename;
                }
              }
            } else if (component.type === 'body' && component.parameters) {

              component.parameters.forEach((param: any, index: number) => {
                if (param.type === 'text' && param.text) {

                  const placeholder = `{{${index + 1}}}`;
                  messageContent = messageContent.replace(new RegExp(placeholder, 'g'), param.text);
                }
              });
            }
          }
        }


        if (!messageContent || messageContent.trim() === '') {
          messageContent = `Template: ${templateName}`;
        }


        const existingMessage = await storage.getMessageByExternalId(messageId, companyId);
        if (existingMessage) {

          return {
            success: true,
            messageId,
            id: messageId
          };
        }


        const messageData = {
          conversationId: conversation.id,
          content: messageContent.trim(),
          type: 'template',
          direction: 'outbound',
          status: 'sent',
          metadata: JSON.stringify(metadata),
          mediaUrl: null,
          externalId: messageId,
          senderId: userId,
          senderType: 'user',
          sentAt: new Date()
        };

        const savedMessage = await storage.createMessage(messageData);


        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
          status: 'active'
        });


        if (!skipBroadcast && (global as any).broadcastToAllClients) {
          (global as any).broadcastToAllClients({
            type: 'newMessage',
            data: savedMessage
          }, companyId);
        }


        eventEmitter.emit('newMessage', {
          message: savedMessage,
          conversation,
          contact
        });

      } catch (dbError) {
        console.error('Error saving template message to database:', dbError);

      }

      return {
        success: true,
        messageId,
        id: messageId
      };
    } else {
      throw new Error('Failed to send template message: Unknown error');
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp template message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to send template message');
  }
}

/**
 * Send a media message via WhatsApp Business API
 * @param connectionId The ID of the channel connection
 * @param userId The user ID who owns this connection
 * @param to The recipient phone number (with country code, no spaces or symbols)
 * @param mediaType The type of media to send (image, video, audio, document)
 * @param mediaUrl The URL of the media to send (must be publicly accessible or a link to file upload)
 * @param caption Optional caption for the media
 * @param filename Optional filename for document media
 * @param originalMimeType Optional original MIME type to preserve for audio files
 * @param isFromBot Whether the message is sent from a bot (default: false)
 * @param skipBroadcast Whether to skip broadcasting the message to clients (default: false)
 */
export async function sendWhatsAppBusinessMediaMessage(
  connectionId: number,
  userId: number,
  companyId: number,
  to: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  mediaUrl: string,
  caption?: string,
  filename?: string,
  originalMimeType?: string,
  isFromBot: boolean = false,
  skipBroadcast: boolean = false
): Promise<any> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const accessToken = connection.accessToken;
    const connectionData = connection.connectionData as any;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }


    const normalizedPhone = normalizePhoneToE164(to);


    let mediaId: string;

    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {


      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'stream',
        timeout: 30000 // 30 second timeout
      });


      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', mediaResponse.data, {
        filename: filename || `media.${getFileExtensionFromMediaType(mediaType)}`,
        contentType: originalMimeType || getContentTypeFromMediaType(mediaType)
      });


      const uploadResponse = await axios.post(
        `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders()
          }
        }
      );

      if (!uploadResponse.data?.id) {
        console.error('Media upload failed:', uploadResponse.data);
        throw new Error(`Failed to upload media to WhatsApp servers: ${uploadResponse.data?.error?.message || 'Unknown error'}`);
      }

      mediaId = uploadResponse.data.id;

    } else {
      throw new Error('Media URL must be a valid HTTP/HTTPS URL');
    }


    const mediaRequest: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: mediaType
    };


    mediaRequest[mediaType] = {
      id: mediaId
    };

    if (caption && ['image', 'video', 'document'].includes(mediaType)) {
      mediaRequest[mediaType].caption = caption;
    }

    if (filename && mediaType === 'document') {
      mediaRequest.document.filename = filename;
    }

    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      mediaRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data) {
      const messageId = response.data.messages?.[0]?.id;


      let contact = await storage.getContactByPhone(normalizedPhone, companyId);
      if (!contact) {
        const contactData: InsertContact = {
          companyId,
          name: normalizedPhone,
          phone: normalizedPhone,
          email: null,
          avatarUrl: null,
          identifier: normalizedPhone,
          identifierType: 'whatsapp',
          source: 'whatsapp_official',
          notes: null
        };
        contact = await storage.getOrCreateContact(contactData);
      }


      let conversation = await storage.getConversationByContactAndChannel(contact.id, connectionId);
      if (!conversation) {
        const conversationData: InsertConversation = {
          companyId,
          contactId: contact.id,
          channelId: connectionId,
          channelType: 'whatsapp_official',
          status: 'open',
          assignedToUserId: userId,
          lastMessageAt: new Date(),
        };
        conversation = await storage.createConversation(conversationData);
      }


      const messageData: InsertMessage = {
        conversationId: conversation.id,
        senderId: isFromBot ? null : userId,
        senderType: isFromBot ? null : 'user',
        content: caption || `[${mediaType.toUpperCase()}]`,
        type: mediaType,
        direction: 'outbound',
        status: 'sent',
        isFromBot: isFromBot,
        mediaUrl: mediaUrl,
        externalId: messageId,
        metadata: JSON.stringify({
          messageId,
          timestamp: Date.now(),
          mediaType,
          filename: filename || undefined
        })
      };

      const savedMessage = await storage.createMessage(messageData);


      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        status: 'active'
      });


      if (!skipBroadcast && (global as any).broadcastToAllClients) {
        (global as any).broadcastToAllClients({
          type: 'newMessage',
          data: savedMessage
        });

        (global as any).broadcastToAllClients({
          type: 'conversationUpdated',
          data: conversation
        });
      }

      
      return savedMessage;
    } else {
      throw new Error('Failed to send media message: Unknown error');
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp Business media message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
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
 * Process a message webhook from WhatsApp Business API
 * @param payload The webhook payload from WhatsApp Business API
 * @param companyId Optional company ID for multi-tenant security
 */
export async function processWebhook(payload: any, companyId?: number): Promise<void> {
  try {
    if (!payload.entry || !payload.entry.length) {
      
      return;
    }

    for (const entry of payload.entry) {
      if (!entry.changes || !entry.changes.length) continue;

      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value || !value.messages || !value.messages.length) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) {
          
          continue;
        }




        const connections = await storage.getChannelConnectionsByType('whatsapp_official');

        const connection = connections.find(conn => {
          const connData = conn.connectionData as any;
          return connData?.phoneNumberId === phoneNumberId;
        });

        if (!connection) {
          console.warn(`No WhatsApp Business API connection found for phone number ID: ${phoneNumberId}`);
          continue;
        }


        if (companyId && connection.companyId !== companyId) {
          console.warn(`Company ID mismatch for connection ${connection.id}: expected ${companyId}, got ${connection.companyId}`);
          continue;
        }

        if (!connection.companyId) {
          console.error(`WhatsApp connection ${connection.id} missing companyId - skipping message processing`);
          continue;
        }

        for (const message of value.messages) {
          await handleIncomingWebhookMessage(message, value.contacts, connection);
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook message:', error);
  }
}

/**
 * Handle an incoming webhook message from WhatsApp Business API
 * @param message The message object from the webhook
 * @param contacts The contacts object from the webhook
 * @param connection The channel connection
 */
async function handleIncomingWebhookMessage(
  message: any,
  contacts: any[],
  connection: ChannelConnection
): Promise<void> {
  try {
    if (!message.from) {

      return;
    }

    const phoneNumber = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp * 1000;


    const normalizedPhone = normalizePhoneToE164(phoneNumber);

    const existingMessage = await storage.getMessageByExternalId(messageId, connection.companyId || undefined);
    if (existingMessage) {

      return;
    }

    let contact = await storage.getContactByPhone(normalizedPhone, connection.companyId!);

    if (!contact) {
      const webhookContact = contacts?.find(c => c.wa_id === phoneNumber);
      const contactName = webhookContact?.profile?.name || normalizedPhone;

      const contactData: InsertContact = {
        companyId: connection.companyId!, // Ensure contact belongs to the connection's company
        name: contactName,
        phone: normalizedPhone,
        email: null,
        avatarUrl: null,
        identifier: normalizedPhone,
        identifierType: 'whatsapp',
        source: 'whatsapp_official',
        notes: null
      };

      contact = await storage.getOrCreateContact(contactData);

    }

    let conversation = await storage.getConversationByContactAndChannel(
      contact.id,
      connection.id
    );

    if (!conversation) {
      const conversationData: InsertConversation = {
        companyId: connection.companyId!, // Ensure conversation belongs to the connection's company
        contactId: contact.id,
        channelId: connection.id,
        channelType: 'whatsapp_official',
        status: 'open',
        assignedToUserId: connection.userId,
        lastMessageAt: new Date(timestamp),
      };

      conversation = await storage.createConversation(conversationData);
      


      if ((global as any).broadcastToAllClients) {
        (global as any).broadcastToAllClients({
          type: 'newConversation',
          data: {
            ...conversation,
            contact
          }
        });
      }
    }

    let messageType = 'text';
    let messageContent = '';
    let mediaUrl = null;
    let mediaType = null;
    const msgMetadata: any = { messageId, timestamp };

    if (message.type === 'text' && message.text) {
      messageType = 'text';
      messageContent = message.text.body || '';
    }
    else if (message.type === 'image' && message.image) {
      messageType = 'image';
      mediaType = 'image';
      messageContent = message.image.caption || '';
      msgMetadata.mediaId = message.image.id;
    }
    else if (message.type === 'video' && message.video) {
      messageType = 'video';
      mediaType = 'video';
      messageContent = message.video.caption || '';
      msgMetadata.mediaId = message.video.id;
    }
    else if (message.type === 'audio' && message.audio) {
      messageType = 'audio';
      mediaType = 'audio';
      messageContent = '';
      msgMetadata.mediaId = message.audio.id;
    }
    else if (message.type === 'document' && message.document) {
      messageType = 'document';
      mediaType = 'document';
      messageContent = message.document.caption || '';
      msgMetadata.mediaId = message.document.id;
      msgMetadata.filename = message.document.filename;
    }
    else if (message.type === 'location' && message.location) {
      messageType = 'location';
      const lat = message.location.latitude;
      const lng = message.location.longitude;
      messageContent = `Location: ${lat},${lng}`;
      if (message.location.name) {
        messageContent += ` - ${message.location.name}`;
      }
    }
    else if (message.type === 'interactive' && message.interactive) {
      messageType = 'interactive';




      if (message.interactive.type === 'button_reply' && message.interactive.button_reply) {
        const buttonReply = message.interactive.button_reply;
        messageContent = buttonReply.title || buttonReply.id || '';


        msgMetadata.messageType = 'interactive';
        msgMetadata.type = 'button';
        msgMetadata.button = {
          payload: buttonReply.id,
          text: buttonReply.title
        };


      }

      else if (message.interactive.type === 'list_reply' && message.interactive.list_reply) {
        const listReply = message.interactive.list_reply;
        messageContent = listReply.title || listReply.id || '';


        msgMetadata.messageType = 'interactive';
        msgMetadata.type = 'list';
        msgMetadata.list = {
          payload: listReply.id,
          text: listReply.title,
          description: listReply.description
        };


      }
      else {
        console.warn('🔘 Unknown interactive type:', message.interactive.type);
        messageContent = `Interactive: ${message.interactive.type}`;
      }
    }
    else if (message.type === 'template' && message.template) {
     
      const existingOutboundMessage = await storage.getMessageByExternalId(messageId, connection.companyId || undefined);
      if (existingOutboundMessage && existingOutboundMessage.direction === 'outbound') {
        return;
      }
      messageType = 'template';


      msgMetadata.templateName = message.template.name;
      msgMetadata.templateLanguage = message.template.language?.code || 'en';


      const components = message.template.components || [];
      let templateContent = '';

      for (const component of components) {
        if (component.type === 'header') {
          if (component.parameters) {
            for (const param of component.parameters) {
              if (param.type === 'text') {
                templateContent += param.text + '\n\n';
              } else if (param.type === 'image' && param.image) {
                msgMetadata.headerImage = param.image.link || param.image.id;
                mediaType = 'image';
              } else if (param.type === 'video' && param.video) {
                msgMetadata.headerVideo = param.video.link || param.video.id;
                mediaType = 'video';
              } else if (param.type === 'document' && param.document) {
                msgMetadata.headerDocument = param.document.link || param.document.id;
                msgMetadata.documentFilename = param.document.filename;
              }
            }
          }
        } else if (component.type === 'body') {
          if (component.parameters) {

            let bodyText = component.text || '';
            component.parameters.forEach((param: any, index: number) => {
              if (param.type === 'text') {
                bodyText = bodyText.replace(`{{${index + 1}}}`, param.text);
              }
            });
            templateContent += bodyText;
          } else if (component.text) {
            templateContent += component.text;
          }
        } else if (component.type === 'footer') {
          if (component.text) {
            templateContent += '\n\n' + component.text;
          }
        } else if (component.type === 'button') {
          msgMetadata.buttons = component.parameters || [];
        }
      }

      messageContent = templateContent || message.text?.body || `Template: ${message.template.name}`;


      msgMetadata.templateComponents = components;
    }
    else {
      messageType = 'unknown';
      messageContent = `Unsupported message type: ${message.type}`;
    }

    const messageData: InsertMessage = {
      conversationId: conversation.id,
      content: messageContent,
      type: messageType,
      direction: 'inbound',
      status: 'delivered',
      metadata: JSON.stringify(msgMetadata),
      mediaUrl: null,
      externalId: messageId // Store WhatsApp message ID for idempotency
    };

    const savedMessage = await storage.createMessage(messageData);


    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(timestamp),
      status: 'active'
    });


    const updatedConversation = await storage.getConversation(conversation.id);

    if (mediaType && msgMetadata.mediaId && connection.accessToken) {
      try {
      } catch (error) {
        console.error(`Error preparing media download for message ${messageId}:`, error);
      }
    }


    if ((global as any).broadcastToAllClients && (global as any).broadcastConversationUpdate && updatedConversation) {

      (global as any).broadcastToAllClients({
        type: 'newMessage',
        data: savedMessage
      }, updatedConversation.companyId);


      (global as any).broadcastConversationUpdate(updatedConversation, 'conversationUpdated');


      try {
        const unreadCount = await storage.getUnreadCount(conversation.id);
        (global as any).broadcastToAllClients({
          type: 'unreadCountUpdated',
          data: {
            conversationId: conversation.id,
            unreadCount
          }
        }, updatedConversation.companyId);
      } catch (error) {
        console.error('Error broadcasting unread count update:', error);
      }
    }


    eventEmitter.emit('newMessage', {
      message: savedMessage,
      conversation: updatedConversation,
      contact
    });




    try {
      await processMessageThroughFlowExecutor(savedMessage, updatedConversation, contact, connection);
    } catch (error) {
      console.error('Error processing message through flow executor:', error);
    }


  } catch (error) {
    console.error('Error handling incoming webhook message:', error);
  }
}

/**
 * Subscribe to WhatsApp Business API events
 * @param eventType The type of event to subscribe to
 * @param callback The callback function to call when the event occurs
 * @returns A function to unsubscribe from the event
 */
export function subscribeToWhatsAppBusinessEvents(
  eventType: 'connectionStatusUpdate' | 'connectionError' | 'newMessage',
  callback: (data: any) => void
): () => void {
  eventEmitter.on(eventType, callback);
  return () => eventEmitter.off(eventType, callback);
}

/**
 * Get all active connection IDs
 * @returns An array of active connection IDs
 */
export function getActiveBusinessConnections(): number[] {
  return Array.from(activeConnections.keys());
}

/**
 * Check if a connection is active
 * @param connectionId The ID of the connection
 * @returns True if connection is active, false otherwise
 */
export function isBusinessConnectionActive(connectionId: number): boolean {
  return activeConnections.has(connectionId) && activeConnections.get(connectionId) === true;
}

/**
 * Set up a webhook subscription for this application with WhatsApp Business API
 * @param connectionId The ID of the channel connection
 * @param userId The user ID who owns this connection
 * @param companyId The company ID for multi-tenant security
 * @param callbackUrl The URL to receive webhooks at
 * @param verifyToken A token to verify the webhook subscription
 */
export async function setupWebhookSubscription(
  connectionId: number,
  userId: number,
  companyId: number,
  callbackUrl: string,
  verifyToken: string
): Promise<boolean> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }



    const accessToken = connection.accessToken;
    const connectionData = connection.connectionData as any;
    const appId = connectionData?.appId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!appId) {
      throw new Error('WhatsApp Business API app ID is missing');
    }

    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${appId}/subscriptions`,
      {
        object: 'whatsapp_business_account',
        callback_url: callbackUrl,
        verify_token: verifyToken,
        fields: [
          'messages',
          'message_deliveries',
          'message_reads',
          'message_templates'
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.status === 200;
  } catch (error: any) {
    console.error('Error setting up webhook subscription:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Initialize a WhatsApp Business API connection with the provided configuration
 * @param connectionId The ID of the channel connection
 * @param companyId The company ID for multi-tenant security
 * @param config Configuration object containing access token, phone number ID, etc.
 */
export async function initializeConnection(connectionId: number, companyId: number, config: {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  webhookVerifyToken: string;
  businessAccountId?: string;
  verifiedName?: string;
}): Promise<boolean> {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }


    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (!connection.companyId) {
      console.warn(`Connection ${connectionId} missing companyId - this may be a legacy connection. Consider updating the database.`);


    } else if (connection.companyId !== companyId) {
      console.error(`Company ID mismatch: Connection ${connectionId} belongs to company ${connection.companyId}, but user is from company ${companyId}`);
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const response = await axios.get(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${config.phoneNumberId}?access_token=${config.accessToken}`
    );

    if (response.status === 200 && response.data) {

      activeConnections.set(connectionId, true);


      await storage.updateChannelConnectionStatus(connectionId, 'active');


      eventEmitter.emit('connectionStatusUpdate', {
        connectionId,
        status: 'connected'
      });

      
      return true;
    } else {
      throw new Error('Failed to verify WhatsApp Business API connection');
    }
  } catch (error: any) {
    console.error(`Failed to initialize WhatsApp Business API connection ${connectionId}:`, error.response?.data || error.message);


    await storage.updateChannelConnectionStatus(connectionId, 'error');


    eventEmitter.emit('connectionError', {
      connectionId,
      error: error.response?.data?.error?.message || error.message
    });

    throw error;
  }
}

/**
 * Find or create a conversation for a contact and channel
 * @param connectionId The channel connection ID
 * @param phoneNumber The contact's phone number
 * @param companyId The company ID for multi-tenant security
 * @returns The conversation object
 */
async function findOrCreateConversation(connectionId: number, phoneNumber: string, companyId: number) {
  if (!companyId) {
    throw new Error('Company ID is required for multi-tenant security');
  }


  const normalizedPhone = normalizePhoneToE164(phoneNumber);

  let contact = await storage.getContactByPhone(normalizedPhone, companyId);

  if (!contact) {
    const contactData: InsertContact = {
      companyId: companyId, // Ensure contact belongs to the company
      name: normalizedPhone,
      phone: normalizedPhone,
      email: null,
      avatarUrl: null,
      identifier: normalizedPhone,
      identifierType: 'whatsapp',
      source: 'whatsapp_official',
      notes: null
    };

    contact = await storage.getOrCreateContact(contactData);

  }


  let conversation = await storage.getConversationByContactAndChannel(
    contact.id,
    connectionId
  );

  if (!conversation) {

    const conversationData: InsertConversation = {
      companyId: companyId, // Ensure conversation belongs to the company
      contactId: contact.id,
      channelId: connectionId,
      channelType: 'whatsapp_official',
      status: 'open',
      assignedToUserId: null,
      lastMessageAt: new Date(),
    };

    conversation = await storage.createConversation(conversationData);

  }

  return conversation;
}

/**
 * Enhanced send message function that integrates with the inbox system
 * @param connectionId The channel connection ID
 * @param userId The user ID sending the message
 * @param companyId The company ID for multi-tenant security
 * @param to The recipient phone number
 * @param message The message content
 * @returns The saved message object
 */
export async function sendMessage(connectionId: number, userId: number, companyId: number, to: string, message: string) {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for multi-tenant security');
    }

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }


    if (connection.companyId !== companyId) {
      throw new Error(`Access denied: Connection does not belong to company ${companyId}`);
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connectionData?.accessToken || connection.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }


    const normalizedPhone = normalizePhoneToE164(to);


    const response = await axios.post(
      `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data) {
      const messageId = response.data.messages?.[0]?.id;


      const conversation = await findOrCreateConversation(connectionId, normalizedPhone, companyId);


      const savedMessage = await storage.createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        type: 'text',
        content: message,
        senderId: userId,
        senderType: 'user',
        isFromBot: false,
        externalId: messageId || `wa-${Date.now()}`,
        metadata: JSON.stringify({
          whatsapp_message_id: messageId,
          timestamp: new Date().toISOString(),
          phone_number_id: phoneNumberId
        })
      });


      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date()
      });


      eventEmitter.emit('newMessage', {
        message: savedMessage,
        conversation: await storage.getConversation(conversation.id)
      });

      return savedMessage;
    } else {
      throw new Error('Failed to send message: Unknown error');
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp Business API message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

/**
 * Test WhatsApp webhook configuration
 * @param webhookUrl The webhook URL to test
 * @param verifyToken The verify token to test
 * @returns Promise with test result
 */
export async function testWebhookConfiguration(
  webhookUrl: string,
  verifyToken: string
): Promise<{ success: boolean; error?: string }> {
  try {

    const url = new URL(webhookUrl);
    if (url.protocol !== 'https:') {
      return { success: false, error: 'Webhook URL must use HTTPS' };
    }

    if (!url.pathname.includes('/api/webhooks/whatsapp')) {
      return { success: false, error: 'Webhook URL must point to /api/webhooks/whatsapp endpoint' };
    }


    const testParams = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': 'test_challenge_' + Date.now()
    });



    const testResponse = await axios.get(`${webhookUrl}?${testParams.toString()}`, {
      timeout: 10000,
      validateStatus: (status) => status === 200 || status === 403 || status === 500
    });

    if (testResponse.status === 200) {

      const expectedChallenge = testParams.get('hub.challenge');
      if (testResponse.data === expectedChallenge) {

        return { success: true };
      } else {
        return {
          success: false,
          error: `Webhook returned incorrect challenge. Expected: ${expectedChallenge}, Got: ${testResponse.data}`
        };
      }
    } else if (testResponse.status === 403) {
      return {
        success: false,
        error: 'Webhook verification failed - verify token mismatch. Check that your verify token matches the one stored in the database for your WhatsApp Business API connection.'
      };
    } else {
      return {
        success: false,
        error: `Webhook test failed with status ${testResponse.status}. ${testResponse.data || ''}`
      };
    }
  } catch (error: any) {
    console.error('Error testing WhatsApp webhook configuration:', error.message);
    return {
      success: false,
      error: error.code === 'ECONNREFUSED'
        ? 'Could not connect to webhook URL - check if server is accessible'
        : error.message || 'Webhook test failed'
    };
  }
}

/**
 * Send interactive message with buttons through WhatsApp Business API
 */
export async function sendInteractiveMessage(
  connectionId: number,
  interactiveMessage: any
): Promise<{ messageId?: string; success: boolean }> {
  try {
    

    const connection = await storage.getChannelConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const connectionData = connection.connectionData as any;
    const accessToken = connectionData?.accessToken || connection.accessToken;
    const phoneNumberId = connectionData?.phoneNumberId;

    if (!accessToken) {
      throw new Error('WhatsApp Business API access token is missing');
    }

    if (!phoneNumberId) {
      throw new Error('WhatsApp Business API phone number ID is missing');
    }

    const url = `${WHATSAPP_GRAPH_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    

    
    const response = await axios.post(url, interactiveMessage, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data?.messages?.[0]?.id) {

      return {
        messageId: response.data.messages[0].id,
        success: true
      };
    } else {
      console.warn('WhatsApp interactive message sent but no message ID returned');
      return { success: true };
    }

  } catch (error: any) {
    console.error('Error sending WhatsApp interactive message:', error);

    if (error.response?.data) {
      console.error('WhatsApp API error response:', error.response.data);
      throw new Error(`WhatsApp API error: ${error.response.data.error?.message || 'Unknown error'}`);
    }

    throw error;
  }
}

export default {
  connect: connectToWhatsAppBusiness,
  disconnect: disconnectFromWhatsAppBusiness,
  sendMessage: sendMessage, // Use the enhanced sendMessage function
  sendBusinessMessage: sendWhatsAppBusinessMessage, // Keep the original for backward compatibility
  sendInteractiveMessage: sendInteractiveMessage, // Add interactive message support
  sendWhatsAppTestTemplate, // Add the test template function
  sendTemplateMessage, // Add the campaign template message function
  sendMedia: sendWhatsAppBusinessMediaMessage,
  isActive: isBusinessConnectionActive,
  getActiveConnections: getActiveBusinessConnections,
  subscribeToEvents: subscribeToWhatsAppBusinessEvents,
  processWebhook: processWebhook,
  setupWebhook: setupWebhookSubscription,
  verifyWebhookSignature,
  testWebhookConfiguration,
  initializeConnection, // Add the new method
  getConnectionStatus
};