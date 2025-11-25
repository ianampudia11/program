
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: any) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            setup: Record<string, any>;
            featureType: string;
            sessionInfoVersion: string;
          }
        }
      ) => void;
    };
  }
}

/**
 * Type definitions for response objects
 */
interface AuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
  code?: string;
}

export interface FacebookLoginResponse {
  authResponse: AuthResponse | null;
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface WhatsAppSignupData {
  type: 'WA_EMBEDDED_SIGNUP';
  wabaId?: string;
  phoneNumberId?: string;
  screen?: string;
}

/**
 * Initialize Facebook SDK
 * @param appId Your Facebook App ID
 * @param version Graph API version (e.g., 'v22.0')
 */
export function initFacebookSDK(appId: string, version = 'v22.0'): Promise<void> {
  return new Promise((resolve, reject) => {

    if (document.getElementById('facebook-jssdk')) {

      if (window.FB) {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: version
        });
      }
      

      setTimeout(() => {
        if (window.FB && typeof window.FB.getLoginStatus === 'function') {
          resolve();
        } else {
          setTimeout(() => {
            if (window.FB && typeof window.FB.getLoginStatus === 'function') {
              resolve();
            } else {
              reject(new Error('Facebook SDK failed to initialize properly'));
            }
          }, 1000);
        }
      }, 1000); // Always wait 1 second for internal initialization
      return;
    }


    window.fbAsyncInit = function() {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: version
      });
      


      setTimeout(() => {
        resolve();
      }, 1000); // Wait 1 second for internal initialization
    };


    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    script.onerror = () => {
      reject(new Error('Failed to load Facebook SDK'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Setup event listener for WhatsApp signup events
 * @param callback Function to call when a WhatsApp signup event is received
 */
export function setupWhatsAppSignupListener(callback: (data: WhatsAppSignupData) => void) {
  window.addEventListener('message', (event) => {
    if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
    
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        callback(data);
      }
    } catch {

    }
  });
}

/**
 * Launch WhatsApp Business signup flow
 * @param configId Your WhatsApp Business configuration ID
 * @param callback Callback function to handle the login response
 */
export async function launchWhatsAppSignup(
  configId: string, 
  callback: (response: FacebookLoginResponse) => void
) {
  if (!window.FB) {
    console.error('Facebook SDK not initialized. Call initFacebookSDK first.');
    throw new Error('Facebook SDK not initialized. Please try again.');
  }

  if (!configId || configId.trim() === '') {
    console.error('WhatsApp Configuration ID is empty or invalid:', configId);
    throw new Error('WhatsApp Configuration ID is required. Please check your configuration.');
  }


  if (window.location.protocol !== 'https:') {
    console.error('Facebook SDK requires HTTPS. Current protocol:', window.location.protocol);
    throw new Error('WhatsApp signup requires HTTPS. Please access this application over HTTPS (https://) instead of HTTP.');
  }


  if (!window.FB || typeof window.FB.login !== 'function') {
    throw new Error('Facebook SDK is not properly initialized');
  }


  try {
    window.FB.getLoginStatus(() => {

      window.FB.login(callback, {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        }
      });
    });
  } catch (error) {
    console.error('Error launching WhatsApp signup:', error);
    throw new Error('Failed to launch WhatsApp signup. Please check your configuration.');
  }
}