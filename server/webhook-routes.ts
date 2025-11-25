import express, { type Express } from "express";
import { storage } from "./storage";
import whatsAppOfficialService from "./services/channels/whatsapp-official";
import whatsApp360DialogPartnerService from "./services/channels/whatsapp-360dialog-partner";
import TikTokService from "./services/channels/tiktok";
import instagramService from './services/channels/instagram';
import twilioSmsService from './services/channels/twilio-sms';
import webchatService from './services/channels/webchat';
import {
  create360DialogWebhookSecurity,
  createWhatsAppWebhookSecurity,
  createTikTokWebhookSecurity,
  verifyWhatsAppWebhookSignature,
  logWebhookSecurityEvent
} from "./middleware/webhook-security";
import { logTikTokWebhookEvent } from "./utils/webhook-logger";

/**
 * Register webhook endpoints before any JSON middleware to avoid body parsing conflicts
 * This ensures webhooks receive raw bodies for proper signature verification
 */
export function registerWebhookRoutes(app: Express): void {
  

  app.post('/api/webhooks/webchat',
    express.json(),
    async (req, res) => {
      try {
        const payload = req.body;
        const { token } = payload || {};


        const connection = await webchatService.verifyWidgetToken(token);
        if (!connection) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        await webchatService.processWebhook(payload, connection.companyId);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing WebChat webhook:', error);
        res.status(500).send('Internal Server Error');
      }
    }
  );

  app.get('/api/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];


    if (mode !== 'subscribe') {

      return res.status(403).send('Forbidden');
    }

    try {

      const whatsappConnections = await storage.getChannelConnectionsByType('whatsapp_official');
      
      let matchingConnection = null;
      for (const connection of whatsappConnections) {
        const connectionData = connection.connectionData as any;
        if (connectionData?.verifyToken === token) {
          matchingConnection = connection;
          break;
        }
      }


      const globalToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'default_verify_token';
      const isGlobalMatch = token === globalToken;

      if (matchingConnection || isGlobalMatch) {
                res.status(200).send(challenge);
      } else {
       
        res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('Error during WhatsApp webhook verification:', error);
      res.status(500).send('Internal Server Error');
    }
  });


  app.post('/api/webhooks/twilio/sms',
    express.urlencoded({ extended: false }),
    async (req, res) => {







      
      try {
        const signature = req.get('x-twilio-signature') as string | undefined;
        
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('x-forwarded-host') || req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;
        


        
        const result = await twilioSmsService.processInboundWebhook(fullUrl, req.body as any, signature);
        



        
        return res.sendStatus(result.status);
      } catch (error) {
        console.error('❌ [TWILIO SMS WEBHOOK] Error processing inbound webhook:', error);
        console.error('❌ [TWILIO SMS WEBHOOK] Error stack:', error instanceof Error ? error.stack : 'N/A');

        return res.sendStatus(500);
      }
    }
  );


  app.post('/api/webhooks/twilio/sms-status',
    express.urlencoded({ extended: false }),
    async (req, res) => {




      
      try {
        const signature = req.get('x-twilio-signature') as string | undefined;
        
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('x-forwarded-host') || req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;
        



        
        const result = await twilioSmsService.processStatusWebhook(fullUrl, req.body as any, signature);
        


        
        return res.sendStatus(result.status);
      } catch (error) {
        console.error('❌ [TWILIO SMS STATUS] Error processing status webhook:', error);
        console.error('❌ [TWILIO SMS STATUS] Error stack:', error instanceof Error ? error.stack : 'N/A');

        return res.sendStatus(500);
      }
    }
  );


  app.post('/api/webhooks/whatsapp',
    createWhatsAppWebhookSecurity(),
    express.raw({ type: 'application/json' }),
    async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const body = req.body;

     


      const payload = JSON.parse(body.toString());

      

      let phoneNumberId: string | null = null;
      if (payload.entry && payload.entry.length > 0) {
        const entry = payload.entry[0];
        if (entry.changes && entry.changes.length > 0) {
          const change = entry.changes[0];
          if (change.value && change.value.metadata) {
            phoneNumberId = change.value.metadata.phone_number_id;
          }
        }
      }


      let targetConnection = null;
      let appSecret = null;
      let secretSource = 'none';

      if (phoneNumberId) {

        const whatsappConnections = await storage.getChannelConnectionsByType('whatsapp_official');
        targetConnection = whatsappConnections.find(conn => {
          const data = conn.connectionData as any;
          return data?.phoneNumberId === phoneNumberId || data?.businessAccountId === phoneNumberId;
        });

        if (targetConnection) {
          const connectionData = targetConnection.connectionData as any;
          appSecret = connectionData?.appSecret;
          secretSource = `connection_${targetConnection.id}_company_${targetConnection.companyId}`;

                  } else {
          console.warn('No connection found for phone number ID:', phoneNumberId);
        }
      }


      if (!appSecret) {
        appSecret = process.env.FACEBOOK_APP_SECRET;
        secretSource = 'global_env';
      }

      

      if (appSecret && signature) {

        if (!Buffer.isBuffer(body)) {
          console.error('❌ WhatsApp webhook body parsing error:', {
            expectedType: 'Buffer',
            actualType: typeof body,
            constructor: body?.constructor?.name,
            bodyPreview: body ? body.toString().substring(0, 100) : 'null',
            contentType: req.get('content-type'),
            contentLength: req.get('content-length')
          });
          return res.status(400).send('Invalid request body - expected raw body');
        }

        const isValid = whatsAppOfficialService.verifyWebhookSignature(signature, body, appSecret);
        if (!isValid) {
          console.error('❌ WhatsApp webhook signature verification failed:', {
            signatureProvided: signature ? signature.substring(0, 20) + '...' : 'none',
            bodyLength: body.length,
            appSecretConfigured: !!appSecret,
            secretSource,
            phoneNumberId,
            connectionId: targetConnection?.id,
            companyId: targetConnection?.companyId
          });
          return res.status(403).send('Forbidden');
        }

      } else {
        console.warn('⚠️ WhatsApp webhook signature verification skipped:', {
          hasAppSecret: !!appSecret,
          hasSignature: !!signature,
          secretSource
        });
      }


      

      await whatsAppOfficialService.processWebhook(payload, targetConnection?.companyId || undefined);


      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error processing WhatsApp webhook:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        hasBody: !!req.body
      });
      res.status(500).send('Internal Server Error');
    }
  });


  /**
   * Instagram webhook verification endpoint (GET)
   */
  app.get('/api/webhooks/instagram', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode !== 'subscribe') {
      return res.status(403).send('Forbidden');
    }

    try {
      const instagramConnections = await storage.getChannelConnectionsByType('instagram');
      let matchingConnection = null;
      for (const connection of instagramConnections) {
        const connectionData = connection.connectionData as any;
        if (connectionData?.verifyToken === token) {
          matchingConnection = connection;
          break;
        }
      }

      const globalToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
      const isGlobalMatch = globalToken && token === globalToken;

      if (matchingConnection || isGlobalMatch) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('Error during Instagram webhook verification:', error);
      res.status(500).send('Internal Server Error');
    }
  });


  app.post('/api/webhooks/instagram',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const body = req.body;



      console.log('🔍 [INSTAGRAM WEBHOOK] Headers:', JSON.stringify({
        'x-hub-signature-256': signature ? 'present' : 'missing',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }, null, 2));

      if (!Buffer.isBuffer(body)) {
        console.error('❌ [INSTAGRAM WEBHOOK] Body parsing error: expected raw body Buffer');
        return res.status(400).send('Invalid request body - expected raw body');
      }

      const payload = JSON.parse(body.toString());
      


      console.log('🔍 [INSTAGRAM WEBHOOK] Payload structure:', {
        hasEntry: !!payload?.entry,
        entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
        entryIds: Array.isArray(payload?.entry) ? payload.entry.map((e: any) => e.id) : []
      });

      let targetConnection = null;
      if (payload?.entry && Array.isArray(payload.entry) && payload.entry.length > 0) {
        const instagramAccountId = payload.entry[0]?.id;

        
        if (instagramAccountId) {
          const instagramConnections = await storage.getChannelConnectionsByType('instagram');
          console.log('🔍 [INSTAGRAM WEBHOOK] Available Instagram connections:', instagramConnections.map((conn: any) => ({
            id: conn.id,
            accountName: conn.accountName,
            instagramAccountId: (conn.connectionData as any)?.instagramAccountId,
            companyId: conn.companyId,
            status: conn.status
          })));
          
          targetConnection = instagramConnections.find((conn: any) => {
            const connectionData = conn.connectionData as any;
            return connectionData?.instagramAccountId === instagramAccountId;
          });
          
          if (targetConnection) {
            
          } else {
            console.warn('⚠️ [INSTAGRAM WEBHOOK] No matching connection found for Instagram Account ID:', instagramAccountId);
          }
        }
      }


      if (!targetConnection) {

        const instagramConnections = await storage.getChannelConnectionsByType('instagram');
        const activeConnections = instagramConnections.filter((conn: any) => 
          conn.status === 'active' || conn.status === 'error'
        );
        
        if (activeConnections.length > 0) {
          targetConnection = activeConnections[0]; // Use the first available connection
          
        }
      }


      await instagramService.processWebhook(payload, signature, targetConnection?.companyId || undefined);


      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ [INSTAGRAM WEBHOOK] Error processing webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });


  app.post('/api/webhooks/360dialog-partner',
    create360DialogWebhookSecurity(),
    express.json(),
    async (req, res) => {
      try {
        const payload = req.body;

        logWebhookSecurityEvent('signature_verified', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: '360dialog-partner'
        });

        if (!payload.id || !payload.event) {
          console.warn('Invalid 360Dialog Partner webhook payload:', payload);
          return res.status(400).json({ error: 'Invalid payload' });
        }

        
        await whatsApp360DialogPartnerService.processPartnerWebhook(payload);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing 360Dialog Partner webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );


  app.post('/api/webhooks/360dialog-messaging',
    create360DialogWebhookSecurity(),
    express.json(),
    async (req, res) => {
      try {
        const payload = req.body;

        logWebhookSecurityEvent('signature_verified', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: '360dialog-messaging'
        });

        if (!payload.object || !payload.entry) {
          console.warn('Invalid 360Dialog Messaging webhook payload:', payload);
          return res.status(400).json({ error: 'Invalid payload' });
        }


        await whatsApp360DialogPartnerService.processMessagingWebhook(payload);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing 360Dialog Messaging webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );





  /**
   * TikTok webhook verification endpoint (GET)
   * TikTok sends a verification request when setting up webhooks
   */
  app.get('/api/webhooks/tiktok', async (req, res) => {
    try {
      const challenge = req.query['challenge'];
      const verifyToken = req.query['verify_token'];




      try {
        const platformConfig = await TikTokService.getPlatformConfig();

        if (platformConfig.webhookSecret && verifyToken === platformConfig.webhookSecret) {

          logWebhookSecurityEvent('verification_success', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: 'tiktok'
          });


          return res.status(200).send(challenge);
        } else {

          logWebhookSecurityEvent('verification_failed', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: 'tiktok',
            reason: 'invalid_verify_token'
          });
          return res.status(403).send('Forbidden');
        }
      } catch (error) {
        console.error('Error retrieving TikTok platform config:', error);
        return res.status(500).send('Internal Server Error');
      }
    } catch (error) {
      console.error('Error during TikTok webhook verification:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  /**
   * TikTok webhook event endpoint (POST)
   * Receives webhook events from TikTok Business Messaging API
   */
  app.post('/api/webhooks/tiktok',
    createTikTokWebhookSecurity(),
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const startTime = Date.now();
      let eventType = 'unknown';

      try {
        const signature = req.headers['x-tiktok-signature'] as string;
        const body = req.body;

      


        const payload = JSON.parse(body.toString());
        eventType = payload.event_type || payload.type || 'unknown';


        logTikTokWebhookEvent(eventType, 'received', {
          payload: payload,
          metadata: {
            hasSignature: !!signature,
            ip: req.ip,
            userAgent: req.get('user-agent')
          }
        });


        if (signature) {
          try {
            const platformConfig = await TikTokService.getPlatformConfig();

            if (platformConfig.webhookSecret) {
              if (!Buffer.isBuffer(body)) {
                console.error('Expected Buffer but got:', typeof body, body?.constructor?.name);
                logTikTokWebhookEvent(eventType, 'error', {
                  error: 'Invalid request body - expected raw body'
                });
                return res.status(400).send('Invalid request body - expected raw body');
              }

              const isValid = TikTokService.verifyWebhookSignature(
                body.toString(),
                signature,
                platformConfig.webhookSecret
              );

              if (!isValid) {
                console.warn('❌ TikTok webhook signature verification failed');
                logWebhookSecurityEvent('signature_verification_failed', {
                  ip: req.ip,
                  userAgent: req.get('User-Agent'),
                  endpoint: 'tiktok'
                });
                logTikTokWebhookEvent(eventType, 'error', {
                  error: 'Signature verification failed'
                });
                return res.status(403).send('Forbidden');
              }


              logWebhookSecurityEvent('signature_verified', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                endpoint: 'tiktok'
              });
            } else {
              console.warn('⚠️ TikTok webhook secret not configured, skipping signature verification');
            }
          } catch (error) {
            console.error('Error verifying TikTok webhook signature:', error);
            logTikTokWebhookEvent(eventType, 'error', {
              error: error instanceof Error ? error.message : 'Signature verification error'
            });
            return res.status(500).send('Internal Server Error');
          }
        } else {
          console.warn('⚠️ TikTok webhook received without signature');
        }


        if (!payload || typeof payload !== 'object') {
          console.warn('Invalid TikTok webhook payload:', payload);
          logTikTokWebhookEvent(eventType, 'error', {
            error: 'Invalid payload structure'
          });
          return res.status(400).json({ error: 'Invalid payload' });
        }


        logTikTokWebhookEvent(eventType, 'processing');


        await TikTokService.processWebhookEvent(payload);


        const processingTimeMs = Date.now() - startTime;


        logTikTokWebhookEvent(eventType, 'success', {
          processingTimeMs,
          metadata: {
            eventType: eventType
          }
        });


        res.status(200).send('OK');
      } catch (error) {
        const processingTimeMs = Date.now() - startTime;
        console.error('Error processing TikTok webhook:', error);

        logTikTokWebhookEvent(eventType, 'error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs
        });

        res.status(500).send('Internal Server Error');
      }
    }
  );


  app.get('/api/webhooks/test', (req, res) => {
    res.json({
      message: 'Webhook routes are working',
      timestamp: new Date().toISOString(),
      registeredBefore: 'JSON middleware'
    });
  });


}
