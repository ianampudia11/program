import { logger } from '../utils/logger';

/**
 * PowerChat AI Flow Knowledge Base
 * Comprehensive knowledge system for AI assistant with detailed node information,
 * best practices, and flow patterns
 */
export class AIFlowKnowledgeBase {
  private static instance: AIFlowKnowledgeBase;

  static getInstance(): AIFlowKnowledgeBase {
    if (!AIFlowKnowledgeBase.instance) {
      AIFlowKnowledgeBase.instance = new AIFlowKnowledgeBase();
    }
    return AIFlowKnowledgeBase.instance;
  }

  /**
   * Get comprehensive node type information
   */
  getNodeTypeInfo(nodeType: string): NodeTypeInfo | null {
    return this.nodeTypeDatabase[nodeType] || null;
  }

  /**
   * Get all available node types with categories
   */
  getAllNodeTypes(): { [category: string]: NodeTypeInfo[] } {
    const categorized: { [category: string]: NodeTypeInfo[] } = {};
    
    Object.values(this.nodeTypeDatabase).forEach(nodeInfo => {
      if (!categorized[nodeInfo.category]) {
        categorized[nodeInfo.category] = [];
      }
      categorized[nodeInfo.category].push(nodeInfo);
    });

    return categorized;
  }

  /**
   * Get flow patterns for specific use cases
   */
  getFlowPatterns(useCase: string): FlowPattern[] {
    return this.flowPatterns.filter(pattern => 
      pattern.useCases.includes(useCase) || 
      pattern.tags.some(tag => tag.toLowerCase().includes(useCase.toLowerCase()))
    );
  }

  /**
   * Get best practices for flow building
   */
  getBestPractices(): BestPractice[] {
    return this.bestPractices;
  }

  /**
   * Get variable usage examples
   */
  getVariableExamples(): VariableExample[] {
    return this.variableExamples;
  }

  /**
   * Search knowledge base
   */
  search(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();


    Object.values(this.nodeTypeDatabase).forEach(nodeInfo => {
      const score = this.calculateRelevanceScore(queryLower, nodeInfo);
      if (score > 0.3) {
        results.push({
          type: 'node',
          title: nodeInfo.name,
          description: nodeInfo.description,
          content: nodeInfo,
          score
        });
      }
    });


    this.flowPatterns.forEach(pattern => {
      const score = this.calculatePatternRelevanceScore(queryLower, pattern);
      if (score > 0.3) {
        results.push({
          type: 'pattern',
          title: pattern.name,
          description: pattern.description,
          content: pattern,
          score
        });
      }
    });


    this.bestPractices.forEach(practice => {
      const score = this.calculatePracticeRelevanceScore(queryLower, practice);
      if (score > 0.3) {
        results.push({
          type: 'practice',
          title: practice.title,
          description: practice.description,
          content: practice,
          score
        });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateRelevanceScore(query: string, nodeInfo: NodeTypeInfo): number {
    let score = 0;
    
    if (nodeInfo.name.toLowerCase().includes(query)) score += 1.0;
    if (nodeInfo.description.toLowerCase().includes(query)) score += 0.8;
    if (nodeInfo.useCases.some(uc => uc.toLowerCase().includes(query))) score += 0.6;
    if (nodeInfo.tags.some(tag => tag.toLowerCase().includes(query))) score += 0.4;
    
    return Math.min(score, 1.0);
  }

  private calculatePatternRelevanceScore(query: string, pattern: FlowPattern): number {
    let score = 0;
    
    if (pattern.name.toLowerCase().includes(query)) score += 1.0;
    if (pattern.description.toLowerCase().includes(query)) score += 0.8;
    if (pattern.useCases.some(uc => uc.toLowerCase().includes(query))) score += 0.6;
    if (pattern.tags.some(tag => tag.toLowerCase().includes(query))) score += 0.4;
    
    return Math.min(score, 1.0);
  }

  private calculatePracticeRelevanceScore(query: string, practice: BestPractice): number {
    let score = 0;
    
    if (practice.title.toLowerCase().includes(query)) score += 1.0;
    if (practice.description.toLowerCase().includes(query)) score += 0.8;
    if (practice.category.toLowerCase().includes(query)) score += 0.6;
    
    return Math.min(score, 1.0);
  }

  /**
   * Comprehensive node type database
   */
  private nodeTypeDatabase: { [key: string]: NodeTypeInfo } = {
    trigger: {
      name: 'Trigger',
      type: 'trigger',
      category: 'Entry Points',
      description: 'Entry point for flows, activated when specific conditions are met',
      useCases: [
        'Start conversations when users send messages',
        'Activate flows based on keywords or phrases',
        'Channel-specific triggers for different platforms',
        'Time-based or event-based activation'
      ],
      configuration: {
        channelTypes: 'Array of channel types (whatsapp_unofficial, instagram, messenger, etc.)',
        conditionType: 'Trigger condition (any, contains, equals, starts_with, ends_with, regex)',
        conditionValue: 'Value to match against user input',
        enableSessionPersistence: 'Boolean to maintain session state',
        sessionTimeout: 'Session timeout in minutes',
        sessionTimeoutUnit: 'Time unit (minutes, hours, days)'
      },
      bestPractices: [
        'Always start flows with a trigger node',
        'Use specific keywords for better targeting',
        'Enable session persistence for multi-step conversations',
        'Set appropriate session timeouts'
      ],
      examples: [
        {
          title: 'Welcome Trigger',
          config: {
            channelTypes: ['whatsapp_unofficial'],
            conditionType: 'any',
            conditionValue: '',
            enableSessionPersistence: true,
            sessionTimeout: 30
          }
        },
        {
          title: 'Support Keyword Trigger',
          config: {
            channelTypes: ['whatsapp_unofficial'],
            conditionType: 'contains',
            conditionValue: 'help,support,issue',
            enableSessionPersistence: true
          }
        }
      ],
      tags: ['entry', 'start', 'activation', 'condition']
    },

    message: {
      name: 'Message',
      type: 'message',
      category: 'Communication',
      description: 'Send text messages with variable support and rich formatting',
      useCases: [
        'Send welcome messages to users',
        'Provide information and responses',
        'Ask questions and gather input',
        'Send personalized content using variables'
      ],
      configuration: {
        content: 'Message text with variable support {{variable_name}}',
        enableMarkdown: 'Boolean to enable markdown formatting',
        delay: 'Optional delay before sending message'
      },
      bestPractices: [
        'Use variables for personalization {{contact.name}}',
        'Keep messages concise and clear',
        'Use emojis for better engagement',
        'Break long messages into multiple nodes'
      ],
      examples: [
        {
          title: 'Welcome Message',
          config: {
            content: '👋 Hello {{contact.name}}! Welcome to our service.\n\nHow can we help you today?'
          }
        },
        {
          title: 'Personalized Response',
          config: {
            content: 'Thanks {{contact.name}}! I\'ve received your request about {{user_input}}. Let me help you with that.'
          }
        }
      ],
      tags: ['text', 'communication', 'response', 'variables']
    },

    quickreply: {
      name: 'Quick Reply',
      type: 'quickreply',
      category: 'Interactive',
      description: 'Present users with quick reply buttons for easy selection',
      useCases: [
        'Create menu systems and navigation',
        'Gather user preferences and choices',
        'Provide predefined response options',
        'Guide users through decision trees'
      ],
      configuration: {
        content: 'Question or prompt text',
        options: 'Array of reply options with id, text, and value',
        allowCustomInput: 'Boolean to allow custom text input',
        customInputPrompt: 'Prompt for custom input option'
      },
      bestPractices: [
        'Limit options to 3-5 for better UX',
        'Use clear, action-oriented button text',
        'Include emojis for visual appeal',
        'Provide "Other" option when needed'
      ],
      examples: [
        {
          title: 'Main Menu',
          config: {
            content: 'How can we help you today?',
            options: [
              { id: 'info', text: 'ℹ️ Information', value: 'info' },
              { id: 'support', text: '🆘 Support', value: 'support' },
              { id: 'contact', text: '📞 Contact Us', value: 'contact' }
            ]
          }
        }
      ],
      tags: ['buttons', 'menu', 'selection', 'interactive']
    },

    condition: {
      name: 'Condition',
      type: 'condition',
      category: 'Logic',
      description: 'Branch flow execution based on variable values or user input',
      useCases: [
        'Route users based on their responses',
        'Check variable values and conditions',
        'Implement business logic and rules',
        'Create personalized flow paths'
      ],
      configuration: {
        conditions: 'Array of condition objects with variable, operator, value',
        defaultOutput: 'Default output handle when no conditions match',
        advancedMode: 'Boolean for custom JavaScript conditions'
      },
      bestPractices: [
        'Always provide a default output path',
        'Use clear variable names',
        'Test all condition branches',
        'Keep conditions simple and readable'
      ],
      examples: [
        {
          title: 'User Type Check',
          config: {
            conditions: [
              { variable: 'user_type', operator: 'equals', value: 'premium', output: 'premium' },
              { variable: 'user_type', operator: 'equals', value: 'basic', output: 'basic' }
            ],
            defaultOutput: 'unknown'
          }
        }
      ],
      tags: ['logic', 'branching', 'decision', 'routing']
    },

    ai_assistant: {
      name: 'AI Assistant',
      type: 'ai_assistant',
      category: 'AI & Intelligence',
      description: 'Integrate AI models (GPT via OpenAI, or multiple models via OpenRouter) for intelligent conversations',
      useCases: [
        'Provide intelligent customer support',
        'Answer complex questions dynamically',
        'Generate personalized content',
        'Implement conversational AI experiences'
      ],
      configuration: {
        provider: 'AI provider (openai, openrouter)',
        model: 'Specific model (gpt-4o, openai/gpt-4o-mini, anthropic/claude-3-5-sonnet)',
        prompt: 'System prompt with context and instructions',
        enableHistory: 'Boolean to maintain conversation history',
        historyLimit: 'Number of previous messages to include',
        temperature: 'Creativity level (0.0 - 1.0)',
        maxTokens: 'Maximum response length'
      },
      bestPractices: [
        'Write clear, specific prompts',
        'Include relevant context and variables',
        'Set appropriate temperature for use case',
        'Enable history for conversational flows',
        'Test with various inputs'
      ],
      examples: [
        {
          title: 'Customer Support AI',
          config: {
            provider: 'openai',
            model: 'gpt-4o',
            prompt: 'You are a helpful customer support assistant for {{company.name}}. Help users with their questions about our products and services. Be friendly, professional, and concise.',
            enableHistory: true,
            historyLimit: 10
          }
        }
      ],
      tags: ['ai', 'gpt', 'claude', 'intelligent', 'conversation']
    }
  };

  /**
   * Flow patterns database
   */
  private flowPatterns: FlowPattern[] = [
    {
      name: 'Welcome & Menu Flow',
      description: 'Standard welcome sequence with main menu options',
      useCases: ['onboarding', 'navigation', 'first-time users'],
      complexity: 'simple',
      nodes: ['trigger', 'message', 'quickreply'],
      structure: 'Linear with branching menu',
      tags: ['welcome', 'menu', 'basic', 'navigation']
    },
    {
      name: 'Lead Qualification Flow',
      description: 'Qualify leads with questions and route to appropriate team',
      useCases: ['sales', 'lead generation', 'qualification'],
      complexity: 'medium',
      nodes: ['trigger', 'message', 'data_capture', 'condition', 'webhook'],
      structure: 'Sequential data collection with conditional routing',
      tags: ['sales', 'leads', 'qualification', 'crm']
    },
    {
      name: 'AI Support Flow',
      description: 'Intelligent customer support with AI assistance',
      useCases: ['customer support', 'help desk', 'troubleshooting'],
      complexity: 'medium',
      nodes: ['trigger', 'message', 'ai_assistant', 'condition', 'bot_disable'],
      structure: 'AI-first with human escalation',
      tags: ['support', 'ai', 'help', 'escalation']
    }
  ];

  /**
   * Best practices database
   */
  private bestPractices: BestPractice[] = [
    {
      title: 'Always Start with Triggers',
      category: 'Flow Structure',
      description: 'Every flow should begin with a trigger node to define entry conditions',
      importance: 'critical',
      details: [
        'Triggers define when and how flows are activated',
        'Set appropriate channel types for your use case',
        'Use specific keywords for better targeting',
        'Enable session persistence for multi-step flows'
      ]
    },
    {
      title: 'Use Variables for Personalization',
      category: 'User Experience',
      description: 'Leverage variables to create personalized, dynamic conversations',
      importance: 'high',
      details: [
        'Use {{contact.name}} for personal greetings',
        'Store user responses in variables for later use',
        'System variables provide context about the conversation',
        'Custom variables can be set by data capture and AI nodes'
      ]
    },
    {
      title: 'Implement Error Handling',
      category: 'Reliability',
      description: 'Always provide fallback paths and error handling',
      importance: 'high',
      details: [
        'Use default outputs in condition nodes',
        'Provide "I don\'t understand" responses',
        'Include human escalation options',
        'Test edge cases and unexpected inputs'
      ]
    }
  ];

  /**
   * Variable examples database
   */
  private variableExamples: VariableExample[] = [
    {
      category: 'Contact Variables',
      variables: [
        { name: '{{contact.name}}', description: 'Contact\'s name', example: 'John Doe' },
        { name: '{{contact.phone}}', description: 'Contact\'s phone number', example: '+1234567890' },
        { name: '{{contact.email}}', description: 'Contact\'s email address', example: 'john@example.com' }
      ]
    },
    {
      category: 'Message Variables',
      variables: [
        { name: '{{message.content}}', description: 'Current message text', example: 'Hello, I need help' },
        { name: '{{message.timestamp}}', description: 'Message timestamp', example: '2024-01-15 10:30:00' },
        { name: '{{message.type}}', description: 'Message type', example: 'text' }
      ]
    },
    {
      category: 'Flow Variables',
      variables: [
        { name: '{{flow.id}}', description: 'Current flow ID', example: '123' },
        { name: '{{session.id}}', description: 'Session ID', example: 'sess_abc123' },
        { name: '{{user_input}}', description: 'Last user input', example: 'I want to buy a product' }
      ]
    }
  ];
}


interface NodeTypeInfo {
  name: string;
  type: string;
  category: string;
  description: string;
  useCases: string[];
  configuration: { [key: string]: string };
  bestPractices: string[];
  examples: { title: string; config: any }[];
  tags: string[];
}

interface FlowPattern {
  name: string;
  description: string;
  useCases: string[];
  complexity: 'simple' | 'medium' | 'complex';
  nodes: string[];
  structure: string;
  tags: string[];
}

interface BestPractice {
  title: string;
  category: string;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  details: string[];
}

interface VariableExample {
  category: string;
  variables: { name: string; description: string; example: string }[];
}

interface SearchResult {
  type: 'node' | 'pattern' | 'practice';
  title: string;
  description: string;
  content: any;
  score: number;
}

export const aiFlowKnowledgeBase = AIFlowKnowledgeBase.getInstance();
