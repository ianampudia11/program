/**
 * Flow Node Types and Utilities
 * Centralized node type definitions to replace string-based detection
 */

export enum NodeType {
  MESSAGE = 'message',
  QUICK_REPLY = 'quickReply',
  WHATSAPP_INTERACTIVE_BUTTONS = 'whatsappInteractiveButtons',
  WHATSAPP_INTERACTIVE_LIST = 'whatsappInteractiveList',
  WHATSAPP_CTA_URL = 'whatsappCTAURL',
  WHATSAPP_LOCATION_REQUEST = 'whatsappLocationRequest',
  WHATSAPP_POLL = 'whatsappPoll',
  FOLLOW_UP = 'followUp',

  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',

  CONDITION = 'condition',
  WAIT = 'wait',
  INPUT = 'input',
  ACTION = 'action',

  AI_ASSISTANT = 'aiAssistant',
  TRANSLATION = 'translation',
  WEBHOOK = 'webhook',
  HTTP_REQUEST = 'httpRequest',
  CODE_EXECUTION = 'codeExecution',

  SHOPIFY = 'shopify',
  WOOCOMMERCE = 'woocommerce',
  WHATSAPP_FLOWS = 'whatsappFlows',

  TYPEBOT = 'typebot',
  FLOWISE = 'flowise',
  N8N = 'n8n',
  MAKE = 'make',
  GOOGLE_SHEETS = 'google_sheets',
  DATA_CAPTURE = 'data_capture',
  DOCUMIND = 'documind',
  CHAT_PDF = 'chat_pdf',

  GOOGLE_CALENDAR = 'googleCalendar',

  BOT_DISABLE = 'botDisable',
  BOT_RESET = 'botReset',

  UPDATE_PIPELINE_STAGE = 'updatePipelineStage',

  TRIGGER = 'trigger'
}

/**
 * Node type categories for grouping and validation
 */
export enum NodeCategory {
  MESSAGE = 'message',
  MEDIA = 'media',
  LOGIC = 'logic',
  INTEGRATION = 'integration',
  ECOMMERCE = 'ecommerce',
  EXTERNAL = 'external',
  CALENDAR = 'calendar',
  BOT_CONTROL = 'bot_control',
  PIPELINE = 'pipeline',
  TRIGGER = 'trigger'
}

/**
 * Legacy node type mappings for backward compatibility
 */
export const LEGACY_NODE_TYPE_MAPPINGS: Record<string, NodeType> = {
  'messageNode': NodeType.MESSAGE,
  'message': NodeType.MESSAGE,
  'Message Node': NodeType.MESSAGE,
  'quickReplyNode': NodeType.QUICK_REPLY,
  'quick_reply': NodeType.QUICK_REPLY,
  'Quick Reply Node': NodeType.QUICK_REPLY,
  'Quick Reply Options': NodeType.QUICK_REPLY,
  'quickreply': NodeType.QUICK_REPLY,
  'Quickreply Node': NodeType.QUICK_REPLY,
  'whatsapp_poll': NodeType.WHATSAPP_POLL,
  'WhatsApp Poll': NodeType.WHATSAPP_POLL,
  'WhatsApp Poll Node': NodeType.WHATSAPP_POLL,
  'whatsapp_interactive_buttons': NodeType.WHATSAPP_INTERACTIVE_BUTTONS,
  'WhatsApp Interactive Buttons': NodeType.WHATSAPP_INTERACTIVE_BUTTONS,
  'WhatsApp Interactive Buttons Node': NodeType.WHATSAPP_INTERACTIVE_BUTTONS,
  'whatsapp_interactive_list': NodeType.WHATSAPP_INTERACTIVE_LIST,
  'WhatsApp Interactive List': NodeType.WHATSAPP_INTERACTIVE_LIST,
  'WhatsApp Interactive List Node': NodeType.WHATSAPP_INTERACTIVE_LIST,
  'whatsapp_cta_url': NodeType.WHATSAPP_CTA_URL,
  'WhatsApp CTA URL': NodeType.WHATSAPP_CTA_URL,
  'WhatsApp CTA URL Node': NodeType.WHATSAPP_CTA_URL,
  'whatsapp_location_request': NodeType.WHATSAPP_LOCATION_REQUEST,
  'WhatsApp Location Request': NodeType.WHATSAPP_LOCATION_REQUEST,
  'WhatsApp Location Request Node': NodeType.WHATSAPP_LOCATION_REQUEST,
  'followUpNode': NodeType.FOLLOW_UP,
  'follow_up': NodeType.FOLLOW_UP,
  'Follow Up Node': NodeType.FOLLOW_UP,
  'Follow-up Node': NodeType.FOLLOW_UP,
  'followup': NodeType.FOLLOW_UP,

  'imageNode': NodeType.IMAGE,
  'image': NodeType.IMAGE,
  'Image Node': NodeType.IMAGE,
  'videoNode': NodeType.VIDEO,
  'video': NodeType.VIDEO,
  'Video Node': NodeType.VIDEO,
  'audioNode': NodeType.AUDIO,
  'audio': NodeType.AUDIO,
  'Audio Node': NodeType.AUDIO,
  'documentNode': NodeType.DOCUMENT,
  'document': NodeType.DOCUMENT,
  'Document Node': NodeType.DOCUMENT,
  
  'conditionNode': NodeType.CONDITION,
  'condition': NodeType.CONDITION,
  'Condition Node': NodeType.CONDITION,
  'waitNode': NodeType.WAIT,
  'wait': NodeType.WAIT,
  'Wait Node': NodeType.WAIT,
  'inputNode': NodeType.INPUT,
  'input': NodeType.INPUT,
  'Input Node': NodeType.INPUT,
  'actionNode': NodeType.ACTION,
  'action': NodeType.ACTION,
  'Action Node': NodeType.ACTION,
  
  'aiAssistantNode': NodeType.AI_ASSISTANT,
  'aiAssistant': NodeType.AI_ASSISTANT,
  'ai_assistant': NodeType.AI_ASSISTANT,
  'AI Assistant': NodeType.AI_ASSISTANT,
  'AI Response': NodeType.AI_ASSISTANT,
  'Ai_assistant Node': NodeType.AI_ASSISTANT,
  'webhookNode': NodeType.WEBHOOK,
  'webhook': NodeType.WEBHOOK,
  'Webhook Node': NodeType.WEBHOOK,
  'httpRequestNode': NodeType.HTTP_REQUEST,
  'http_request': NodeType.HTTP_REQUEST,
  'HTTP Request Node': NodeType.HTTP_REQUEST,
  'codeExecutionNode': NodeType.CODE_EXECUTION,
  'code_execution': NodeType.CODE_EXECUTION,
  'Code Execution': NodeType.CODE_EXECUTION,
  'Code Execution Node': NodeType.CODE_EXECUTION,
  
  'shopifyNode': NodeType.SHOPIFY,
  'shopify': NodeType.SHOPIFY,
  'Shopify Node': NodeType.SHOPIFY,
  'woocommerceNode': NodeType.WOOCOMMERCE,
  'woocommerce': NodeType.WOOCOMMERCE,
  'WooCommerce Node': NodeType.WOOCOMMERCE,
  
  'whatsappFlowsNode': NodeType.WHATSAPP_FLOWS,
  'whatsappFlows': NodeType.WHATSAPP_FLOWS,
  'whatsapp_flows': NodeType.WHATSAPP_FLOWS,
  'WhatsApp Flows': NodeType.WHATSAPP_FLOWS,
  'WhatsApp Flows Node': NodeType.WHATSAPP_FLOWS,
  
  'typebotNode': NodeType.TYPEBOT,
  'typebot': NodeType.TYPEBOT,
  'Typebot Node': NodeType.TYPEBOT,
  'flowiseNode': NodeType.FLOWISE,
  'flowise': NodeType.FLOWISE,
  'Flowise Node': NodeType.FLOWISE,
  
  'googleCalendarNode': NodeType.GOOGLE_CALENDAR,
  'google_calendar': NodeType.GOOGLE_CALENDAR,
  'Google Calendar Node': NodeType.GOOGLE_CALENDAR,
  
  'botDisableNode': NodeType.BOT_DISABLE,
  'bot_disable': NodeType.BOT_DISABLE,
  'Agent Handoff': NodeType.BOT_DISABLE,
  'Bot Disable': NodeType.BOT_DISABLE,
  'Disable Bot': NodeType.BOT_DISABLE,
  'botResetNode': NodeType.BOT_RESET,
  'bot_reset': NodeType.BOT_RESET,
  'Reset Bot': NodeType.BOT_RESET,
  'Bot Reset': NodeType.BOT_RESET,
  'Re-enable Bot': NodeType.BOT_RESET,
  
  'updatePipelineStageNode': NodeType.UPDATE_PIPELINE_STAGE,
  'update_pipeline_stage': NodeType.UPDATE_PIPELINE_STAGE,
  'Pipeline': NodeType.UPDATE_PIPELINE_STAGE,
  'Move to Pipeline Stage': NodeType.UPDATE_PIPELINE_STAGE,
  
  'triggerNode': NodeType.TRIGGER,
  'trigger': NodeType.TRIGGER,
  'Trigger Node': NodeType.TRIGGER
};

/**
 * Node type to category mapping
 */
export const NODE_TYPE_CATEGORIES: Record<NodeType, NodeCategory> = {
  [NodeType.MESSAGE]: NodeCategory.MESSAGE,
  [NodeType.QUICK_REPLY]: NodeCategory.MESSAGE,
  [NodeType.WHATSAPP_INTERACTIVE_BUTTONS]: NodeCategory.MESSAGE,
  [NodeType.WHATSAPP_INTERACTIVE_LIST]: NodeCategory.MESSAGE,
  [NodeType.WHATSAPP_CTA_URL]: NodeCategory.MESSAGE,
  [NodeType.WHATSAPP_LOCATION_REQUEST]: NodeCategory.MESSAGE,
  [NodeType.WHATSAPP_POLL]: NodeCategory.MESSAGE,
  [NodeType.FOLLOW_UP]: NodeCategory.MESSAGE,
  [NodeType.IMAGE]: NodeCategory.MEDIA,
  [NodeType.VIDEO]: NodeCategory.MEDIA,
  [NodeType.AUDIO]: NodeCategory.MEDIA,
  [NodeType.DOCUMENT]: NodeCategory.MEDIA,
  [NodeType.CONDITION]: NodeCategory.LOGIC,
  [NodeType.WAIT]: NodeCategory.LOGIC,
  [NodeType.INPUT]: NodeCategory.LOGIC,
  [NodeType.ACTION]: NodeCategory.LOGIC,
  [NodeType.AI_ASSISTANT]: NodeCategory.INTEGRATION,
  [NodeType.TRANSLATION]: NodeCategory.LOGIC,
  [NodeType.WEBHOOK]: NodeCategory.INTEGRATION,
  [NodeType.HTTP_REQUEST]: NodeCategory.INTEGRATION,
  [NodeType.CODE_EXECUTION]: NodeCategory.LOGIC,
  [NodeType.SHOPIFY]: NodeCategory.ECOMMERCE,
  [NodeType.WOOCOMMERCE]: NodeCategory.ECOMMERCE,
  [NodeType.WHATSAPP_FLOWS]: NodeCategory.MESSAGE,
  [NodeType.TYPEBOT]: NodeCategory.EXTERNAL,
  [NodeType.FLOWISE]: NodeCategory.EXTERNAL,
  [NodeType.N8N]: NodeCategory.EXTERNAL,
  [NodeType.MAKE]: NodeCategory.EXTERNAL,
  [NodeType.GOOGLE_SHEETS]: NodeCategory.EXTERNAL,
  [NodeType.DATA_CAPTURE]: NodeCategory.LOGIC,
  [NodeType.DOCUMIND]: NodeCategory.EXTERNAL,
  [NodeType.CHAT_PDF]: NodeCategory.EXTERNAL,
  [NodeType.GOOGLE_CALENDAR]: NodeCategory.CALENDAR,
  [NodeType.BOT_DISABLE]: NodeCategory.BOT_CONTROL,
  [NodeType.BOT_RESET]: NodeCategory.BOT_CONTROL,
  [NodeType.UPDATE_PIPELINE_STAGE]: NodeCategory.PIPELINE,
  [NodeType.TRIGGER]: NodeCategory.TRIGGER
};

/**
 * Utility functions for node type detection and validation
 */
export class NodeTypeUtils {
  /**
   * Normalize a node type from legacy string to enum
   */
  static normalizeNodeType(nodeType: string, nodeLabel?: string): NodeType | null {
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      return nodeType as NodeType;
    }

    if (LEGACY_NODE_TYPE_MAPPINGS[nodeType]) {
      return LEGACY_NODE_TYPE_MAPPINGS[nodeType];
    }

    if (nodeLabel && LEGACY_NODE_TYPE_MAPPINGS[nodeLabel]) {
      return LEGACY_NODE_TYPE_MAPPINGS[nodeLabel];
    }

    
    return null;
  }

  /**
   * Check if a node type is valid
   */
  static isValidNodeType(nodeType: string): boolean {
    return Object.values(NodeType).includes(nodeType as NodeType);
  }

  /**
   * Get the category for a node type
   */
  static getNodeCategory(nodeType: NodeType): NodeCategory {
    return NODE_TYPE_CATEGORIES[nodeType];
  }

  /**
   * Check if a node type belongs to a specific category
   */
  static isNodeInCategory(nodeType: NodeType, category: NodeCategory): boolean {
    return NODE_TYPE_CATEGORIES[nodeType] === category;
  }

  /**
   * Get all node types in a category
   */
  static getNodeTypesInCategory(category: NodeCategory): NodeType[] {
    return Object.entries(NODE_TYPE_CATEGORIES)
      .filter(([_, nodeCategory]) => nodeCategory === category)
      .map(([nodeType, _]) => nodeType as NodeType);
  }

  /**
   * Check if a node type requires user input (should pause execution)
   */
  static requiresUserInput(nodeType: NodeType): boolean {
    return [NodeType.INPUT, NodeType.QUICK_REPLY, NodeType.WHATSAPP_INTERACTIVE_BUTTONS, NodeType.WHATSAPP_POLL].includes(nodeType);
  }

  /**
   * Check if a node type should stop flow execution
   */
  static stopsExecution(nodeType: NodeType): boolean {
    return [NodeType.BOT_DISABLE].includes(nodeType);
  }

  /**
   * Check if a node type is a media node
   */
  static isMediaNode(nodeType: NodeType): boolean {
    return this.isNodeInCategory(nodeType, NodeCategory.MEDIA);
  }

  /**
   * Check if a node type is a message node
   */
  static isMessageNode(nodeType: NodeType): boolean {
    return this.isNodeInCategory(nodeType, NodeCategory.MESSAGE);
  }
}

/**
 * Node execution result interface
 */
export interface NodeExecutionResult {
  success: boolean;
  shouldContinue: boolean;
  nextNodeId?: string;
  waitForUserInput?: boolean;
  error?: string;
  data?: any;
}

/**
 * Node execution configuration
 */
export interface NodeExecutionConfig {
  timeout?: number;
  retryCount?: number;
  skipOnError?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
