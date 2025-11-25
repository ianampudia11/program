import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware for production
 */
export function setupSecurityMiddleware(app: any) {

  const disableCSP = true; 

  app.use(helmet({
    contentSecurityPolicy: disableCSP ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:",
          "data:"
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "data:"],
        frameSrc: ["'self'", "https:"],
        childSrc: ["'self'", "https:"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, 
    xFrameOptions: false, 
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));





  const isWebChatWidgetEndpoint = (path: string): boolean => {
    return (
      path === '/api/webchat/widget.js' ||
      path === '/api/webchat/widget.html' ||
      path.startsWith('/api/webchat/embed/') ||
      path.startsWith('/api/webchat/config/') ||
      path === '/api/webchat/session' ||
      path === '/api/webchat/message' ||
      path.startsWith('/api/webchat/messages/') ||
      path === '/api/webchat/upload'
    );
  };

  app.options('/api/webchat/*', (req: Request, res: Response) => {
    if (isWebChatWidgetEndpoint(req.path)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    res.status(200).end();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {

    res.removeHeader('X-Powered-By');


    res.setHeader('X-Content-Type-Options', 'nosniff');


    const embedCookie = (req as any).cookies?.['powerchat_embed_context'];
    const secFetchDest = req.headers['sec-fetch-dest'];
    const isIframeRequest = secFetchDest === 'iframe';
    
    const isEmbedded = 
      req.query.embed === 'true' || 
      (req as any).isEmbedded === true || 
      embedCookie === 'true' ||
      isIframeRequest;

    if (isWebChatWidgetEndpoint(req.path)) {

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      if (req.path.startsWith('/api/webchat/embed/')) {
        res.setHeader('Content-Security-Policy', 'frame-ancestors *');
      }
    } else {


      if (isEmbedded) {



        res.setHeader('Content-Security-Policy', 'frame-ancestors *');
      } else {


        const isHtmlResponse = !req.path.startsWith('/api/') && 
                              !req.path.startsWith('/public/') &&
                              (req.path === '/' || !req.path.includes('.'));
        
        if (isHtmlResponse) {


          if (secFetchDest === 'document' || secFetchDest === 'empty') {

            res.setHeader('X-Frame-Options', 'DENY');
          } else {


            res.setHeader('Content-Security-Policy', 'frame-ancestors *');
          }
        } else {

          res.setHeader('X-Frame-Options', 'DENY');
        }
      }
    }

    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');


    if (!disableCSP) {
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self)');
    }


    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  });


  app.use(async (req: Request, res: Response, next: NextFunction) => {

    const isAdminRoute = req.path.startsWith('/api/admin');
    const isHealthCheck = req.path === '/health' || req.path === '/api/health';

    if (isHealthCheck || isAdminRoute) {
      return next();
    }

    try {
      const { storage } = await import('../storage');
      const maintenanceModeSetting = await storage.getAppSetting('system.maintenanceMode');

      if (maintenanceModeSetting?.value === true) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'System is currently under maintenance. Please try again later.',
          maintenanceMode: true
        });
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }

    next();
  });


  app.use((req: Request, res: Response, next: NextFunction) => {

    const suspiciousPatterns = [
      /\.\.\//g, 
      /<script/gi,
      /union.*select/gi, 
      /javascript:/gi, 
      /vbscript:/gi,
    ];

    const checkString = (str: string): boolean => {
      return suspiciousPatterns.some(pattern => pattern.test(str));
    };


    if (checkString(req.url)) {
      
      return res.status(400).json({ error: 'Invalid request' });
    }


    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && checkString(value)) {
        
        return res.status(400).json({ error: 'Invalid request' });
      }
    }


    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      if (checkString(bodyStr)) {
        
        return res.status(400).json({ error: 'Invalid request' });
      }
    }

    next();
  });


  app.use('/api/', (req: Request, res: Response, next: NextFunction) => {

    if (process.env.NODE_ENV === 'production') {
      
    }
    

    if (!req.headers['user-agent']) {
      return res.status(400).json({ error: 'Missing required headers' });
    }
    
    next();
  });
}

/**
 * Security event reporting endpoint
 */
export function setupSecurityReporting(app: any) {
  app.post('/api/security/report', (req: Request, res: Response) => {
    const { reason, timestamp, userAgent, url } = req.body;
    

    console.warn('🚨 Client Security Event:', {
      reason,
      timestamp,
      userAgent,
      url,
      ip: req.ip,
      headers: req.headers
    });
    


    res.status(200).json({ status: 'reported' });
  });


  app.get('/security-violation', (req: Request, res: Response) => {
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Security Violation</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="error">🚨 Security Violation Detected</div>
        <div class="message">
          Your session has been terminated due to suspicious activity.<br>
          If you believe this is an error, please contact support.
        </div>
      </body>
      </html>
    `);
  });
}
