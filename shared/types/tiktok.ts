/**
 * TikTok Business Messaging API Type Definitions
 * 
 * Note: TikTok Business Messaging API is partner-only.
 * These types are based on TikTok Login Kit OAuth documentation and
 * third-party partner implementations.
 */





/**
 * TikTok platform configuration stored in partner_configurations table
 * This is configured by super admin and shared across all companies
 */
export interface TikTokPlatformConfig {

  clientKey: string;           // TikTok app client key
  clientSecret: string;         // TikTok app client secret (encrypted)
  

  webhookUrl: string;           // Platform webhook URL for receiving messages
  webhookSecret?: string;       // Webhook signature verification secret (encrypted)
  

  apiVersion?: string;          // TikTok API version (e.g., "v2")
  apiBaseUrl?: string;          // Base URL for TikTok Business API
  

  partnerId?: string;           // TikTok Messaging Partner ID (if applicable)
  partnerName?: string;         // Partner display name
  

  logoUrl?: string;             // TikTok logo URL for UI
  redirectUrl?: string;         // OAuth redirect URL
}





/**
 * TikTok connection data stored in channel_connections.connectionData
 * This is specific to each company's TikTok Business account
 */
export interface TikTokConnectionData {

  accessToken: string;          // TikTok user access token (encrypted)
  refreshToken: string;         // TikTok refresh token (encrypted)
  tokenExpiresAt: number;       // Unix timestamp when access token expires
  

  accountId: string;            // TikTok user ID (open_id)
  accountName: string;          // TikTok display name
  accountHandle?: string;       // TikTok username (@handle)
  avatarUrl?: string;           // TikTok profile picture URL
  

  grantedScopes: string[];      // Scopes granted by user (e.g., ["user.info.basic"])
  

  isBusinessAccount: boolean;   // Must be true for messaging
  businessAccountId?: string;   // TikTok Business account ID (if different from open_id)
  

  connectedAt: number;          // Unix timestamp when connection was established
  lastSyncAt?: number;          // Unix timestamp of last successful sync
  

  status: 'active' | 'error' | 'token_expired' | 'disconnected';
  lastError?: string;           // Last error message
  errorCount?: number;          // Consecutive error count
}





/**
 * TikTok OAuth authorization request parameters
 */
export interface TikTokOAuthAuthorizationParams {
  client_key: string;
  scope: string;                // Comma-separated scopes
  response_type: 'code';
  redirect_uri: string;
  state: string;                // CSRF protection token
  disable_auto_auth?: 0 | 1;   // 0 = skip auth page for valid sessions, 1 = always show
}

/**
 * TikTok OAuth callback response
 */
export interface TikTokOAuthCallbackResponse {
  code?: string;                // Authorization code (if successful)
  scopes?: string;              // Comma-separated granted scopes
  state: string;                // CSRF state token
  error?: string;               // Error code (if failed)
  error_description?: string;   // Human-readable error description
}

/**
 * TikTok OAuth token exchange request
 */
export interface TikTokOAuthTokenRequest {
  client_key: string;
  client_secret: string;
  code?: string;                // For authorization_code grant
  refresh_token?: string;       // For refresh_token grant
  grant_type: 'authorization_code' | 'refresh_token';
  redirect_uri?: string;        // Required for authorization_code grant
}

/**
 * TikTok OAuth token response
 */
export interface TikTokOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;           // Seconds until expiration (typically 86400 = 24 hours)
  token_type: 'Bearer';
  scope: string;                // Comma-separated granted scopes
  open_id: string;              // TikTok user ID
}





/**
 * TikTok user information from user.info.basic scope
 */
export interface TikTokUserInfo {
  open_id: string;              // TikTok user ID
  union_id?: string;            // Union ID across TikTok apps
  avatar_url?: string;          // Profile picture URL
  avatar_url_100?: string;      // 100x100 avatar
  avatar_large_url?: string;    // Large avatar
  display_name: string;         // Display name
  bio_description?: string;     // Profile bio
  profile_deep_link?: string;   // Deep link to profile
  is_verified?: boolean;        // Verified account badge
  username?: string;            // TikTok username (@handle)
  follower_count?: number;      // Number of followers
  following_count?: number;     // Number of following
  likes_count?: number;         // Total likes received
  video_count?: number;         // Number of videos posted
}





/**
 * TikTok message object (estimated structure based on partner implementations)
 */
export interface TikTokMessage {
  message_id: string;           // Unique message ID
  conversation_id: string;      // Conversation/thread ID
  sender_id: string;            // Sender's TikTok user ID (open_id)
  recipient_id: string;         // Recipient's TikTok user ID
  message_type: 'text' | 'image' | 'video' | 'sticker';
  content: TikTokMessageContent;
  timestamp: number;            // Unix timestamp
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

/**
 * TikTok message content (varies by message_type)
 */
export interface TikTokMessageContent {
  text?: string;                // For text messages
  image_url?: string;           // For image messages
  video_url?: string;           // For video messages
  sticker_id?: string;          // For sticker messages
  thumbnail_url?: string;       // Thumbnail for media
  media_type?: string;          // MIME type
  media_size?: number;          // File size in bytes
}

/**
 * TikTok send message request (estimated)
 */
export interface TikTokSendMessageRequest {
  recipient: {
    id: string;                 // Recipient's TikTok user ID
  };
  message: {
    text?: string;              // For text messages
    attachment?: {              // For media messages
      type: 'image' | 'video';
      payload: {
        url: string;
      };
    };
  };
  conversation_id?: string;     // Optional conversation ID
}

/**
 * TikTok send message response (estimated)
 */
export interface TikTokSendMessageResponse {
  message_id: string;
  status: 'sent' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}





/**
 * TikTok webhook payload (estimated structure)
 */
export interface TikTokWebhookPayload {
  event_type: 'message.received' | 'message.status' | 'conversation.updated';
  timestamp: number;
  data: TikTokWebhookData;
  signature?: string;           // HMAC signature for verification
}

/**
 * TikTok webhook data (varies by event_type)
 */
export interface TikTokWebhookData {
  message?: TikTokMessage;
  conversation_id?: string;
  user_id?: string;
  status?: string;
  metadata?: Record<string, any>;
}





/**
 * TikTok API error response
 */
export interface TikTokAPIError {
  error: {
    code: string;               // Error code (e.g., "invalid_token", "rate_limit_exceeded")
    message: string;            // Human-readable error message
    log_id?: string;            // Request log ID for debugging
  };
}

/**
 * TikTok error codes
 */
export enum TikTokErrorCode {
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  INVALID_REQUEST = 'invalid_request',
  USER_NOT_FOUND = 'user_not_found',
  MESSAGE_WINDOW_EXPIRED = 'message_window_expired',  // 48-hour window
  BUSINESS_ACCOUNT_REQUIRED = 'business_account_required',
  PARTNER_ACCESS_REQUIRED = 'partner_access_required',
}





/**
 * TikTok rate limit information
 */
export interface TikTokRateLimit {
  limit: number;                // Max requests per window (e.g., 10 QPS)
  remaining: number;            // Remaining requests in current window
  reset: number;                // Unix timestamp when limit resets
  window: number;               // Window duration in seconds
}





export function isTikTokConnectionData(data: any): data is TikTokConnectionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.accessToken === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.accountId === 'string' &&
    typeof data.accountName === 'string' &&
    typeof data.isBusinessAccount === 'boolean'
  );
}

export function isTikTokPlatformConfig(config: any): config is TikTokPlatformConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof config.clientKey === 'string' &&
    typeof config.clientSecret === 'string'
  );
}

