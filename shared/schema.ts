import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, pgEnum, numeric, unique, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'agent']);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subdomain: text("subdomain").unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#333235"),
  active: boolean("active").default(true),
  plan: text("plan").default("free"),
  planId: integer("plan_id").references(() => plans.id),
  subscriptionStatus: text("subscription_status", {
    enum: ['active', 'inactive', 'pending', 'cancelled', 'overdue', 'trial', 'grace_period', 'paused', 'past_due']
  }).default("inactive"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  isInTrial: boolean("is_in_trial").default(false),
  maxUsers: integer("max_users").default(5),


  registerNumber: text("register_number"),
  companyEmail: text("company_email"),
  contactPerson: text("contact_person"),
  iban: text("iban"),

  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  billingCycleAnchor: timestamp("billing_cycle_anchor"),
  gracePeriodEnd: timestamp("grace_period_end"),
  pauseStartDate: timestamp("pause_start_date"),
  pauseEndDate: timestamp("pause_end_date"),
  autoRenewal: boolean("auto_renewal").default(true),
  dunningAttempts: integer("dunning_attempts").default(0),
  lastDunningAttempt: timestamp("last_dunning_attempt"),
  subscriptionMetadata: jsonb("subscription_metadata").default('{}'),


  currentStorageUsed: integer("current_storage_used").default(0), // in MB
  currentBandwidthUsed: integer("current_bandwidth_used").default(0), // monthly bandwidth used in MB
  filesCount: integer("files_count").default(0), // current number of files
  lastUsageUpdate: timestamp("last_usage_update").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  slug: true,
  logo: true,
  primaryColor: true,
  active: true,
  plan: true,
  planId: true,
  subscriptionStatus: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  trialStartDate: true,
  trialEndDate: true,
  isInTrial: true,
  maxUsers: true,
  registerNumber: true,
  companyEmail: true,
  contactPerson: true,
  iban: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  billingCycleAnchor: true,
  gracePeriodEnd: true,
  pauseStartDate: true,
  pauseEndDate: true,
  autoRenewal: true,
  dunningAttempts: true,
  lastDunningAttempt: true,
  subscriptionMetadata: true,

  currentStorageUsed: true,
  currentBandwidthUsed: true,
  filesCount: true,
  lastUsageUpdate: true
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("agent"),
  companyId: integer("company_id").references(() => companies.id),
  isSuperAdmin: boolean("is_super_admin").default(false),
  active: boolean("active").default(true),
  languagePreference: text("language_preference").default("en"),
  permissions: jsonb("permissions").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  role: userRoleEnum("role").notNull(),
  permissions: jsonb("permissions").notNull().default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const companyPages = pgTable("company_pages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  isPublished: boolean("is_published").default(true),
  isFeatured: boolean("is_featured").default(false),
  template: varchar("template", { length: 100 }).default('default'),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  authorId: integer("author_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueCompanyPageSlug: unique("unique_company_page_slug").on(table.companyId, table.slug)
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  avatarUrl: true,
  role: true,
  companyId: true,
  isSuperAdmin: true,
  active: true,
  languagePreference: true,
  permissions: true
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  companyId: true,
  role: true,
  permissions: true
});

export const insertCompanyPageSchema = createInsertSchema(companyPages).pick({
  companyId: true,
  title: true,
  slug: true,
  content: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  isPublished: true,
  isFeatured: true,
  template: true,
  customCss: true,
  customJs: true,
  authorId: true
});

export const PERMISSIONS = {
  VIEW_ALL_CONVERSATIONS: 'view_all_conversations',
  VIEW_ASSIGNED_CONVERSATIONS: 'view_assigned_conversations',
  ASSIGN_CONVERSATIONS: 'assign_conversations',
  MANAGE_CONVERSATIONS: 'manage_conversations',

  VIEW_CONTACTS: 'view_contacts',
  MANAGE_CONTACTS: 'manage_contacts',

  VIEW_CHANNELS: 'view_channels',
  MANAGE_CHANNELS: 'manage_channels',

  VIEW_FLOWS: 'view_flows',
  MANAGE_FLOWS: 'manage_flows',

  VIEW_ANALYTICS: 'view_analytics',
  VIEW_DETAILED_ANALYTICS: 'view_detailed_analytics',

  VIEW_TEAM: 'view_team',
  MANAGE_TEAM: 'manage_team',

  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',

  VIEW_PIPELINE: 'view_pipeline',
  MANAGE_PIPELINE: 'manage_pipeline',

  VIEW_CALENDAR: 'view_calendar',
  MANAGE_CALENDAR: 'manage_calendar',

  VIEW_CAMPAIGNS: 'view_campaigns',
  CREATE_CAMPAIGNS: 'create_campaigns',
  EDIT_CAMPAIGNS: 'edit_campaigns',
  DELETE_CAMPAIGNS: 'delete_campaigns',
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_SEGMENTS: 'manage_segments',
  VIEW_CAMPAIGN_ANALYTICS: 'view_campaign_analytics',
  MANAGE_WHATSAPP_ACCOUNTS: 'manage_whatsapp_accounts',
  CONFIGURE_CHANNELS: 'configure_channels',

  VIEW_PAGES: 'view_pages',
  MANAGE_PAGES: 'manage_pages',

  VIEW_TASKS: 'view_tasks',
  MANAGE_TASKS: 'manage_tasks',

  CREATE_BACKUPS: 'create_backups',
  RESTORE_BACKUPS: 'restore_backups',
  MANAGE_BACKUPS: 'manage_backups'
} as const;

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    [PERMISSIONS.VIEW_ALL_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_ASSIGNED_CONVERSATIONS]: true,
    [PERMISSIONS.ASSIGN_CONVERSATIONS]: true,
    [PERMISSIONS.MANAGE_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_CONTACTS]: true,
    [PERMISSIONS.MANAGE_CONTACTS]: true,
    [PERMISSIONS.VIEW_CHANNELS]: true,
    [PERMISSIONS.MANAGE_CHANNELS]: true,
    [PERMISSIONS.VIEW_FLOWS]: true,
    [PERMISSIONS.MANAGE_FLOWS]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true,
    [PERMISSIONS.VIEW_DETAILED_ANALYTICS]: true,
    [PERMISSIONS.VIEW_TEAM]: true,
    [PERMISSIONS.MANAGE_TEAM]: true,
    [PERMISSIONS.VIEW_SETTINGS]: true,
    [PERMISSIONS.MANAGE_SETTINGS]: true,
    [PERMISSIONS.VIEW_PIPELINE]: true,
    [PERMISSIONS.MANAGE_PIPELINE]: true,
    [PERMISSIONS.VIEW_CALENDAR]: true,
    [PERMISSIONS.MANAGE_CALENDAR]: true,
    [PERMISSIONS.VIEW_CAMPAIGNS]: true,
    [PERMISSIONS.CREATE_CAMPAIGNS]: true,
    [PERMISSIONS.EDIT_CAMPAIGNS]: true,
    [PERMISSIONS.DELETE_CAMPAIGNS]: true,
    [PERMISSIONS.MANAGE_TEMPLATES]: true,
    [PERMISSIONS.MANAGE_SEGMENTS]: true,
    [PERMISSIONS.VIEW_CAMPAIGN_ANALYTICS]: true,
    [PERMISSIONS.MANAGE_WHATSAPP_ACCOUNTS]: true,
    [PERMISSIONS.CONFIGURE_CHANNELS]: true,
    [PERMISSIONS.VIEW_PAGES]: true,
    [PERMISSIONS.MANAGE_PAGES]: true,
    [PERMISSIONS.VIEW_TASKS]: true,
    [PERMISSIONS.MANAGE_TASKS]: true,
    [PERMISSIONS.CREATE_BACKUPS]: true,
    [PERMISSIONS.RESTORE_BACKUPS]: true,
    [PERMISSIONS.MANAGE_BACKUPS]: true
  },
  agent: {
    [PERMISSIONS.VIEW_ALL_CONVERSATIONS]: false,
    [PERMISSIONS.VIEW_ASSIGNED_CONVERSATIONS]: true,
    [PERMISSIONS.ASSIGN_CONVERSATIONS]: false,
    [PERMISSIONS.MANAGE_CONVERSATIONS]: true,
    [PERMISSIONS.VIEW_CONTACTS]: true,
    [PERMISSIONS.MANAGE_CONTACTS]: false,
    [PERMISSIONS.VIEW_CHANNELS]: false,
    [PERMISSIONS.MANAGE_CHANNELS]: false,
    [PERMISSIONS.VIEW_FLOWS]: false,
    [PERMISSIONS.MANAGE_FLOWS]: false,
    [PERMISSIONS.VIEW_ANALYTICS]: false,
    [PERMISSIONS.VIEW_DETAILED_ANALYTICS]: false,
    [PERMISSIONS.VIEW_TEAM]: false,
    [PERMISSIONS.MANAGE_TEAM]: false,
    [PERMISSIONS.VIEW_SETTINGS]: false,
    [PERMISSIONS.MANAGE_SETTINGS]: false,
    [PERMISSIONS.VIEW_PIPELINE]: false,
    [PERMISSIONS.MANAGE_PIPELINE]: false,
    [PERMISSIONS.VIEW_CALENDAR]: true,
    [PERMISSIONS.MANAGE_CALENDAR]: false,
    [PERMISSIONS.VIEW_CAMPAIGNS]: true,
    [PERMISSIONS.CREATE_CAMPAIGNS]: false,
    [PERMISSIONS.EDIT_CAMPAIGNS]: false,
    [PERMISSIONS.DELETE_CAMPAIGNS]: false,
    [PERMISSIONS.MANAGE_TEMPLATES]: false,
    [PERMISSIONS.MANAGE_SEGMENTS]: false,
    [PERMISSIONS.VIEW_CAMPAIGN_ANALYTICS]: true,
    [PERMISSIONS.MANAGE_WHATSAPP_ACCOUNTS]: false,
    [PERMISSIONS.CONFIGURE_CHANNELS]: false,
    [PERMISSIONS.VIEW_PAGES]: false,
    [PERMISSIONS.MANAGE_PAGES]: false,
    [PERMISSIONS.VIEW_TASKS]: true,
    [PERMISSIONS.MANAGE_TASKS]: false,
    [PERMISSIONS.CREATE_BACKUPS]: false,
    [PERMISSIONS.RESTORE_BACKUPS]: false,
    [PERMISSIONS.MANAGE_BACKUPS]: false
  }
};

export const channelTypes = z.enum([
  "whatsapp_official",
  "whatsapp_unofficial",
  "whatsapp_twilio",
  "whatsapp_360dialog",
  "messenger",
  "instagram",
  "email",
  "telegram",
  "tiktok",
  "webchat",
  "twilio_sms",
  "twilio_voice"
]);

export const whatsappProxyServers = pgTable("whatsapp_proxy_servers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  type: text("type", { enum: ['http', 'https', 'socks5'] }).notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username"),
  password: text("password"),
  testStatus: text("test_status", { enum: ['untested', 'working', 'failed'] }).default('untested'),
  lastTested: timestamp("last_tested"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const channelConnections = pgTable("channel_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  channelType: text("channel_type").notNull(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accessToken: text("access_token"),
  status: text("status").default("active"),
  connectionData: jsonb("connection_data"),
  historySyncEnabled: boolean("history_sync_enabled").default(false),
  historySyncStatus: text("history_sync_status", {
    enum: ['pending', 'syncing', 'completed', 'failed', 'disabled']
  }).default("pending"),
  historySyncProgress: integer("history_sync_progress").default(0),
  historySyncTotal: integer("history_sync_total").default(0),
  lastHistorySyncAt: timestamp("last_history_sync_at"),
  historySyncError: text("history_sync_error"),
  proxyServerId: integer("proxy_server_id").references(() => whatsappProxyServers.id, { onDelete: 'set null' }),
  proxyEnabled: boolean("proxy_enabled").default(false),
  proxyType: text("proxy_type", { enum: ['http', 'https', 'socks5'] }),
  proxyHost: text("proxy_host"),
  proxyPort: integer("proxy_port"),
  proxyUsername: text("proxy_username"),
  proxyPassword: text("proxy_password"),
  proxyTestStatus: text("proxy_test_status", { enum: ['untested', 'working', 'failed'] }).default('untested'),
  proxyLastTested: timestamp("proxy_last_tested"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const partnerConfigurations = pgTable("partner_configurations", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  partnerApiKey: text("partner_api_key").notNull(),
  partnerId: text("partner_id").notNull(),
  partnerSecret: text("partner_secret"),
  webhookVerifyToken: text("webhook_verify_token"),
  accessToken: text("access_token"),
  configId: text("config_id"),
  partnerWebhookUrl: text("partner_webhook_url"),
  redirectUrl: text("redirect_url"),
  publicProfile: jsonb("public_profile"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const dialog360Clients = pgTable("dialog_360_clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  clientId: text("client_id").notNull().unique(),
  clientName: text("client_name"),
  status: text("status").notNull().default("active"),
  onboardedAt: timestamp("onboarded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const dialog360Channels = pgTable("dialog_360_channels", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => dialog360Clients.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  status: text("status").notNull().default("pending"),
  apiKey: text("api_key"),
  webhookUrl: text("webhook_url"),
  qualityRating: text("quality_rating"),
  messagingLimit: integer("messaging_limit").default(250),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const metaWhatsappClients = pgTable("meta_whatsapp_clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  businessAccountId: text("business_account_id").notNull().unique(),
  businessAccountName: text("business_account_name"),
  status: text("status").notNull().default('active'),
  onboardedAt: timestamp("onboarded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const metaWhatsappPhoneNumbers = pgTable("meta_whatsapp_phone_numbers", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => metaWhatsappClients.id, { onDelete: 'cascade' }),
  phoneNumberId: text("phone_number_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  status: text("status").notNull().default('pending'),
  qualityRating: text("quality_rating"),
  messagingLimit: integer("messaging_limit"),
  accessToken: text("access_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  contentId: text("content_id"),
  isInline: boolean("is_inline").default(false),
  filePath: text("file_path").notNull(),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  subject: text("subject").notNull(),
  htmlContent: text("html_content"),
  plainTextContent: text("plain_text_content"),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const emailSignatures = pgTable("email_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  htmlContent: text("html_content"),
  plainTextContent: text("plain_text_content"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const emailConfigs = pgTable("email_configs", {
  id: serial("id").primaryKey(),
  channelConnectionId: integer("channel_connection_id").notNull().references(() => channelConnections.id, { onDelete: 'cascade' }),

  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull().default(993),
  imapSecure: boolean("imap_secure").default(true),
  imapUsername: text("imap_username").notNull(),
  imapPassword: text("imap_password"),

  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(465),
  smtpSecure: boolean("smtp_secure").default(false),
  smtpUsername: text("smtp_username").notNull(),
  smtpPassword: text("smtp_password"),

  oauthProvider: text("oauth_provider"),
  oauthClientId: text("oauth_client_id"),
  oauthClientSecret: text("oauth_client_secret"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthAccessToken: text("oauth_access_token"),
  oauthTokenExpiry: timestamp("oauth_token_expiry"),

  emailAddress: text("email_address").notNull(),
  displayName: text("display_name"),
  signature: text("signature"),
  syncFolder: text("sync_folder").default("INBOX"),
  syncFrequency: integer("sync_frequency").default(60),
  maxSyncMessages: integer("max_sync_messages").default(100),

  status: text("status").notNull().default("active"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  connectionData: jsonb("connection_data"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: jsonb("permissions").default('["messages:send", "channels:read"]'),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  rateLimitPerHour: integer("rate_limit_per_hour").default(1000),
  rateLimitPerDay: integer("rate_limit_per_day").default(10000),
  allowedIps: jsonb("allowed_ips").default('[]'),
  webhookUrl: text("webhook_url"),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  requestSize: integer("request_size"),
  responseSize: integer("response_size"),
  duration: integer("duration"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestId: text("request_id").unique(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow()
});

export const apiRateLimits = pgTable("api_rate_limits", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  windowType: text("window_type").notNull(),
  windowStart: timestamp("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertChannelConnectionSchema = createInsertSchema(channelConnections).pick({
  userId: true,
  companyId: true,
  channelType: true,
  accountId: true,
  accountName: true,
  accessToken: true,
  status: true,
  connectionData: true,
  historySyncEnabled: true,
  historySyncStatus: true,
  historySyncProgress: true,
  historySyncTotal: true,
  lastHistorySyncAt: true,
  historySyncError: true,
  proxyServerId: true,
  proxyEnabled: true,
  proxyType: true,
  proxyHost: true,
  proxyPort: true,
  proxyUsername: true,
  proxyPassword: true,
  proxyTestStatus: true,
  proxyLastTested: true
}).superRefine((data, ctx) => {

  if (data.proxyEnabled === true) {
    if (!data.proxyType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyType'],
        message: 'Proxy type is required when proxy is enabled'
      });
    }
    if (!data.proxyHost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyHost'],
        message: 'Proxy host is required when proxy is enabled'
      });
    }
    if (!data.proxyPort) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyPort'],
        message: 'Proxy port is required when proxy is enabled'
      });
    } else if (data.proxyPort < 1 || data.proxyPort > 65535) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyPort'],
        message: 'Proxy port must be between 1 and 65535'
      });
    }
  }
});

export const insertPartnerConfigurationSchema = createInsertSchema(partnerConfigurations).pick({
  provider: true,
  partnerApiKey: true,
  partnerId: true,
  partnerSecret: true,
  webhookVerifyToken: true,
  accessToken: true,
  configId: true,
  partnerWebhookUrl: true,
  redirectUrl: true,
  publicProfile: true,
  isActive: true
});

export const insertDialog360ClientSchema = createInsertSchema(dialog360Clients).pick({
  companyId: true,
  clientId: true,
  clientName: true,
  status: true,
  onboardedAt: true
});

export const insertDialog360ChannelSchema = createInsertSchema(dialog360Channels).pick({
  clientId: true,
  channelId: true,
  phoneNumber: true,
  displayName: true,
  status: true,
  apiKey: true,
  webhookUrl: true,
  qualityRating: true,
  messagingLimit: true
});

export const insertMetaWhatsappClientSchema = createInsertSchema(metaWhatsappClients).pick({
  companyId: true,
  businessAccountId: true,
  businessAccountName: true,
  status: true,
  onboardedAt: true
});

export const insertMetaWhatsappPhoneNumberSchema = createInsertSchema(metaWhatsappPhoneNumbers).pick({
  clientId: true,
  phoneNumberId: true,
  phoneNumber: true,
  displayName: true,
  status: true,
  qualityRating: true,
  messagingLimit: true,
  accessToken: true
});

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).pick({
  messageId: true,
  filename: true,
  contentType: true,
  size: true,
  contentId: true,
  isInline: true,
  filePath: true,
  downloadUrl: true
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  category: true,
  subject: true,
  htmlContent: true,
  plainTextContent: true,
  variables: true,
  isActive: true
});

export const insertEmailSignatureSchema = createInsertSchema(emailSignatures).pick({
  userId: true,
  companyId: true,
  name: true,
  htmlContent: true,
  plainTextContent: true,
  isDefault: true,
  isActive: true
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).pick({
  channelConnectionId: true,
  imapHost: true,
  imapPort: true,
  imapSecure: true,
  imapUsername: true,
  imapPassword: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUsername: true,
  smtpPassword: true,
  oauthProvider: true,
  oauthClientId: true,
  oauthClientSecret: true,
  oauthRefreshToken: true,
  oauthAccessToken: true,
  oauthTokenExpiry: true,
  emailAddress: true,
  displayName: true,
  signature: true,
  syncFolder: true,
  syncFrequency: true,
  maxSyncMessages: true,
  status: true,
  connectionData: true
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  companyId: true,
  userId: true,
  name: true,
  keyHash: true,
  keyPrefix: true,
  permissions: true,
  isActive: true,
  expiresAt: true,
  rateLimitPerMinute: true,
  rateLimitPerHour: true,
  rateLimitPerDay: true,
  allowedIps: true,
  webhookUrl: true,
  metadata: true
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).pick({
  apiKeyId: true,
  companyId: true,
  endpoint: true,
  method: true,
  statusCode: true,
  requestSize: true,
  responseSize: true,
  duration: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  errorMessage: true,
  metadata: true
});

export const insertApiRateLimitSchema = createInsertSchema(apiRateLimits).pick({
  apiKeyId: true,
  windowType: true,
  windowStart: true,
  requestCount: true
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  isArchived: boolean("is_archived").default(false),
  identifier: text("identifier"),
  identifierType: text("identifier_type"),
  source: text("source"),
  notes: text("notes"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  companyId: true,
  name: true,
  avatarUrl: true,
  email: true,
  phone: true,
  company: true,
  tags: true,
  isActive: true,
  isArchived: true,
  identifier: true,
  identifierType: true,
  source: true,
  notes: true,
  isHistorySync: true,
  historySyncBatchId: true
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id"),
  channelType: text("channel_type").notNull(),
  channelId: integer("channel_id").notNull(),
  status: text("status").default("open"),
  assignedToUserId: integer("assigned_to_user_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  unreadCount: integer("unread_count").default(0),
  botDisabled: boolean("bot_disabled").default(false),
  disabledAt: timestamp("disabled_at"),
  disableDuration: integer("disable_duration"),
  disableReason: text("disable_reason"),

  isGroup: boolean("is_group").default(false),
  groupJid: text("group_jid"),
  groupName: text("group_name"),
  groupDescription: text("group_description"),
  groupParticipantCount: integer("group_participant_count").default(0),
  groupCreatedAt: timestamp("group_created_at"),
  groupMetadata: jsonb("group_metadata"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),


  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  starredAt: timestamp("starred_at"),
  archivedAt: timestamp("archived_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  companyId: true,
  contactId: true,
  channelType: true,
  channelId: true,
  status: true,
  assignedToUserId: true,
  lastMessageAt: true,
  unreadCount: true,
  botDisabled: true,
  disabledAt: true,
  disableDuration: true,
  disableReason: true,
  isGroup: true,
  groupJid: true,
  groupName: true,
  groupDescription: true,
  groupParticipantCount: true,
  groupCreatedAt: true,
  groupMetadata: true,
  isHistorySync: true,
  historySyncBatchId: true,
  isStarred: true,
  isArchived: true,
  starredAt: true,
  archivedAt: true
});

export const groupParticipants = pgTable("group_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").references(() => contacts.id),
  participantJid: text("participant_jid").notNull(),
  participantName: text("participant_name"),
  isAdmin: boolean("is_admin").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertGroupParticipantSchema = createInsertSchema(groupParticipants).pick({
  conversationId: true,
  contactId: true,
  participantJid: true,
  participantName: true,
  isAdmin: true,
  isSuperAdmin: true,
  joinedAt: true,
  leftAt: true,
  isActive: true
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  externalId: text("external_id"),
  direction: text("direction").notNull(),
  type: text("type").default("text"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  senderId: integer("sender_id"),
  senderType: text("sender_type"),
  status: text("status").default("sent"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  isFromBot: boolean("is_from_bot").default(false),
  mediaUrl: text("media_url"),

  groupParticipantJid: text("group_participant_jid"),
  groupParticipantName: text("group_participant_name"),

  emailMessageId: text("email_message_id"),
  emailInReplyTo: text("email_in_reply_to"),
  emailReferences: text("email_references"),
  emailSubject: text("email_subject"),
  emailFrom: text("email_from"),
  emailTo: text("email_to"),
  emailCc: text("email_cc"),
  emailBcc: text("email_bcc"),
  emailHtml: text("email_html"),
  emailPlainText: text("email_plain_text"),
  emailHeaders: jsonb("email_headers"),

  isHistorySync: boolean("is_history_sync").default(false),
  historySyncBatchId: text("history_sync_batch_id"),

  createdAt: timestamp("created_at").defaultNow()
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  externalId: true,
  direction: true,
  type: true,
  content: true,
  metadata: true,
  senderId: true,
  senderType: true,
  status: true,
  sentAt: true,
  readAt: true,
  isFromBot: true,
  mediaUrl: true,
  groupParticipantJid: true,
  groupParticipantName: true,
  isHistorySync: true,
  historySyncBatchId: true,
  createdAt: true
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  userId: integer("created_by_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  contactId: true,
  userId: true,
  content: true
});


export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  channelId: integer("channel_id").references(() => channelConnections.id),
  contactId: integer("contact_id").references(() => contacts.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  direction: text("direction"), // 'inbound' | 'outbound'
  status: text("status"), // 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'
  from: text("from"),
  to: text("to"),
  durationSec: integer("duration_sec"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  twilioCallSid: text("twilio_call_sid"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChannelConnection = typeof channelConnections.$inferSelect;
export type InsertChannelConnection = z.infer<typeof insertChannelConnectionSchema>;

export type PartnerConfiguration = typeof partnerConfigurations.$inferSelect;
export type InsertPartnerConfiguration = z.infer<typeof insertPartnerConfigurationSchema>;

export type Dialog360Client = typeof dialog360Clients.$inferSelect;
export type InsertDialog360Client = z.infer<typeof insertDialog360ClientSchema>;

export type Dialog360Channel = typeof dialog360Channels.$inferSelect;
export type InsertDialog360Channel = z.infer<typeof insertDialog360ChannelSchema>;

export type MetaWhatsappClient = typeof metaWhatsappClients.$inferSelect;
export type InsertMetaWhatsappClient = z.infer<typeof insertMetaWhatsappClientSchema>;

export type MetaWhatsappPhoneNumber = typeof metaWhatsappPhoneNumbers.$inferSelect;
export type InsertMetaWhatsappPhoneNumber = z.infer<typeof insertMetaWhatsappPhoneNumberSchema>;

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type EmailSignature = typeof emailSignatures.$inferSelect;
export type InsertEmailSignature = z.infer<typeof insertEmailSignatureSchema>;

export type EmailConfig = typeof emailConfigs.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;

export type ApiRateLimit = typeof apiRateLimits.$inferSelect;
export type InsertApiRateLimit = z.infer<typeof insertApiRateLimitSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;


export const contactDocuments = pgTable("contact_documents", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),


  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),


  filePath: text("file_path").notNull(),
  fileUrl: text("file_url").notNull(),


  category: text("category").notNull().default('general'),
  description: text("description"),


  uploadedBy: integer("uploaded_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export type ContactDocument = typeof contactDocuments.$inferSelect;
export type InsertContactDocument = typeof contactDocuments.$inferInsert;


export const contactAppointments = pgTable("contact_appointments", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),


  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),


  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(60),


  type: text("type").notNull().default('meeting'),
  status: text("status", {
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled']
  }).notNull().default('scheduled'),


  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export type ContactAppointment = typeof contactAppointments.$inferSelect;
export type InsertContactAppointment = typeof contactAppointments.$inferInsert;


export const contactTasks = pgTable("contact_tasks", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),


  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ['low', 'medium', 'high', 'urgent']
  }).notNull().default('medium'),
  status: text("status", {
    enum: ['not_started', 'in_progress', 'completed', 'cancelled']
  }).notNull().default('not_started'),


  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),


  assignedTo: text("assigned_to"),
  category: text("category"),
  tags: text("tags").array(),
  backgroundColor: text("background_color").default('#ffffff'),


  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export type ContactTask = typeof contactTasks.$inferSelect;
export type InsertContactTask = typeof contactTasks.$inferInsert;

export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color"),
  icon: text("icon"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export type TaskCategory = typeof taskCategories.$inferSelect;
export type InsertTaskCategory = typeof taskCategories.$inferInsert;


export const contactAuditLogs = pgTable("contact_audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),


  actionType: text("action_type").notNull(),
  actionCategory: text("action_category").notNull().default('contact'),
  description: text("description").notNull(),


  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  metadata: jsonb("metadata"),


  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow()
});

export type ContactAuditLog = typeof contactAuditLogs.$inferSelect;
export type InsertContactAuditLog = typeof contactAuditLogs.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type GroupParticipant = typeof groupParticipants.$inferSelect;
export type InsertGroupParticipant = z.infer<typeof insertGroupParticipantSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type ChannelType = z.infer<typeof channelTypes>;

export const flowNodeTypes = z.enum([
  'start',
  'message',
  'condition',
  'input',
  'api_call',
  'delay',
  'end',
  'attachment',
  'template',
  'contact_property',
  'trigger',
  'image',
  'video',
  'audio',
  'document',
  'wait',
  'whatsapp_interactive_buttons',
  'whatsapp_interactive_list',
  'whatsapp_cta_url',
  'whatsapp_location_request',
  'whatsapp_poll',
  'whatsapp_flows',
  'follow_up',
  'translation',
  'webhook',
  'http_request',
  'shopify',
  'woocommerce',
  'typebot',
  'flowise',
  'n8n',
  'google_sheets',
  'data_capture',
  'bot_disable',
  'bot_reset'
]);

export const flowStatusTypes = z.enum([
  'draft',
  'active',
  'inactive',
  'archived'
]);

export const flows = pgTable("flows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ['draft', 'active', 'inactive', 'archived'] }).notNull().default('draft'),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFlowSchema = createInsertSchema(flows).pick({
  userId: true,
  companyId: true,
  name: true,
  description: true,
  status: true,
  nodes: true,
  edges: true,
  version: true,
});

export const flowAssignments = pgTable("flow_assignments", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  channelId: integer("channel_id").notNull().references(() => channelConnections.id),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowSessions = pgTable("flow_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  status: text("status", { enum: ['active', 'waiting', 'paused', 'completed', 'failed', 'abandoned', 'timeout'] }).notNull().default('active'),

  currentNodeId: text("current_node_id"),
  triggerNodeId: text("trigger_node_id").notNull(),
  executionPath: jsonb("execution_path").notNull().default([]),
  branchingHistory: jsonb("branching_history").notNull().default([]),

  sessionData: jsonb("session_data").notNull().default({}),
  nodeStates: jsonb("node_states").notNull().default({}),
  waitingContext: jsonb("waiting_context"),

  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),

  totalDurationMs: integer("total_duration_ms"),
  nodeExecutionCount: integer("node_execution_count").default(0),
  userInteractionCount: integer("user_interaction_count").default(0),
  errorCount: integer("error_count").default(0),
  lastErrorMessage: text("last_error_message"),

  checkpointData: jsonb("checkpoint_data"),
  debugInfo: jsonb("debug_info"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowExecutions = pgTable("flow_executions", {
  id: serial("id").primaryKey(),
  executionId: text("execution_id").notNull().unique(),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  status: text("status", { enum: ['running', 'waiting', 'completed', 'failed', 'abandoned'] }).notNull().default('running'),
  triggerNodeId: text("trigger_node_id").notNull(),
  currentNodeId: text("current_node_id"),
  executionPath: jsonb("execution_path").notNull().default([]),
  contextData: jsonb("context_data").notNull().default({}),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  totalDurationMs: integer("total_duration_ms"),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowSessionVariables = pgTable("flow_session_variables", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => flowSessions.sessionId),
  variableKey: text("variable_key").notNull(),
  variableValue: jsonb("variable_value").notNull(),
  variableType: text("variable_type", { enum: ['string', 'number', 'boolean', 'object', 'array'] }).notNull().default('string'),
  scope: text("scope", { enum: ['global', 'flow', 'node', 'user', 'session'] }).notNull().default('session'),
  nodeId: text("node_id"),
  isEncrypted: boolean("is_encrypted").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowSessionCursors = pgTable("flow_session_cursors", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => flowSessions.sessionId),
  currentNodeId: text("current_node_id").notNull(),
  previousNodeId: text("previous_node_id"),
  nextPossibleNodes: jsonb("next_possible_nodes").notNull().default([]),
  branchConditions: jsonb("branch_conditions").notNull().default({}),
  loopState: jsonb("loop_state"),
  waitingForInput: boolean("waiting_for_input").default(false),
  inputExpectedType: text("input_expected_type"),
  inputValidationRules: jsonb("input_validation_rules"),
  timeoutAt: timestamp("timeout_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const flowStepExecutions = pgTable("flow_step_executions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => flowSessions.sessionId),
  flowExecutionId: integer("flow_execution_id").references(() => flowExecutions.id),
  nodeId: text("node_id").notNull(),
  nodeType: text("node_type").notNull(),
  stepOrder: integer("step_order").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  status: text("status", { enum: ['running', 'completed', 'failed', 'skipped', 'waiting', 'timeout'] }).notNull().default('running'),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertFlowAssignmentSchema = createInsertSchema(flowAssignments).pick({
  flowId: true,
  channelId: true,
  isActive: true,
});

export const insertFlowSessionSchema = createInsertSchema(flowSessions).pick({
  sessionId: true,
  flowId: true,
  conversationId: true,
  contactId: true,
  companyId: true,
  status: true,
  currentNodeId: true,
  triggerNodeId: true,
  executionPath: true,
  branchingHistory: true,
  sessionData: true,
  nodeStates: true,
  waitingContext: true,
  expiresAt: true
});

export const insertFlowSessionVariableSchema = createInsertSchema(flowSessionVariables).pick({
  sessionId: true,
  variableKey: true,
  variableValue: true,
  variableType: true,
  scope: true,
  nodeId: true,
  isEncrypted: true,
  expiresAt: true
});

export const insertFlowSessionCursorSchema = createInsertSchema(flowSessionCursors).pick({
  sessionId: true,
  currentNodeId: true,
  previousNodeId: true,
  nextPossibleNodes: true,
  branchConditions: true,
  loopState: true,
  waitingForInput: true,
  inputExpectedType: true,
  inputValidationRules: true,
  timeoutAt: true
});

export type Flow = typeof flows.$inferSelect;
export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type FlowAssignment = typeof flowAssignments.$inferSelect;
export type InsertFlowAssignment = z.infer<typeof insertFlowAssignmentSchema>;
export type FlowNodeType = z.infer<typeof flowNodeTypes>;
export type FlowStatus = z.infer<typeof flowStatusTypes>;

export type FlowSession = typeof flowSessions.$inferSelect;
export type InsertFlowSession = z.infer<typeof insertFlowSessionSchema>;
export type FlowSessionVariable = typeof flowSessionVariables.$inferSelect;
export type InsertFlowSessionVariable = z.infer<typeof insertFlowSessionVariableSchema>;
export type FlowSessionCursor = typeof flowSessionCursors.$inferSelect;
export type InsertFlowSessionCursor = z.infer<typeof insertFlowSessionCursorSchema>;

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type FlowStepExecution = typeof flowStepExecutions.$inferSelect;

export type FollowUpSchedule = typeof followUpSchedules.$inferSelect;
export type InsertFollowUpSchedule = z.infer<typeof insertFollowUpScheduleSchema>;
export type FollowUpTemplate = typeof followUpTemplates.$inferSelect;
export type InsertFollowUpTemplate = z.infer<typeof insertFollowUpTemplateSchema>;
export type FollowUpExecutionLog = typeof followUpExecutionLog.$inferSelect;
export type InsertFollowUpExecutionLog = z.infer<typeof insertFollowUpExecutionLogSchema>;



export const followUpSchedules = pgTable("follow_up_schedules", {
  id: serial("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().unique(),
  sessionId: text("session_id").references(() => flowSessions.sessionId),
  flowId: integer("flow_id").notNull().references(() => flows.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  nodeId: text("node_id").notNull(),

  messageType: text("message_type", {
    enum: ['text', 'image', 'video', 'audio', 'document', 'reaction']
  }).notNull().default('text'),
  messageContent: text("message_content"),
  mediaUrl: text("media_url"),
  caption: text("caption"),
  templateId: integer("template_id"),

  triggerEvent: text("trigger_event", {
    enum: ['conversation_start', 'node_execution', 'specific_datetime', 'relative_delay']
  }).notNull().default('conversation_start'),
  triggerNodeId: text("trigger_node_id"),
  delayAmount: integer("delay_amount"),
  delayUnit: text("delay_unit", { enum: ['minutes', 'hours', 'days', 'weeks'] }),
  scheduledFor: timestamp("scheduled_for"),
  specificDatetime: timestamp("specific_datetime"),
  timezone: text("timezone").default('UTC'),

  status: text("status", {
    enum: ['scheduled', 'sent', 'failed', 'cancelled', 'expired']
  }).notNull().default('scheduled'),
  sentAt: timestamp("sent_at"),
  failedReason: text("failed_reason"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),

  channelType: text("channel_type").notNull(),
  channelConnectionId: integer("channel_connection_id").references(() => channelConnections.id),

  variables: jsonb("variables").default({}),
  executionContext: jsonb("execution_context").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at")
});

export const followUpTemplates = pgTable("follow_up_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  messageType: text("message_type", {
    enum: ['text', 'image', 'video', 'audio', 'document', 'reaction']
  }).notNull().default('text'),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  caption: text("caption"),
  defaultDelayAmount: integer("default_delay_amount").default(24),
  defaultDelayUnit: text("default_delay_unit", { enum: ['minutes', 'hours', 'days', 'weeks'] }).default('hours'),
  variables: jsonb("variables").default([]),
  category: text("category").default('general'),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyName: unique().on(table.companyId, table.name)
}));

export const followUpExecutionLog = pgTable("follow_up_execution_log", {
  id: serial("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => followUpSchedules.scheduleId),
  executionAttempt: integer("execution_attempt").notNull().default(1),
  status: text("status", { enum: ['success', 'failed', 'retry'] }).notNull(),
  messageId: text("message_id"),
  errorMessage: text("error_message"),
  executionDurationMs: integer("execution_duration_ms"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),

  responseReceived: boolean("response_received").default(false),
  responseAt: timestamp("response_at"),
  responseContent: text("response_content")
});

export const insertFollowUpScheduleSchema = createInsertSchema(followUpSchedules).pick({
  scheduleId: true,
  sessionId: true,
  flowId: true,
  conversationId: true,
  contactId: true,
  companyId: true,
  nodeId: true,
  messageType: true,
  messageContent: true,
  mediaUrl: true,
  caption: true,
  templateId: true,
  triggerEvent: true,
  triggerNodeId: true,
  delayAmount: true,
  delayUnit: true,
  scheduledFor: true,
  specificDatetime: true,
  timezone: true,
  status: true,
  maxRetries: true,
  channelType: true,
  channelConnectionId: true,
  variables: true,
  executionContext: true,
  expiresAt: true
});

export const insertFollowUpTemplateSchema = createInsertSchema(followUpTemplates).pick({
  companyId: true,
  name: true,
  description: true,
  messageType: true,
  content: true,
  mediaUrl: true,
  caption: true,
  defaultDelayAmount: true,
  defaultDelayUnit: true,
  variables: true,
  category: true,
  isActive: true,
  createdBy: true
});

export const insertFollowUpExecutionLogSchema = createInsertSchema(followUpExecutionLog).pick({
  scheduleId: true,
  executionAttempt: true,
  status: true,
  messageId: true,
  errorMessage: true,
  executionDurationMs: true,
  responseReceived: true,
  responseAt: true,
  responseContent: true
});

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  tokenType: text("token_type"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertGoogleCalendarTokenSchema = createInsertSchema(googleCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  idToken: true,
  tokenType: true,
  expiryDate: true,
  scope: true
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = z.infer<typeof insertGoogleCalendarTokenSchema>;

export const zohoCalendarTokens = pgTable("zoho_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiresIn: integer("expires_in"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertZohoCalendarTokenSchema = createInsertSchema(zohoCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  tokenType: true,
  expiresIn: true,
  scope: true
});

export type ZohoCalendarToken = typeof zohoCalendarTokens.$inferSelect;
export type InsertZohoCalendarToken = z.infer<typeof insertZohoCalendarTokenSchema>;

export const calendlyCalendarTokens = pgTable("calendly_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiresIn: integer("expires_in"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCalendlyCalendarTokenSchema = createInsertSchema(calendlyCalendarTokens).pick({
  userId: true,
  companyId: true,
  accessToken: true,
  refreshToken: true,
  tokenType: true,
  expiresIn: true,
  scope: true
});

export type CalendlyCalendarToken = typeof calendlyCalendarTokens.$inferSelect;
export type InsertCalendlyCalendarToken = z.infer<typeof insertCalendlyCalendarTokenSchema>;

const calendarNodeTypes = ['google_calendar_event', 'google_calendar_availability'] as const;
const aiNodeTypes = ['ai_assistant'] as const;
const pipelineNodeTypes = ['update_pipeline_stage'] as const;
export const updatedFlowNodeTypes = [
  ...flowNodeTypes.options,
  ...calendarNodeTypes,
  ...aiNodeTypes,
  ...pipelineNodeTypes
];
export const extendedFlowNodeTypes = z.enum(updatedFlowNodeTypes as [string, ...string[]]);
export type ExtendedFlowNodeType = z.infer<typeof extendedFlowNodeTypes>;

export const invitationStatusTypes = z.enum([
  'pending',
  'accepted',
  'expired',
  'revoked'
]);

export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  invitedByUserId: integer("invited_by_user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  role: text("role").notNull().default("agent"),
  token: text("token").notNull().unique(),
  status: text("status", { enum: ['pending', 'accepted', 'expired', 'revoked'] }).notNull().default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).pick({
  email: true,
  invitedByUserId: true,
  companyId: true,
  role: true,
  token: true,
  status: true,
  expiresAt: true
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusTypes>;

export const dealStatusTypes = z.enum([
  'lead',
  'qualified',
  'contacted',
  'demo_scheduled',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
]);

export const dealPriorityTypes = z.enum([
  'low',
  'medium',
  'high'
]);

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  order: integer("order_num").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).pick({
  companyId: true,
  name: true,
  color: true,
  order: true
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUsers: integer("max_users").notNull().default(5),
  maxContacts: integer("max_contacts").notNull().default(1000),
  maxChannels: integer("max_channels").notNull().default(3),
  maxFlows: integer("max_flows").notNull().default(1),
  maxCampaigns: integer("max_campaigns").notNull().default(5),
  maxCampaignRecipients: integer("max_campaign_recipients").notNull().default(1000),
  campaignFeatures: jsonb("campaign_features").notNull().default(["basic_campaigns"]),
  isActive: boolean("is_active").notNull().default(true),
  isFree: boolean("is_free").notNull().default(false),
  hasTrialPeriod: boolean("has_trial_period").notNull().default(false),
  trialDays: integer("trial_days").default(0),
  features: jsonb("features").notNull().default([]),
  billingInterval: text("billing_interval", { enum: ['lifetime', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'custom'] }).default("monthly"),
  customDurationDays: integer("custom_duration_days"),
  gracePeriodDays: integer("grace_period_days").default(3),
  maxDunningAttempts: integer("max_dunning_attempts").default(3),
  softLimitPercentage: integer("soft_limit_percentage").default(80),
  allowPausing: boolean("allow_pausing").default(true),
  pauseMaxDays: integer("pause_max_days").default(90),
  aiTokensIncluded: integer("ai_tokens_included").default(0),
  aiTokensMonthlyLimit: integer("ai_tokens_monthly_limit"),
  aiTokensDailyLimit: integer("ai_tokens_daily_limit"),
  aiOverageEnabled: boolean("ai_overage_enabled").default(false),
  aiOverageRate: numeric("ai_overage_rate", { precision: 10, scale: 6 }).default("0.000000"),
  aiOverageBlockEnabled: boolean("ai_overage_block_enabled").default(false),
  aiBillingEnabled: boolean("ai_billing_enabled").default(false),

  discountType: text("discount_type", { enum: ['none', 'percentage', 'fixed_amount'] }).default('none'),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).default("0"),
  discountDuration: text("discount_duration", { enum: ['permanent', 'first_month', 'first_year', 'limited_time'] }).default('permanent'),
  discountStartDate: timestamp("discount_start_date"),
  discountEndDate: timestamp("discount_end_date"),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),


  storageLimit: integer("storage_limit").default(1024), // in MB
  bandwidthLimit: integer("bandwidth_limit").default(10240), // monthly bandwidth in MB
  fileUploadLimit: integer("file_upload_limit").default(25), // max file size per upload in MB
  totalFilesLimit: integer("total_files_limit").default(1000), // max number of files

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const planAiProviderConfigs = pgTable("plan_ai_provider_configs", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  tokensMonthlyLimit: integer("tokens_monthly_limit"),
  tokensDailyLimit: integer("tokens_daily_limit"),

  customPricingEnabled: boolean("custom_pricing_enabled").default(false),
  inputTokenRate: numeric("input_token_rate", { precision: 10, scale: 8 }),
  outputTokenRate: numeric("output_token_rate", { precision: 10, scale: 8 }),

  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0),

  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueProviderPerPlan: unique().on(table.planId, table.provider)
}));

export const planAiUsageTracking = pgTable("plan_ai_usage_tracking", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  tokensUsedMonthly: integer("tokens_used_monthly").default(0),
  tokensUsedDaily: integer("tokens_used_daily").default(0),
  requestsMonthly: integer("requests_monthly").default(0),
  requestsDaily: integer("requests_daily").default(0),
  costMonthly: numeric("cost_monthly", { precision: 10, scale: 6 }).default("0.000000"),
  costDaily: numeric("cost_daily", { precision: 10, scale: 6 }).default("0.000000"),

  overageTokensMonthly: integer("overage_tokens_monthly").default(0),
  overageCostMonthly: numeric("overage_cost_monthly", { precision: 10, scale: 6 }).default("0.000000"),

  usageMonth: integer("usage_month").notNull(),
  usageYear: integer("usage_year").notNull(),
  usageDate: date("usage_date").notNull(),

  monthlyLimitReached: boolean("monthly_limit_reached").default(false),
  dailyLimitReached: boolean("daily_limit_reached").default(false),
  monthlyWarningSent: boolean("monthly_warning_sent").default(false),
  dailyWarningSent: boolean("daily_warning_sent").default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueTrackingPeriod: unique().on(table.companyId, table.planId, table.provider, table.usageYear, table.usageMonth, table.usageDate)
}));

export const planAiBillingEvents = pgTable("plan_ai_billing_events", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),

  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull().default('{}'),

  tokensConsumed: integer("tokens_consumed").default(0),
  costAmount: numeric("cost_amount", { precision: 10, scale: 6 }).default("0.000000"),
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),

  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  metadata: jsonb("metadata").default('{}')
});

export const insertPlanSchema = createInsertSchema(plans).pick({
  name: true,
  description: true,
  price: true,
  maxUsers: true,
  maxContacts: true,
  maxChannels: true,
  maxFlows: true,
  maxCampaigns: true,
  maxCampaignRecipients: true,
  campaignFeatures: true,
  isActive: true,
  isFree: true,
  hasTrialPeriod: true,
  trialDays: true,
  features: true,
  billingInterval: true,
  customDurationDays: true,
  gracePeriodDays: true,
  maxDunningAttempts: true,
  softLimitPercentage: true,
  allowPausing: true,
  pauseMaxDays: true,
  aiTokensIncluded: true,
  aiTokensMonthlyLimit: true,
  aiTokensDailyLimit: true,
  aiOverageEnabled: true,
  aiOverageRate: true,
  aiOverageBlockEnabled: true,
  aiBillingEnabled: true,
  discountType: true,
  discountValue: true,
  discountDuration: true,
  discountStartDate: true,
  discountEndDate: true,
  originalPrice: true,
  storageLimit: true,
  bandwidthLimit: true,
  fileUploadLimit: true,
  totalFilesLimit: true
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).pick({
  key: true,
  value: true
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const companySettingsUniqueIndex = unique("company_settings_company_key_unique").on(companySettings.companyId, companySettings.key);

export const insertCompanySettingsSchema = createInsertSchema(companySettings).pick({
  companyId: true,
  key: true,
  value: true
});

export const insertWhatsappProxyServerSchema = createInsertSchema(whatsappProxyServers).pick({
  companyId: true,
  name: true,
  enabled: true,
  type: true,
  host: true,
  port: true,
  username: true,
  password: true,
  testStatus: true,
  lastTested: true,
  description: true
});

export type WhatsappProxyServer = typeof whatsappProxyServers.$inferSelect;
export type InsertWhatsappProxyServer = z.infer<typeof insertWhatsappProxyServerSchema>;

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  flagIcon: text("flag_icon"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  direction: text("direction").default("ltr"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertLanguageSchema = createInsertSchema(languages).pick({
  code: true,
  name: true,
  nativeName: true,
  flagIcon: true,
  isActive: true,
  isDefault: true,
  direction: true
});

export const translationNamespaces = pgTable("translation_namespaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertNamespaceSchema = createInsertSchema(translationNamespaces).pick({
  name: true,
  description: true
});

export const translationKeys = pgTable("translation_keys", {
  id: serial("id").primaryKey(),
  namespaceId: integer("namespace_id").references(() => translationNamespaces.id),
  key: text("key").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertKeySchema = createInsertSchema(translationKeys).pick({
  namespaceId: true,
  key: true,
  description: true
});

export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => translationKeys.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTranslationSchema = createInsertSchema(translations).pick({
  keyId: true,
  languageId: true,
  value: true
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  planId: integer("plan_id").references(() => plans.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] }).notNull().default('pending'),
  paymentMethod: text("payment_method", { enum: ['stripe', 'mercadopago', 'paypal', 'moyasar', 'mpesa', 'bank_transfer', 'other'] }).notNull(),
  paymentIntentId: text("payment_intent_id"),
  externalTransactionId: text("external_transaction_id"),
  receiptUrl: text("receipt_url"),
  metadata: jsonb("metadata"),
  isRecurring: boolean("is_recurring").default(false),
  subscriptionPeriodStart: timestamp("subscription_period_start"),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  prorationAmount: numeric("proration_amount", { precision: 10, scale: 2 }).default("0"),
  dunningAttempt: integer("dunning_attempt").default(0),

  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  couponCodeId: integer("coupon_code_id").references(() => couponCodes.id, { onDelete: "set null" }),
  affiliateCreditApplied: numeric("affiliate_credit_applied", { precision: 10, scale: 2 }).default("0"),
  discountDetails: jsonb("discount_details").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).pick({
  companyId: true,
  planId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paymentIntentId: true,
  externalTransactionId: true,
  receiptUrl: true,
  metadata: true,
  isRecurring: true,
  subscriptionPeriodStart: true,
  subscriptionPeriodEnd: true,
  prorationAmount: true,
  dunningAttempt: true,
  originalAmount: true,
  discountAmount: true,
  couponCodeId: true,
  affiliateCreditApplied: true,
  discountDetails: true
});



export const affiliateStatusEnum = pgEnum("affiliate_status", ["pending", "active", "suspended", "rejected"]);
export const affiliateApplicationStatusEnum = pgEnum("affiliate_application_status", ["pending", "approved", "rejected", "under_review"]);
export const commissionTypeEnum = pgEnum("commission_type", ["percentage", "fixed", "tiered"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "converted", "expired", "cancelled"]);

export const affiliateApplications = pgTable("affiliate_applications", {
  id: serial("id").primaryKey(),


  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),


  company: text("company"),
  website: text("website"),
  country: text("country").notNull(),


  marketingChannels: text("marketing_channels").array().notNull(),
  expectedMonthlyReferrals: text("expected_monthly_referrals").notNull(),
  experience: text("experience").notNull(),
  motivation: text("motivation").notNull(),


  status: affiliateApplicationStatusEnum("status").notNull().default("pending"),
  agreeToTerms: boolean("agree_to_terms").notNull().default(false),


  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),


  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),


  affiliateCode: text("affiliate_code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),


  status: affiliateStatusEnum("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),


  defaultCommissionRate: numeric("default_commission_rate", { precision: 5, scale: 2 }).default("0.00"),
  commissionType: commissionTypeEnum("commission_type").default("percentage"),


  businessName: text("business_name"),
  taxId: text("tax_id"),
  address: jsonb("address"),


  paymentDetails: jsonb("payment_details"),


  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  totalEarnings: numeric("total_earnings", { precision: 12, scale: 2 }).default("0.00"),
  pendingEarnings: numeric("pending_earnings", { precision: 12, scale: 2 }).default("0.00"),
  paidEarnings: numeric("paid_earnings", { precision: 12, scale: 2 }).default("0.00"),


  notes: text("notes"),
  metadata: jsonb("metadata").default('{}'),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliateCommissionStructures = pgTable("affiliate_commission_structures", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  planId: integer("plan_id").references(() => plans.id, { onDelete: "cascade" }),


  name: text("name").notNull(),
  commissionType: commissionTypeEnum("commission_type").notNull().default("percentage"),
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).notNull(),


  tierRules: jsonb("tier_rules"),


  minimumPayout: numeric("minimum_payout", { precision: 10, scale: 2 }).default("0.00"),
  maximumPayout: numeric("maximum_payout", { precision: 10, scale: 2 }),
  recurringCommission: boolean("recurring_commission").default(false),
  recurringMonths: integer("recurring_months").default(0),


  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  referralCode: text("referral_code").notNull(),
  referredCompanyId: integer("referred_company_id").references(() => companies.id, { onDelete: "set null" }),
  referredUserId: integer("referred_user_id").references(() => users.id, { onDelete: "set null" }),
  referredEmail: text("referred_email"),


  status: referralStatusEnum("status").notNull().default("pending"),
  convertedAt: timestamp("converted_at"),
  conversionValue: numeric("conversion_value", { precision: 12, scale: 2 }).default("0.00"),


  commissionStructureId: integer("commission_structure_id").references(() => affiliateCommissionStructures.id, { onDelete: "set null" }),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).default("0.00"),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("0.00"),


  sourceUrl: text("source_url"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),


  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),


  expiresAt: timestamp("expires_at"),


  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: payoutStatusEnum("status").notNull().default("pending"),


  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  externalTransactionId: text("external_transaction_id"),


  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),


  processedBy: integer("processed_by").references(() => users.id, { onDelete: "set null" }),
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),


  referralIds: integer("referral_ids").array(),


  notes: text("notes"),
  metadata: jsonb("metadata").default('{}'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliateAnalytics = pgTable("affiliate_analytics", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  date: date("date").notNull(),
  periodType: text("period_type").notNull().default("daily"),


  clicks: integer("clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  impressions: integer("impressions").default(0),


  referrals: integer("referrals").default(0),
  conversions: integer("conversions").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),


  revenue: numeric("revenue", { precision: 12, scale: 2 }).default("0.00"),
  commissionEarned: numeric("commission_earned", { precision: 12, scale: 2 }).default("0.00"),
  averageOrderValue: numeric("average_order_value", { precision: 10, scale: 2 }).default("0.00"),


  topCountries: jsonb("top_countries").default('[]'),


  topSources: jsonb("top_sources").default('[]'),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  referralId: integer("referral_id").references(() => affiliateReferrals.id, { onDelete: "set null" }),


  clickedUrl: text("clicked_url").notNull(),
  landingPage: text("landing_page"),


  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  city: text("city"),


  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),


  referrerUrl: text("referrer_url"),
  referrerDomain: text("referrer_domain"),


  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),


  converted: boolean("converted").default(false),
  convertedAt: timestamp("converted_at"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const affiliateRelationships = pgTable("affiliate_relationships", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  parentAffiliateId: integer("parent_affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),
  childAffiliateId: integer("child_affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  level: integer("level").notNull().default(1),
  commissionPercentage: numeric("commission_percentage", { precision: 5, scale: 2 }).default("0.00"),


  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});


export const insertAffiliateApplicationSchema = createInsertSchema(affiliateApplications).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  website: true,
  country: true,
  marketingChannels: true,
  expectedMonthlyReferrals: true,
  experience: true,
  motivation: true,
  status: true,
  agreeToTerms: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  rejectionReason: true,
  submittedAt: true
});

export const insertAffiliateSchema = createInsertSchema(affiliates).pick({
  companyId: true,
  userId: true,
  affiliateCode: true,
  name: true,
  email: true,
  phone: true,
  website: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  defaultCommissionRate: true,
  commissionType: true,
  businessName: true,
  taxId: true,
  address: true,
  paymentDetails: true,
  notes: true,
  metadata: true,
  isActive: true
});

export const insertAffiliateCommissionStructureSchema = createInsertSchema(affiliateCommissionStructures).pick({
  companyId: true,
  affiliateId: true,
  planId: true,
  name: true,
  commissionType: true,
  commissionValue: true,
  tierRules: true,
  minimumPayout: true,
  maximumPayout: true,
  recurringCommission: true,
  recurringMonths: true,
  validFrom: true,
  validUntil: true,
  isActive: true
});

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).pick({
  companyId: true,
  affiliateId: true,
  referralCode: true,
  referredCompanyId: true,
  referredUserId: true,
  referredEmail: true,
  status: true,
  convertedAt: true,
  conversionValue: true,
  commissionStructureId: true,
  commissionAmount: true,
  commissionRate: true,
  sourceUrl: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  userAgent: true,
  ipAddress: true,
  countryCode: true,
  expiresAt: true,
  metadata: true
});

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).pick({
  companyId: true,
  affiliateId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paymentReference: true,
  externalTransactionId: true,
  periodStart: true,
  periodEnd: true,
  processedBy: true,
  processedAt: true,
  failureReason: true,
  referralIds: true,
  notes: true,
  metadata: true
});

export const insertAffiliateAnalyticsSchema = createInsertSchema(affiliateAnalytics).pick({
  affiliateId: true,
  date: true,
  periodType: true,
  clicks: true,
  uniqueClicks: true,
  impressions: true,
  referrals: true,
  conversions: true,
  conversionRate: true,
  revenue: true,
  commissionEarned: true,
  averageOrderValue: true,
  topCountries: true,
  topSources: true
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).pick({
  companyId: true,
  affiliateId: true,
  referralId: true,
  clickedUrl: true,
  landingPage: true,
  sessionId: true,
  userAgent: true,
  ipAddress: true,
  countryCode: true,
  city: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  referrerUrl: true,
  referrerDomain: true,
  deviceType: true,
  browser: true,
  os: true,
  converted: true,
  convertedAt: true
});

export const insertAffiliateRelationshipSchema = createInsertSchema(affiliateRelationships).pick({
  companyId: true,
  parentAffiliateId: true,
  childAffiliateId: true,
  level: true,
  commissionPercentage: true,
  isActive: true
});

export type AffiliateRelationship = typeof affiliateRelationships.$inferSelect;
export type InsertAffiliateRelationship = z.infer<typeof insertAffiliateRelationshipSchema>;


export const couponCodes = pgTable("coupon_codes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }), // NULL for global coupons


  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),


  discountType: text("discount_type", { enum: ['percentage', 'fixed_amount'] }).notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),


  usageLimit: integer("usage_limit"), // NULL for unlimited
  usageLimitPerUser: integer("usage_limit_per_user").default(1),
  currentUsageCount: integer("current_usage_count").default(0),


  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),


  applicablePlanIds: integer("applicable_plan_ids").array(), // NULL for all plans
  minimumPlanValue: numeric("minimum_plan_value", { precision: 10, scale: 2 }), // Minimum plan price to apply coupon


  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCouponCodeSchema = createInsertSchema(couponCodes).pick({
  companyId: true,
  code: true,
  name: true,
  description: true,
  discountType: true,
  discountValue: true,
  usageLimit: true,
  usageLimitPerUser: true,
  startDate: true,
  endDate: true,
  applicablePlanIds: true,
  minimumPlanValue: true,
  isActive: true,
  createdBy: true,
  metadata: true
});

export type CouponCode = typeof couponCodes.$inferSelect;
export type InsertCouponCode = z.infer<typeof insertCouponCodeSchema>;

export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => couponCodes.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),


  planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
  originalAmount: numeric("original_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),


  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id, { onDelete: "set null" }),


  usageContext: jsonb("usage_context").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertCouponUsageSchema = createInsertSchema(couponUsage).pick({
  couponId: true,
  companyId: true,
  userId: true,
  planId: true,
  originalAmount: true,
  discountAmount: true,
  finalAmount: true,
  paymentTransactionId: true,
  usageContext: true
});

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;


export const affiliateEarningsBalance = pgTable("affiliate_earnings_balance", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  totalEarned: numeric("total_earned", { precision: 12, scale: 2 }).default("0.00"),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }).default("0.00"), // Available for plan credits
  appliedToPlans: numeric("applied_to_plans", { precision: 12, scale: 2 }).default("0.00"), // Used for plan purchases
  pendingPayout: numeric("pending_payout", { precision: 12, scale: 2 }).default("0.00"), // Scheduled for payout
  paidOut: numeric("paid_out", { precision: 12, scale: 2 }).default("0.00"), // Already paid out


  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyAffiliate: unique().on(table.companyId, table.affiliateId)
}));

export const insertAffiliateEarningsBalanceSchema = createInsertSchema(affiliateEarningsBalance).pick({
  companyId: true,
  affiliateId: true,
  totalEarned: true,
  availableBalance: true,
  appliedToPlans: true,
  pendingPayout: true,
  paidOut: true
});

export type AffiliateEarningsBalance = typeof affiliateEarningsBalance.$inferSelect;
export type InsertAffiliateEarningsBalance = z.infer<typeof insertAffiliateEarningsBalanceSchema>;

export const affiliateEarningsTransactions = pgTable("affiliate_earnings_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  affiliateId: integer("affiliate_id").references(() => affiliates.id, { onDelete: "cascade" }),


  transactionType: text("transaction_type", { enum: ['earned', 'applied_to_plan', 'payout', 'adjustment'] }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),


  referralId: integer("referral_id").references(() => affiliateReferrals.id, { onDelete: "set null" }),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id, { onDelete: "set null" }),
  payoutId: integer("payout_id").references(() => affiliatePayouts.id, { onDelete: "set null" }),


  description: text("description"),
  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertAffiliateEarningsTransactionSchema = createInsertSchema(affiliateEarningsTransactions).pick({
  companyId: true,
  affiliateId: true,
  transactionType: true,
  amount: true,
  balanceAfter: true,
  referralId: true,
  paymentTransactionId: true,
  payoutId: true,
  description: true,
  metadata: true
});

export type AffiliateEarningsTransaction = typeof affiliateEarningsTransactions.$inferSelect;
export type InsertAffiliateEarningsTransaction = z.infer<typeof insertAffiliateEarningsTransactionSchema>;

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  title: text("title").notNull(),
  stageId: integer("stage_id").references(() => pipelineStages.id),
  stage: text("stage", {
    enum: ['lead', 'qualified', 'contacted', 'demo_scheduled', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  }).notNull().default('lead'),
  value: integer("value"),
  priority: text("priority", { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: timestamp("due_date"),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  description: text("description"),
  tags: text("tags").array(),
  status: text("status").default('active'),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertDealSchema = createInsertSchema(deals).pick({
  companyId: true,
  contactId: true,
  title: true,
  stageId: true,
  stage: true,
  value: true,
  priority: true,
  dueDate: true,
  assignedToUserId: true,
  description: true,
  tags: true,
  status: true,
  lastActivityAt: true
});

export const dealActivities = pgTable("deal_activities", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertDealActivitySchema = createInsertSchema(dealActivities).pick({
  dealId: true,
  userId: true,
  type: true,
  content: true,
  metadata: true
});

export const updateStatus = pgEnum('update_status', ['pending', 'downloading', 'validating', 'applying', 'completed', 'failed', 'rolled_back']);

export const systemUpdates = pgTable("system_updates", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  releaseNotes: text("release_notes"),
  downloadUrl: text("download_url").notNull(),
  packageHash: text("package_hash"),
  packageSize: integer("package_size"),
  status: updateStatus("status").notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  rollbackData: jsonb("rollback_data"),
  migrationScripts: jsonb("migration_scripts").default('[]'),
  backupPath: text("backup_path"),
  progressPercentage: integer("progress_percentage").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});



export const insertSystemUpdateSchema = createInsertSchema(systemUpdates).pick({
  version: true,
  releaseNotes: true,
  downloadUrl: true,
  packageHash: true,
  packageSize: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  completedAt: true,
  errorMessage: true,
  rollbackData: true,
  migrationScripts: true,
  backupPath: true,
  progressPercentage: true
});



export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type DealActivity = typeof dealActivities.$inferSelect;
export type InsertDealActivity = z.infer<typeof insertDealActivitySchema>;
export type DealStatus = z.infer<typeof dealStatusTypes>;
export type DealPriority = z.infer<typeof dealPriorityTypes>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

export type CompanySetting = typeof companySettings.$inferSelect;
export type InsertCompanySetting = typeof companySettings.$inferInsert;

export type Website = typeof websites.$inferSelect;
export type InsertWebsite = typeof websites.$inferInsert;



export type WebsiteAsset = typeof websiteAssets.$inferSelect;
export type InsertWebsiteAsset = typeof websiteAssets.$inferInsert;

export type SystemUpdate = typeof systemUpdates.$inferSelect;
export type InsertSystemUpdate = z.infer<typeof insertSystemUpdateSchema>;

export type UpdateStatus = typeof updateStatus.enumValues[number];

export const insertPlanAiProviderConfigSchema = createInsertSchema(planAiProviderConfigs).pick({
  planId: true,
  provider: true,
  tokensMonthlyLimit: true,
  tokensDailyLimit: true,
  customPricingEnabled: true,
  inputTokenRate: true,
  outputTokenRate: true,
  enabled: true,
  priority: true,
  metadata: true
});

export const insertPlanAiUsageTrackingSchema = createInsertSchema(planAiUsageTracking).pick({
  companyId: true,
  planId: true,
  provider: true,
  tokensUsedMonthly: true,
  tokensUsedDaily: true,
  requestsMonthly: true,
  requestsDaily: true,
  costMonthly: true,
  costDaily: true,
  overageTokensMonthly: true,
  overageCostMonthly: true,
  usageMonth: true,
  usageYear: true,
  usageDate: true,
  monthlyLimitReached: true,
  dailyLimitReached: true,
  monthlyWarningSent: true,
  dailyWarningSent: true
});

export const insertPlanAiBillingEventSchema = createInsertSchema(planAiBillingEvents).pick({
  companyId: true,
  planId: true,
  provider: true,
  eventType: true,
  eventData: true,
  tokensConsumed: true,
  costAmount: true,
  billingPeriodStart: true,
  billingPeriodEnd: true,
  processed: true,
  processedAt: true,
  metadata: true
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type PlanAiProviderConfig = typeof planAiProviderConfigs.$inferSelect;
export type InsertPlanAiProviderConfig = z.infer<typeof insertPlanAiProviderConfigSchema>;

export type PlanAiUsageTracking = typeof planAiUsageTracking.$inferSelect;
export type InsertPlanAiUsageTracking = z.infer<typeof insertPlanAiUsageTrackingSchema>;

export type PlanAiBillingEvent = typeof planAiBillingEvents.$inferSelect;
export type InsertPlanAiBillingEvent = z.infer<typeof insertPlanAiBillingEventSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type TranslationNamespace = typeof translationNamespaces.$inferSelect;
export type InsertTranslationNamespace = z.infer<typeof insertNamespaceSchema>;

export type TranslationKey = typeof translationKeys.$inferSelect;
export type InsertTranslationKey = z.infer<typeof insertKeySchema>;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type CompanyPage = typeof companyPages.$inferSelect;
export type InsertCompanyPage = typeof companyPages.$inferInsert;


export const campaignStatusTypes = z.enum([
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed'
]);

export const campaignTypes = z.enum([
  'immediate',
  'scheduled',
  'drip'
]);

export const campaignRecipientStatusTypes = z.enum([
  'pending',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped'
]);

export const whatsappConnectionStatusTypes = z.enum([
  'connected',
  'disconnected',
  'connecting',
  'error',
  'banned'
]);

export const campaignTemplates = pgTable("campaign_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  connectionId: integer("connection_id").references(() => channelConnections.id), // WhatsApp connection used for this template
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  whatsappTemplateCategory: text("whatsapp_template_category", { enum: ['marketing', 'utility', 'authentication'] }),
  whatsappTemplateStatus: text("whatsapp_template_status", { enum: ['pending', 'approved', 'rejected', 'disabled'] }).default('pending'),
  whatsappTemplateId: text("whatsapp_template_id"), // WhatsApp Business API template ID
  whatsappTemplateName: text("whatsapp_template_name"), // WhatsApp Business API template name
  whatsappTemplateLanguage: text("whatsapp_template_language").default('en'),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  mediaHandle: text("media_handle"), // WhatsApp media handle for template media (uploaded during template creation)
  variables: jsonb("variables").default([]),
  channelType: text("channel_type").notNull().default("whatsapp"),
  whatsappChannelType: text("whatsapp_channel_type", { enum: ['official', 'unofficial'] }).default('unofficial'),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const quickReplyTemplates = pgTable("quick_reply_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const contactSegments = pgTable("contact_segments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(),
  contactCount: integer("contact_count").default(0),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  templateId: integer("template_id").references(() => campaignTemplates.id),
  segmentId: integer("segment_id").references(() => contactSegments.id),

  name: text("name").notNull(),
  description: text("description"),
  channelType: text("channel_type").notNull().default("whatsapp"),
  whatsappChannelType: text("whatsapp_channel_type", { enum: ['official', 'unofficial'] }).notNull().default('unofficial'),
  channelId: integer("channel_id").references(() => channelConnections.id),
  channelIds: jsonb("channel_ids").default([]),

  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  variables: jsonb("variables").default({}),

  campaignType: text("campaign_type", { enum: ['immediate', 'scheduled', 'drip'] }).notNull().default('immediate'),
  scheduledAt: timestamp("scheduled_at"),
  timezone: text("timezone").default("UTC"),
  dripSettings: jsonb("drip_settings"),

  status: text("status", { enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'] }).notNull().default('draft'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pausedAt: timestamp("paused_at"),

  totalRecipients: integer("total_recipients").default(0),
  processedRecipients: integer("processed_recipients").default(0),
  successfulSends: integer("successful_sends").default(0),
  failedSends: integer("failed_sends").default(0),

  rateLimitSettings: jsonb("rate_limit_settings").default({
    messages_per_minute: 10,
    messages_per_hour: 200,
    messages_per_day: 1000,
    delay_between_messages: 6,
    random_delay_range: [3, 10],
    humanization_enabled: true
  }),

  complianceSettings: jsonb("compliance_settings").default({
    require_opt_out: true,
    spam_check_enabled: true,
    content_filter_enabled: true
  }),

  antiBanSettings: jsonb("anti_ban_settings").default({
    enabled: true,
    mode: "moderate",
    businessHoursOnly: false,
    respectWeekends: false,
    randomizeDelay: true,
    minDelay: 3,
    maxDelay: 15,
    accountRotation: true,
    cooldownPeriod: 30,
    messageVariation: false
  }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const campaignRecipients = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),

  personalizedContent: text("personalized_content"),
  variables: jsonb("variables").default({}),

  status: text("status", { enum: ['pending', 'processing', 'sent', 'delivered', 'read', 'failed', 'skipped'] }).notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),

  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),

  externalMessageId: text("external_message_id"),
  conversationId: integer("conversation_id").references(() => conversations.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCampaignContact: unique().on(table.campaignId, table.contactId)
}));

export const campaignMessages = pgTable("campaign_messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  recipientId: integer("recipient_id").notNull().references(() => campaignRecipients.id),
  messageId: integer("message_id").references(() => messages.id),

  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  messageType: text("message_type").default("text"),

  status: text("status", { enum: ['pending', 'sent', 'delivered', 'read', 'failed'] }).notNull().default('pending'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),

  whatsappMessageId: text("whatsapp_message_id"),
  whatsappStatus: text("whatsapp_status"),

  errorCode: text("error_code"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const campaignAnalytics = pgTable("campaign_analytics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),

  recordedAt: timestamp("recorded_at").notNull().defaultNow(),

  totalRecipients: integer("total_recipients").default(0),
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesRead: integer("messages_read").default(0),
  messagesFailed: integer("messages_failed").default(0),

  deliveryRate: numeric("delivery_rate", { precision: 5, scale: 2 }).default("0.00"),
  readRate: numeric("read_rate", { precision: 5, scale: 2 }).default("0.00"),
  failureRate: numeric("failure_rate", { precision: 5, scale: 2 }).default("0.00"),

  avgDeliveryTime: integer("avg_delivery_time"),
  avgReadTime: integer("avg_read_time"),

  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 4 }).default("0.0000"),

  metricsData: jsonb("metrics_data").default({})
});

export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  channelId: integer("channel_id").references(() => channelConnections.id),

  accountName: text("account_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  accountType: text("account_type", { enum: ['official', 'unofficial'] }).notNull().default('unofficial'),

  sessionData: jsonb("session_data"),
  qrCode: text("qr_code"),
  connectionStatus: text("connection_status", { enum: ['connected', 'disconnected', 'connecting', 'error', 'banned'] }).default('disconnected'),

  lastActivityAt: timestamp("last_activity_at"),
  messageCountToday: integer("message_count_today").default(0),
  messageCountHour: integer("message_count_hour").default(0),
  warningCount: integer("warning_count").default(0),
  restrictionCount: integer("restriction_count").default(0),

  rateLimits: jsonb("rate_limits").default({
    max_messages_per_minute: 10,
    max_messages_per_hour: 200,
    max_messages_per_day: 1000,
    cooldown_period: 300,
    humanization_enabled: true
  }),

  healthScore: integer("health_score").default(100),
  lastHealthCheck: timestamp("last_health_check"),
  isActive: boolean("is_active").default(true),

  rotationGroup: text("rotation_group"),
  priority: integer("priority").default(1),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyPhone: unique().on(table.companyId, table.phoneNumber)
}));

export const whatsappAccountLogs = pgTable("whatsapp_account_logs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => whatsappAccounts.id),

  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  message: text("message"),

  severity: text("severity", { enum: ['info', 'warning', 'error', 'critical'] }).default('info'),

  messagesSentToday: integer("messages_sent_today").default(0),
  healthScore: integer("health_score").default(100),

  createdAt: timestamp("created_at").notNull().defaultNow()
});


export const scheduledMessageStatusEnum = pgEnum('scheduled_message_status', [
  'pending',
  'scheduled',
  'processing',
  'sent',
  'failed',
  'cancelled'
]);


export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  conversationId: integer("conversation_id").notNull(),
  channelId: integer("channel_id").notNull(),
  channelType: text("channel_type").notNull(), // 'whatsapp', 'instagram', 'messenger', 'email', etc.


  content: text("content").notNull(),
  messageType: text("message_type").notNull().default('text'), // 'text', 'media', 'template', etc.
  mediaUrl: text("media_url"),
  mediaFilePath: text("media_file_path"), // Local file path for scheduled media
  mediaType: text("media_type"), // 'image', 'video', 'audio', 'document'
  caption: text("caption"),


  scheduledFor: timestamp("scheduled_for").notNull(),
  timezone: text("timezone").default('UTC'),


  status: scheduledMessageStatusEnum("status").default('pending'),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),


  metadata: jsonb("metadata").default('{}'), // Additional data like quick replies, templates, etc.
  createdBy: integer("created_by").notNull(), // User who scheduled the message
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});


export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type InsertScheduledMessage = typeof scheduledMessages.$inferInsert;

export const campaignQueue = pgTable("campaign_queue", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  recipientId: integer("recipient_id").notNull().references(() => campaignRecipients.id),
  accountId: integer("account_id").references(() => channelConnections.id),

  priority: integer("priority").default(1),
  scheduledFor: timestamp("scheduled_for").notNull(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),

  status: text("status", { enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] }).notNull().default('pending'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  errorMessage: text("error_message"),
  lastErrorAt: timestamp("last_error_at"),

  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCampaignTemplateSchema = createInsertSchema(campaignTemplates).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  category: true,
  content: true,
  mediaUrls: true,
  variables: true,
  channelType: true,
  isActive: true
});

export const insertContactSegmentSchema = createInsertSchema(contactSegments).pick({
  companyId: true,
  createdById: true,
  name: true,
  description: true,
  criteria: true
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  companyId: true,
  createdById: true,
  templateId: true,
  segmentId: true,
  name: true,
  description: true,
  channelType: true,
  channelId: true,
  channelIds: true,
  content: true,
  mediaUrls: true,
  variables: true,
  campaignType: true,
  scheduledAt: true,
  timezone: true,
  dripSettings: true,
  rateLimitSettings: true,
  complianceSettings: true,
  antiBanSettings: true
});

export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).pick({
  campaignId: true,
  contactId: true,
  personalizedContent: true,
  variables: true,
  scheduledAt: true,
  maxRetries: true
});

export const insertWhatsappAccountSchema = createInsertSchema(whatsappAccounts).pick({
  companyId: true,
  channelId: true,
  accountName: true,
  phoneNumber: true,
  accountType: true,
  rateLimits: true,
  rotationGroup: true,
  priority: true
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type InsertCampaignTemplate = z.infer<typeof insertCampaignTemplateSchema>;

export type ContactSegment = typeof contactSegments.$inferSelect;
export type InsertContactSegment = z.infer<typeof insertContactSegmentSchema>;

/**
 * Shared TypeScript type for segment filter criteria.
 * 
 * This type defines the structure of criteria used in contact segments.
 * All fields are optional, allowing flexible filtering combinations.
 * 
 * Fields:
 * - tags: Array of tag strings that contacts must have (AND logic)
 * - created_after: ISO date string for filtering contacts created after this date
 * - created_before: ISO date string for filtering contacts created before this date
 * - excludedContactIds: Array of contact IDs to exclude from the segment
 */
export interface SegmentFilterCriteria {
  tags?: string[];
  created_after?: string;
  created_before?: string;
  excludedContactIds?: number[];
  contactIds?: number[];
  [key: string]: any; // Allow additional fields for extensibility
}

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;

export type CampaignMessage = typeof campaignMessages.$inferSelect;
export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;

export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type InsertWhatsappAccount = z.infer<typeof insertWhatsappAccountSchema>;

export type WhatsappAccountLog = typeof whatsappAccountLogs.$inferSelect;
export type CampaignQueue = typeof campaignQueue.$inferSelect;

export type CampaignStatus = z.infer<typeof campaignStatusTypes>;
export type CampaignType = z.infer<typeof campaignTypes>;
export type CampaignRecipientStatus = z.infer<typeof campaignRecipientStatusTypes>;
export type WhatsappConnectionStatus = z.infer<typeof whatsappConnectionStatusTypes>;

export const socialProviderTypes = z.enum(['google', 'facebook', 'apple']);

export const userSocialAccounts = pgTable("user_social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text("provider", { enum: ['google', 'facebook', 'apple'] }).notNull(),
  providerUserId: text("provider_user_id").notNull(),
  providerEmail: text("provider_email"),
  providerName: text("provider_name"),
  providerAvatarUrl: text("provider_avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  providerData: jsonb("provider_data").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertUserSocialAccountSchema = createInsertSchema(userSocialAccounts).pick({
  userId: true,
  provider: true,
  providerUserId: true,
  providerEmail: true,
  providerName: true,
  providerAvatarUrl: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiresAt: true,
  providerData: true
});

export type UserSocialAccount = typeof userSocialAccounts.$inferSelect;
export type InsertUserSocialAccount = z.infer<typeof insertUserSocialAccountSchema>;
export type SocialProvider = z.infer<typeof socialProviderTypes>;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;


export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull().default('{}'),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  triggeredBy: text("triggered_by"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const websites = pgTable("websites", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),

  grapesData: jsonb("grapes_data").notNull().default('{}'),
  grapesHtml: text("grapes_html"),
  grapesCss: text("grapes_css"),
  grapesJs: text("grapes_js"),

  favicon: text("favicon"),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  customHead: text("custom_head"),

  status: text("status", {
    enum: ['draft', 'published', 'archived']
  }).notNull().default('draft'),
  publishedAt: timestamp("published_at"),

  googleAnalyticsId: text("google_analytics_id"),
  facebookPixelId: text("facebook_pixel_id"),

  theme: text("theme").default('default'),

  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});



export const websiteAssets = pgTable("website_assets", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").notNull().references(() => websites.id, { onDelete: 'cascade' }),

  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),

  path: text("path").notNull(),
  url: text("url").notNull(),

  alt: text("alt"),
  title: text("title"),

  assetType: text("asset_type", {
    enum: ['image', 'video', 'audio', 'document', 'font', 'icon']
  }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).pick({
  companyId: true,
  eventType: true,
  eventData: true,
  previousStatus: true,
  newStatus: true,
  triggeredBy: true
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;

export const subscriptionUsageTracking = pgTable("subscription_usage_tracking", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  metricName: text("metric_name").notNull(),
  currentUsage: integer("current_usage").notNull().default(0),
  limitValue: integer("limit_value").notNull(),
  softLimitReached: boolean("soft_limit_reached").default(false),
  hardLimitReached: boolean("hard_limit_reached").default(false),
  lastWarningSent: timestamp("last_warning_sent"),
  resetPeriod: text("reset_period").default("monthly"),
  lastReset: timestamp("last_reset").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCompanyMetric: unique().on(table.companyId, table.metricName)
}));

export const insertSubscriptionUsageTrackingSchema = createInsertSchema(subscriptionUsageTracking).pick({
  companyId: true,
  metricName: true,
  currentUsage: true,
  limitValue: true,
  softLimitReached: true,
  hardLimitReached: true,
  lastWarningSent: true,
  resetPeriod: true,
  lastReset: true
});

export type SubscriptionUsageTracking = typeof subscriptionUsageTracking.$inferSelect;
export type InsertSubscriptionUsageTracking = z.infer<typeof insertSubscriptionUsageTrackingSchema>;

export const dunningManagement = pgTable("dunning_management", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  attemptDate: timestamp("attempt_date").notNull().defaultNow(),
  attemptType: text("attempt_type").notNull(),
  status: text("status").notNull().default("pending"),
  responseData: jsonb("response_data"),
  nextAttemptDate: timestamp("next_attempt_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertDunningManagementSchema = createInsertSchema(dunningManagement).pick({
  companyId: true,
  paymentTransactionId: true,
  attemptNumber: true,
  attemptDate: true,
  attemptType: true,
  status: true,
  responseData: true,
  nextAttemptDate: true
});

export type DunningManagement = typeof dunningManagement.$inferSelect;
export type InsertDunningManagement = z.infer<typeof insertDunningManagementSchema>;

export const subscriptionPlanChanges = pgTable("subscription_plan_changes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  fromPlanId: integer("from_plan_id").references(() => plans.id),
  toPlanId: integer("to_plan_id").notNull().references(() => plans.id),
  changeType: text("change_type").notNull(),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  prorationAmount: numeric("proration_amount", { precision: 10, scale: 2 }).default("0"),
  prorationDays: integer("proration_days").default(0),
  billingCycleReset: boolean("billing_cycle_reset").default(false),
  changeReason: text("change_reason"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSubscriptionPlanChangeSchema = createInsertSchema(subscriptionPlanChanges).pick({
  companyId: true,
  fromPlanId: true,
  toPlanId: true,
  changeType: true,
  effectiveDate: true,
  prorationAmount: true,
  prorationDays: true,
  billingCycleReset: true,
  changeReason: true,
  processed: true
});

export type SubscriptionPlanChange = typeof subscriptionPlanChanges.$inferSelect;
export type InsertSubscriptionPlanChange = z.infer<typeof insertSubscriptionPlanChangeSchema>;

export const subscriptionNotifications = pgTable("subscription_notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  notificationType: text("notification_type").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  notificationData: jsonb("notification_data").notNull().default('{}'),
  deliveryMethod: text("delivery_method").default("email"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSubscriptionNotificationSchema = createInsertSchema(subscriptionNotifications).pick({
  companyId: true,
  notificationType: true,
  status: true,
  scheduledFor: true,
  sentAt: true,
  notificationData: true,
  deliveryMethod: true,
  retryCount: true,
  maxRetries: true
});

export type SubscriptionNotification = typeof subscriptionNotifications.$inferSelect;
export type InsertSubscriptionNotification = z.infer<typeof insertSubscriptionNotificationSchema>;

export const insertWebsiteSchema = createInsertSchema(websites).pick({
  title: true,
  slug: true,
  description: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  grapesData: true,
  grapesHtml: true,
  grapesCss: true,
  grapesJs: true,
  favicon: true,
  customCss: true,
  customJs: true,
  customHead: true,
  status: true,
  publishedAt: true,
  googleAnalyticsId: true,
  facebookPixelId: true,

  theme: true,
  createdById: true
});



export const insertWebsiteAssetSchema = createInsertSchema(websiteAssets).pick({
  websiteId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  url: true,
  alt: true,
  title: true,
  assetType: true
});

export const systemAiCredentials = pgTable("system_ai_credentials", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  usageLimitMonthly: integer("usage_limit_monthly"),
  usageCountCurrent: integer("usage_count_current").default(0),
  lastValidatedAt: timestamp("last_validated_at"),
  validationStatus: text("validation_status").default("pending"),
  validationError: text("validation_error"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const companyAiCredentials = pgTable("company_ai_credentials", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  usageLimitMonthly: integer("usage_limit_monthly"),
  usageCountCurrent: integer("usage_count_current").default(0),
  lastValidatedAt: timestamp("last_validated_at"),
  validationStatus: text("validation_status").default("pending"),
  validationError: text("validation_error"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const aiCredentialUsage = pgTable("ai_credential_usage", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  credentialType: text("credential_type").notNull(),
  credentialId: integer("credential_id"),
  provider: text("provider").notNull(),
  model: text("model"),
  tokensInput: integer("tokens_input").default(0),
  tokensOutput: integer("tokens_output").default(0),
  tokensTotal: integer("tokens_total").default(0),
  costEstimated: numeric("cost_estimated", { precision: 10, scale: 6 }).default("0.00"),
  requestCount: integer("request_count").default(1),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'set null' }),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'set null' }),
  nodeId: text("node_id"),
  usageDate: date("usage_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const companyAiPreferences = pgTable("company_ai_preferences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  defaultProvider: text("default_provider").default("openai"),
  credentialPreference: text("credential_preference").default("auto"),
  fallbackEnabled: boolean("fallback_enabled").default(true),
  usageAlertsEnabled: boolean("usage_alerts_enabled").default(true),
  usageAlertThreshold: integer("usage_alert_threshold").default(80),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const knowledgeBaseDocuments = pgTable("knowledge_base_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id"),

  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),

  status: text("status", {
    enum: ['uploading', 'processing', 'completed', 'failed']
  }).notNull().default('uploading'),

  filePath: text("file_path").notNull(),
  fileUrl: text("file_url"),

  extractedText: text("extracted_text"),
  chunkCount: integer("chunk_count").default(0),
  embeddingModel: text("embedding_model").default('text-embedding-3-small'),

  processingError: text("processing_error"),
  processingDurationMs: integer("processing_duration_ms"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const knowledgeBaseChunks = pgTable("knowledge_base_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeBaseDocuments.id, { onDelete: 'cascade' }),

  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count"),



  startPosition: integer("start_position"),
  endPosition: integer("end_position"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const knowledgeBaseConfigs = pgTable("knowledge_base_configs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'cascade' }),

  enabled: boolean("enabled").default(true),
  maxRetrievedChunks: integer("max_retrieved_chunks").default(3),
  similarityThreshold: real("similarity_threshold").default(0.7),
  embeddingModel: text("embedding_model").default('text-embedding-3-small'),

  contextPosition: text("context_position", {
    enum: ['before_system', 'after_system', 'before_user']
  }).default('before_system'),

  contextTemplate: text("context_template").default(
    "Based on the following knowledge base information:\n\n{context}\n\nPlease answer the user's question using this information when relevant."
  ),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueNodeConfig: unique().on(table.companyId, table.nodeId)
}));

export const knowledgeBaseDocumentNodes = pgTable("knowledge_base_document_nodes", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeBaseDocuments.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  flowId: integer("flow_id").references(() => flows.id, { onDelete: 'cascade' }),

  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueDocumentNode: unique().on(table.documentId, table.nodeId)
}));

export const knowledgeBaseUsage = pgTable("knowledge_base_usage", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  nodeId: text("node_id").notNull(),
  documentId: integer("document_id").references(() => knowledgeBaseDocuments.id, { onDelete: 'set null' }),

  queryText: text("query_text").notNull(),
  queryEmbedding: text("query_embedding"),

  chunksRetrieved: integer("chunks_retrieved").default(0),
  chunksUsed: integer("chunks_used").default(0),
  similarityScores: jsonb("similarity_scores").default('[]'),

  retrievalDurationMs: integer("retrieval_duration_ms"),
  embeddingDurationMs: integer("embedding_duration_ms"),

  contextInjected: boolean("context_injected").default(false),
  contextLength: integer("context_length"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSystemAiCredentialSchema = createInsertSchema(systemAiCredentials).pick({
  provider: true,
  apiKeyEncrypted: true,
  displayName: true,
  description: true,
  isActive: true,
  isDefault: true,
  usageLimitMonthly: true,
  metadata: true
});

export const insertCompanyAiCredentialSchema = createInsertSchema(companyAiCredentials).pick({
  companyId: true,
  provider: true,
  apiKeyEncrypted: true,
  displayName: true,
  description: true,
  isActive: true,
  usageLimitMonthly: true,
  metadata: true
});

export const insertAiCredentialUsageSchema = createInsertSchema(aiCredentialUsage).pick({
  companyId: true,
  credentialType: true,
  credentialId: true,
  provider: true,
  model: true,
  tokensInput: true,
  tokensOutput: true,
  tokensTotal: true,
  costEstimated: true,
  requestCount: true,
  conversationId: true,
  flowId: true,
  nodeId: true,
  usageDate: true
});

export const insertCompanyAiPreferencesSchema = createInsertSchema(companyAiPreferences).pick({
  companyId: true,
  defaultProvider: true,
  credentialPreference: true,
  fallbackEnabled: true,
  usageAlertsEnabled: true,
  usageAlertThreshold: true,
  metadata: true
});

export type SystemAiCredential = typeof systemAiCredentials.$inferSelect;
export type InsertSystemAiCredential = z.infer<typeof insertSystemAiCredentialSchema>;

export type CompanyAiCredential = typeof companyAiCredentials.$inferSelect;
export type InsertCompanyAiCredential = z.infer<typeof insertCompanyAiCredentialSchema>;

export type AiCredentialUsage = typeof aiCredentialUsage.$inferSelect;
export type InsertAiCredentialUsage = z.infer<typeof insertAiCredentialUsageSchema>;

export type CompanyAiPreferences = typeof companyAiPreferences.$inferSelect;
export type InsertCompanyAiPreferences = z.infer<typeof insertCompanyAiPreferencesSchema>;

export const insertKnowledgeBaseDocumentSchema = createInsertSchema(knowledgeBaseDocuments).pick({
  companyId: true,
  nodeId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  status: true,
  filePath: true,
  fileUrl: true,
  extractedText: true,
  chunkCount: true,
  embeddingModel: true,
  processingError: true,
  processingDurationMs: true
});

export const insertKnowledgeBaseChunkSchema = createInsertSchema(knowledgeBaseChunks).pick({
  documentId: true,
  content: true,
  chunkIndex: true,
  tokenCount: true,
  startPosition: true,
  endPosition: true
});

export const insertKnowledgeBaseConfigSchema = createInsertSchema(knowledgeBaseConfigs).pick({
  companyId: true,
  nodeId: true,
  flowId: true,
  enabled: true,
  maxRetrievedChunks: true,
  similarityThreshold: true,
  embeddingModel: true,
  contextPosition: true,
  contextTemplate: true
});

export const insertKnowledgeBaseDocumentNodeSchema = createInsertSchema(knowledgeBaseDocumentNodes).pick({
  documentId: true,
  companyId: true,
  nodeId: true,
  flowId: true
});

export const insertKnowledgeBaseUsageSchema = createInsertSchema(knowledgeBaseUsage).pick({
  companyId: true,
  nodeId: true,
  documentId: true,
  queryText: true,
  queryEmbedding: true,
  chunksRetrieved: true,
  chunksUsed: true,
  similarityScores: true,
  retrievalDurationMs: true,
  embeddingDurationMs: true,
  contextInjected: true,
  contextLength: true
});

export const historySyncBatches = pgTable("history_sync_batches", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull().references(() => channelConnections.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  batchId: text("batch_id").notNull().unique(),
  syncType: text("sync_type", {
    enum: ['initial', 'manual', 'incremental']
  }).notNull(),
  status: text("status", {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).notNull().default('pending'),
  totalChats: integer("total_chats").default(0),
  processedChats: integer("processed_chats").default(0),
  totalMessages: integer("total_messages").default(0),
  processedMessages: integer("processed_messages").default(0),
  totalContacts: integer("total_contacts").default(0),
  processedContacts: integer("processed_contacts").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertHistorySyncBatchSchema = createInsertSchema(historySyncBatches).pick({
  connectionId: true,
  companyId: true,
  batchId: true,
  syncType: true,
  status: true,
  totalChats: true,
  processedChats: true,
  totalMessages: true,
  processedMessages: true,
  totalContacts: true,
  processedContacts: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true
});


export const backupStatusEnum = pgEnum('backup_status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
export const backupTypeEnum = pgEnum('backup_type', ['manual', 'scheduled']);
export const restoreStatusEnum = pgEnum('restore_status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

export const inboxBackups = pgTable("inbox_backups", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: backupTypeEnum("type").notNull().default('manual'),
  status: backupStatusEnum("status").notNull().default('pending'),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"), // in bytes
  compressedSize: integer("compressed_size"), // in bytes
  checksum: text("checksum"),
  metadata: jsonb("metadata").default('{}'), // backup metadata like version, counts, etc.
  includeContacts: boolean("include_contacts").default(true),
  includeConversations: boolean("include_conversations").default(true),
  includeMessages: boolean("include_messages").default(true),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  totalContacts: integer("total_contacts").default(0),
  totalConversations: integer("total_conversations").default(0),
  totalMessages: integer("total_messages").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // for automatic cleanup
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const backupSchedules = pgTable("backup_schedules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly'
  cronExpression: text("cron_expression"),
  retentionDays: integer("retention_days").default(30),
  includeContacts: boolean("include_contacts").default(true),
  includeConversations: boolean("include_conversations").default(true),
  includeMessages: boolean("include_messages").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const inboxRestores = pgTable("inbox_restores", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  backupId: integer("backup_id").references(() => inboxBackups.id),
  restoredByUserId: integer("restored_by_user_id").notNull().references(() => users.id),
  status: restoreStatusEnum("status").notNull().default('pending'),
  restoreType: text("restore_type").notNull(), // 'full', 'selective'
  conflictResolution: text("conflict_resolution").default('merge'), // 'merge', 'overwrite', 'skip'
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  restoreContacts: boolean("restore_contacts").default(true),
  restoreConversations: boolean("restore_conversations").default(true),
  restoreMessages: boolean("restore_messages").default(true),
  totalItemsToRestore: integer("total_items_to_restore").default(0),
  itemsRestored: integer("items_restored").default(0),
  itemsSkipped: integer("items_skipped").default(0),
  itemsErrored: integer("items_errored").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const backupAuditLogs = pgTable("backup_audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'backup_created', 'backup_downloaded', 'restore_started', etc.
  entityType: text("entity_type").notNull(), // 'backup', 'restore', 'schedule'
  entityId: integer("entity_id"),
  details: jsonb("details").default('{}'),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});


export const databaseBackupStatusEnum = pgEnum('database_backup_status', ['creating', 'completed', 'failed', 'uploading', 'uploaded']);
export const databaseBackupTypeEnum = pgEnum('database_backup_type', ['manual', 'scheduled']);
export const databaseBackupFormatEnum = pgEnum('database_backup_format', ['sql', 'custom']);

export const databaseBackups = pgTable("database_backups", {
  id: text("id").primaryKey(), // UUID
  filename: text("filename").notNull(),
  type: databaseBackupTypeEnum("type").notNull().default('manual'),
  description: text("description").notNull(),
  size: integer("size").notNull().default(0), // in bytes
  status: databaseBackupStatusEnum("status").notNull().default('creating'),
  storageLocations: jsonb("storage_locations").notNull().default('["local"]'), // array of storage locations
  checksum: text("checksum").notNull(),
  errorMessage: text("error_message"),

  databaseSize: integer("database_size").default(0),
  tableCount: integer("table_count").default(0),
  rowCount: integer("row_count").default(0),
  compressionRatio: real("compression_ratio"),
  encryptionEnabled: boolean("encryption_enabled").default(false),

  appVersion: text("app_version"),
  pgVersion: text("pg_version"),
  instanceId: text("instance_id"),
  dumpFormat: databaseBackupFormatEnum("dump_format").default('sql'),
  schemaChecksum: text("schema_checksum"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const databaseBackupLogs = pgTable("database_backup_logs", {
  id: text("id").primaryKey(), // UUID
  scheduleId: text("schedule_id").notNull(), // 'manual' (for non-scheduled events), 'restore' (for restore operations), or schedule UUID (for scheduled backups)
  backupId: text("backup_id").references(() => databaseBackups.id),
  status: text("status").notNull(), // 'success' | 'failed' | 'partial' | 'in_progress' - faithful to actual state, not coerced
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default('{}'), // Contains event_type for non-scheduled events (e.g., 'cleanup', 'cleanup_deleted', 'cleanup_failed')
  createdAt: timestamp("created_at").notNull().defaultNow()
});


export const insertInboxBackupSchema = createInsertSchema(inboxBackups).pick({
  companyId: true,
  createdByUserId: true,
  name: true,
  description: true,
  type: true,
  includeContacts: true,
  includeConversations: true,
  includeMessages: true,
  dateRangeStart: true,
  dateRangeEnd: true
});

export const insertBackupScheduleSchema = createInsertSchema(backupSchedules).pick({
  companyId: true,
  createdByUserId: true,
  name: true,
  description: true,
  isActive: true,
  frequency: true,
  cronExpression: true,
  retentionDays: true,
  includeContacts: true,
  includeConversations: true,
  includeMessages: true
});

export const insertInboxRestoreSchema = createInsertSchema(inboxRestores).pick({
  companyId: true,
  backupId: true,
  restoredByUserId: true,
  restoreType: true,
  conflictResolution: true,
  dateRangeStart: true,
  dateRangeEnd: true,
  restoreContacts: true,
  restoreConversations: true,
  restoreMessages: true
});

export const insertBackupAuditLogSchema = createInsertSchema(backupAuditLogs).pick({
  companyId: true,
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  ipAddress: true,
  userAgent: true
});

export const insertDatabaseBackupSchema = createInsertSchema(databaseBackups).pick({
  id: true,
  filename: true,
  type: true,
  description: true,
  size: true,
  status: true,
  storageLocations: true,
  checksum: true,
  errorMessage: true,
  databaseSize: true,
  tableCount: true,
  rowCount: true,
  compressionRatio: true,
  encryptionEnabled: true,
  appVersion: true,
  pgVersion: true,
  instanceId: true,
  dumpFormat: true,
  schemaChecksum: true
});

export const insertDatabaseBackupLogSchema = createInsertSchema(databaseBackupLogs).pick({
  id: true,
  scheduleId: true,
  backupId: true,
  status: true,
  timestamp: true,
  errorMessage: true,
  metadata: true
});

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type InsertKnowledgeBaseDocument = z.infer<typeof insertKnowledgeBaseDocumentSchema>;

export type KnowledgeBaseChunk = typeof knowledgeBaseChunks.$inferSelect;
export type InsertKnowledgeBaseChunk = z.infer<typeof insertKnowledgeBaseChunkSchema>;

export type HistorySyncBatch = typeof historySyncBatches.$inferSelect;
export type InsertHistorySyncBatch = z.infer<typeof insertHistorySyncBatchSchema>;

export type KnowledgeBaseConfig = typeof knowledgeBaseConfigs.$inferSelect;


export type InboxBackup = typeof inboxBackups.$inferSelect;
export type InsertInboxBackup = z.infer<typeof insertInboxBackupSchema>;

export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = z.infer<typeof insertBackupScheduleSchema>;

export type InboxRestore = typeof inboxRestores.$inferSelect;
export type InsertInboxRestore = z.infer<typeof insertInboxRestoreSchema>;

export type BackupAuditLog = typeof backupAuditLogs.$inferSelect;
export type InsertBackupAuditLog = z.infer<typeof insertBackupAuditLogSchema>;

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = z.infer<typeof insertDatabaseBackupSchema>;

export type DatabaseBackupLog = typeof databaseBackupLogs.$inferSelect;
export type InsertDatabaseBackupLog = z.infer<typeof insertDatabaseBackupLogSchema>;

export type InsertKnowledgeBaseConfig = z.infer<typeof insertKnowledgeBaseConfigSchema>;

export type KnowledgeBaseDocumentNode = typeof knowledgeBaseDocumentNodes.$inferSelect;
export type InsertKnowledgeBaseDocumentNode = z.infer<typeof insertKnowledgeBaseDocumentNodeSchema>;

export type KnowledgeBaseUsage = typeof knowledgeBaseUsage.$inferSelect;
export type InsertKnowledgeBaseUsage = z.infer<typeof insertKnowledgeBaseUsageSchema>;

// Pipeline Stage Reverts
export const pipelineStageReverts = pgTable("pipeline_stage_reverts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: 'cascade' }),
  fromStageId: integer("from_stage_id").notNull().references(() => pipelineStages.id),
  toStageId: integer("to_stage_id").references(() => pipelineStages.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status", { enum: ['pending', 'executed', 'cancelled', 'failed', 'skipped'] }).notNull().default('pending'),
  executedAt: timestamp("executed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPipelineStageRevertSchema = createInsertSchema(pipelineStageReverts).pick({
  companyId: true,
  dealId: true,
  fromStageId: true,
  toStageId: true,
  scheduledFor: true,
  status: true,
  metadata: true
});

export type PipelineStageRevert = typeof pipelineStageReverts.$inferSelect;
export type InsertPipelineStageRevert = z.infer<typeof insertPipelineStageRevertSchema>;

export const pipelineStageRevertLogs = pgTable("pipeline_stage_revert_logs", {
  id: serial("id").primaryKey(),
  revertId: integer("revert_id").references(() => pipelineStageReverts.id, { onDelete: 'cascade' }),
  status: text("status").notNull(),
  message: text("message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertPipelineStageRevertLogSchema = createInsertSchema(pipelineStageRevertLogs).pick({
  revertId: true,
  status: true,
  message: true,
  metadata: true
});

export type PipelineStageRevertLog = typeof pipelineStageRevertLogs.$inferSelect;
export type InsertPipelineStageRevertLog = z.infer<typeof insertPipelineStageRevertLogSchema>;

// API Tables
// apiKeys, apiRateLimits, and apiUsage are already defined elsewhere in this file

export const apiWebhooks = pgTable("api_webhooks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  events: text("events").array(),
  isActive: boolean("is_active").default(true),
  secret: text("secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
export const insertApiWebhookSchema = createInsertSchema(apiWebhooks);
export type ApiWebhook = typeof apiWebhooks.$inferSelect;
export type InsertApiWebhook = z.infer<typeof insertApiWebhookSchema>;

// apiUsage removed


// Calendar Integration Tables
// googleCalendarTokens, zohoCalendarTokens, calendlyCalendarTokens are already defined elsewhere in this file
export const calendarBookings = pgTable("calendar_bookings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  calendarProvider: text("calendar_provider").notNull(),
  externalEventId: text("external_event_id"),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default('confirmed'),
  meetingUrl: text("meeting_url"),
  location: text("location"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
export const insertCalendarBookingSchema = createInsertSchema(calendarBookings);
export type CalendarBooking = typeof calendarBookings.$inferSelect;
export type InsertCalendarBooking = z.infer<typeof insertCalendarBookingSchema>;





// Pipelines
export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
export const insertPipelineSchema = createInsertSchema(pipelines);
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;

// pipelineStages removed (duplicate)


export const companyCustomFields = pgTable("company_custom_fields", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  entityType: text("entity_type").notNull(), // contact, deal, etc.
  name: text("name").notNull(),
  key: text("key").notNull(),
  fieldType: text("field_type").notNull(), // text, number, select, etc.
  options: jsonb("options"), // for select types
  isRequired: boolean("is_required").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
