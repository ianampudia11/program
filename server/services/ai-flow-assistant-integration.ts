/**
 * AI Flow Assistant Integration Layer
 * Connects enhanced capabilities with existing system
 */

import { EnhancedAIFlowAssistant } from './ai-flow-assistant-enhanced';
import { aiFlowAssistantService } from './ai-flow-assistant';
import { NodeKnowledgeBase } from './ai-flow-node-knowledge';
import { logger } from '../utils/logger';

interface IntegrationConfig {
  enableEnhancedFeatures: boolean;
  enableLearning: boolean;
  enableOptimization: boolean;
  enableContextAnalysis: boolean;
  fallbackToBasic: boolean;
}

export class AIFlowAssistantIntegration {
  private static instance: AIFlowAssistantIntegration;
  private enhancedAssistant: EnhancedAIFlowAssistant;
  private basicAssistant: typeof aiFlowAssistantService;
  private nodeKnowledge: NodeKnowledgeBase;
  private config: IntegrationConfig;

  static getInstance(): AIFlowAssistantIntegration {
    if (!AIFlowAssistantIntegration.instance) {
      AIFlowAssistantIntegration.instance = new AIFlowAssistantIntegration();
    }
    return AIFlowAssistantIntegration.instance;
  }

  constructor() {
    this.enhancedAssistant = EnhancedAIFlowAssistant.getInstance();
    this.basicAssistant = aiFlowAssistantService;
    this.nodeKnowledge = NodeKnowledgeBase.getInstance();
    this.config = {
      enableEnhancedFeatures: true,
      enableLearning: true,
      enableOptimization: true,
      enableContextAnalysis: true,
      fallbackToBasic: true
    };
  }

  /**
   * Initialize the integration layer
   */
  async initialize(): Promise<void> {
    try {
      await this.enhancedAssistant.initialize();
      await this.nodeKnowledge.initializeNodeKnowledge();
      logger.info('AIFlowAssistantIntegration', 'Enhanced AI Flow Assistant initialized successfully');
    } catch (error) {
      logger.error('AIFlowAssistantIntegration', 'Failed to initialize enhanced features', error);
      if (this.config.fallbackToBasic) {
        logger.info('AIFlowAssistantIntegration', 'Falling back to basic assistant');
      }
    }
  }

  /**
   * Process chat request with enhanced capabilities
   */
  async processChatRequest(request: {
    message: string;
    flowId?: number;
    conversationHistory: any[];
    companyId: number;
    userId: number;
    credentialSource?: 'auto' | 'company' | 'system' | 'manual';
    apiKey?: string;
  }): Promise<{
    message: string;
    flowSuggestion?: any;
    suggestions?: string[];
    error?: string;
    enhanced?: boolean;
  }> {
    try {

      if (this.config.enableEnhancedFeatures && await this.isEnhancedAvailable()) {
        return await this.processWithEnhancedFeatures(request);
      } else {
        return await this.processWithBasicFeatures(request);
      }
    } catch (error) {
      logger.error('AIFlowAssistantIntegration', 'Error processing chat request', error);
      
      if (this.config.fallbackToBasic) {
        return await this.processWithBasicFeatures(request);
      } else {
        throw error;
      }
    }
  }

  /**
   * Process with enhanced features
   */
  private async processWithEnhancedFeatures(request: any): Promise<any> {
    const context = await this.buildContext(request);
    

    const intentAnalysis = await this.analyzeUserIntentEnhanced(request.message, context);
    

    if (this.shouldGenerateFlow(request.message, intentAnalysis)) {
      const enhancedSuggestion = await this.enhancedAssistant.generateEnhancedFlowSuggestion(
        request.message,
        context,
        request.flowId
      );
      
      return {
        message: this.generateEnhancedResponse(enhancedSuggestion, intentAnalysis),
        flowSuggestion: this.convertToBasicFormat(enhancedSuggestion),
        suggestions: this.generateIntelligentSuggestions(enhancedSuggestion, intentAnalysis),
        enhanced: true
      };
    } else {

      const guidance = await this.generateEnhancedGuidance(request.message, context, intentAnalysis);
      
      return {
        message: guidance.message,
        suggestions: guidance.suggestions,
        enhanced: true
      };
    }
  }

  /**
   * Process with basic features (fallback)
   */
  private async processWithBasicFeatures(request: any): Promise<any> {
    return await this.basicAssistant.processChat(request);
  }

  /**
   * Check if enhanced features are available
   */
  private async isEnhancedAvailable(): Promise<boolean> {
    try {

      return this.enhancedAssistant !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build context for enhanced processing
   */
  private async buildContext(request: any): Promise<any> {
    const context = {
      companyId: request.companyId,
      userId: request.userId,
      flowId: request.flowId,
      conversationHistory: request.conversationHistory,
      timestamp: new Date(),
      userPreferences: await this.getUserPreferences(request.userId),
      companySettings: await this.getCompanySettings(request.companyId),
      flowContext: request.flowId ? await this.getFlowContext(request.flowId) : null
    };
    
    return context;
  }

  /**
   * Analyze user intent with enhanced NLP
   */
  private async analyzeUserIntentEnhanced(message: string, context: any): Promise<any> {

    const analysis = {
      primaryIntent: this.extractPrimaryIntent(message),
      secondaryIntents: this.extractSecondaryIntents(message),
      requirements: this.extractRequirements(message),
      constraints: this.extractConstraints(message),
      industry: this.detectIndustry(message, context),
      useCase: this.detectUseCase(message),
      complexity: this.assessComplexity(message),
      performance: this.assessPerformanceRequirements(message),
      integrations: this.detectIntegrations(message),
      timeline: this.extractTimeline(message),
      budget: this.extractBudget(message),
      confidence: this.calculateIntentConfidence(message)
    };
    
    return analysis;
  }

  /**
   * Determine if flow generation is needed
   */
  private shouldGenerateFlow(message: string, intentAnalysis: any): boolean {
    const flowKeywords = [
      'create', 'build', 'generate', 'make', 'design', 'setup',
      'flow', 'automation', 'workflow', 'process', 'sequence'
    ];
    
    const hasFlowKeywords = flowKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    const hasIntent = intentAnalysis.primaryIntent === 'create' || 
                     intentAnalysis.primaryIntent === 'build';
    
    return hasFlowKeywords || hasIntent;
  }

  /**
   * Generate enhanced response
   */
  private generateEnhancedResponse(suggestion: any, intentAnalysis: any): string {
    return `I've analyzed your requirements and created an enhanced flow solution!

**${suggestion.title}**

${suggestion.description}

**Key Features:**
- ${suggestion.nodes.length} intelligently configured nodes
- ${suggestion.edges.length} optimized connections
- ${suggestion.complexity} complexity level
- ${Math.round(suggestion.confidence * 100)}% confidence score
- Estimated cost: $${suggestion.estimatedCost.toFixed(2)}
- Reliability: ${Math.round(suggestion.reliability * 100)}%

**Performance Metrics:**
- Execution Time: ${suggestion.performance.executionTime}ms
- Resource Usage: ${suggestion.performance.resourceUsage}%
- Scalability: ${suggestion.performance.scalability}/10

**Reasoning:**
${suggestion.reasoning}

This flow is specifically designed for ${intentAnalysis.industry.join(', ')} industry with ${intentAnalysis.useCase.join(', ')} use cases. You can preview the details below and apply it when ready.`;
  }

  /**
   * Convert enhanced suggestion to basic format
   */
  private convertToBasicFormat(enhancedSuggestion: any): any {
    return {
      id: enhancedSuggestion.id,
      title: enhancedSuggestion.title,
      description: enhancedSuggestion.description,
      nodes: enhancedSuggestion.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        data: node.data,
        position: node.position
      })),
      edges: enhancedSuggestion.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type
      })),
      confidence: enhancedSuggestion.confidence,
      reasoning: enhancedSuggestion.reasoning
    };
  }

  /**
   * Generate intelligent suggestions
   */
  private generateIntelligentSuggestions(suggestion: any, intentAnalysis: any): string[] {
    const suggestions: string[] = [];
    

    if (suggestion.performance.executionTime > 5000) {
      suggestions.push('Consider optimizing slow nodes for better performance');
    }
    

    if (suggestion.estimatedCost > 1.0) {
      suggestions.push('Review node configurations to optimize costs');
    }
    

    if (suggestion.reliability < 0.9) {
      suggestions.push('Add error handling nodes for better reliability');
    }
    

    if (intentAnalysis.industry.includes('healthcare')) {
      suggestions.push('Consider adding HIPAA compliance nodes');
    }
    
    if (intentAnalysis.industry.includes('finance')) {
      suggestions.push('Add security and encryption nodes');
    }
    
    return suggestions;
  }

  /**
   * Generate enhanced guidance
   */
  private async generateEnhancedGuidance(
    message: string, 
    context: any, 
    intentAnalysis: any
  ): Promise<{ message: string; suggestions: string[] }> {
    const guidance = {
      message: `Based on your request for "${intentAnalysis.primaryIntent}", I can help you with several approaches:

**For ${intentAnalysis.complexity} complexity flows:**
- ${intentAnalysis.industry.join(', ')} industry best practices
- ${intentAnalysis.useCase.join(', ')} use case optimization
- Performance and cost considerations

**Available Options:**
1. **Create New Flow** - Build a complete automation from scratch
2. **Optimize Existing** - Improve your current flow performance
3. **Add Integrations** - Connect with external services
4. **Debug Issues** - Fix problems in existing flows

What would you like to focus on?`,
      suggestions: [
        'Create a new flow',
        'Optimize existing flow',
        'Add specific integrations',
        'Debug current issues',
        'Learn about best practices'
      ]
    };
    
    return guidance;
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: number): Promise<any> {

    return {
      preferredComplexity: 'medium',
      preferredIndustry: 'general',
      budget: 'medium',
      timeline: 'flexible'
    };
  }

  /**
   * Get company settings
   */
  private async getCompanySettings(companyId: number): Promise<any> {

    return {
      industry: 'technology',
      size: 'medium',
      integrations: ['google', 'salesforce'],
      preferences: {
        aiProvider: 'openai',
        complexity: 'medium'
      }
    };
  }

  /**
   * Get flow context
   */
  private async getFlowContext(flowId: number): Promise<any> {

    return {
      nodeCount: 5,
      complexity: 'medium',
      performance: 'good',
      issues: []
    };
  }


  private extractPrimaryIntent(message: string): string {
    const intents = {
      'create': ['create', 'build', 'make', 'generate', 'design'],
      'optimize': ['optimize', 'improve', 'enhance', 'better'],
      'debug': ['debug', 'fix', 'error', 'problem', 'issue'],
      'learn': ['learn', 'understand', 'explain', 'how', 'what']
    };
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return intent;
      }
    }
    
    return 'help';
  }

  private extractSecondaryIntents(message: string): string[] {
    const intents: string[] = [];
    
    if (message.includes('automate')) intents.push('automation');
    if (message.includes('integrate')) intents.push('integration');
    if (message.includes('scale')) intents.push('scaling');
    if (message.includes('monitor')) intents.push('monitoring');
    
    return intents;
  }

  private extractRequirements(message: string): string[] {
    const requirements: string[] = [];
    
    if (message.includes('AI') || message.includes('chatbot')) requirements.push('ai');
    if (message.includes('API') || message.includes('webhook')) requirements.push('api');
    if (message.includes('database') || message.includes('CRM')) requirements.push('data');
    if (message.includes('email') || message.includes('notification')) requirements.push('communication');
    
    return requirements;
  }

  private extractConstraints(message: string): string[] {
    const constraints: string[] = [];
    
    if (message.includes('budget') || message.includes('cost')) constraints.push('budget');
    if (message.includes('time') || message.includes('deadline')) constraints.push('time');
    if (message.includes('security') || message.includes('compliance')) constraints.push('security');
    if (message.includes('simple') || message.includes('basic')) constraints.push('simplicity');
    
    return constraints;
  }

  private detectIndustry(message: string, context: any): string[] {
    const industries: string[] = [];
    
    if (message.includes('ecommerce') || message.includes('shop')) industries.push('ecommerce');
    if (message.includes('healthcare') || message.includes('medical')) industries.push('healthcare');
    if (message.includes('education') || message.includes('learning')) industries.push('education');
    if (message.includes('finance') || message.includes('banking')) industries.push('finance');
    
    return industries;
  }

  private detectUseCase(message: string): string[] {
    const useCases: string[] = [];
    
    if (message.includes('support') || message.includes('help')) useCases.push('support');
    if (message.includes('sales') || message.includes('lead')) useCases.push('sales');
    if (message.includes('onboarding') || message.includes('welcome')) useCases.push('onboarding');
    if (message.includes('marketing') || message.includes('campaign')) useCases.push('marketing');
    
    return useCases;
  }

  private assessComplexity(message: string): string {
    if (message.includes('complex') || message.includes('advanced')) return 'complex';
    if (message.includes('simple') || message.includes('basic')) return 'simple';
    return 'medium';
  }

  private assessPerformanceRequirements(message: string): any {
    return {
      executionTime: message.includes('fast') ? 'high' : 'medium',
      resourceUsage: message.includes('efficient') ? 'low' : 'medium',
      scalability: message.includes('scale') ? 'high' : 'medium'
    };
  }

  private detectIntegrations(message: string): string[] {
    const integrations: string[] = [];
    
    if (message.includes('Google') || message.includes('Gmail')) integrations.push('google');
    if (message.includes('Salesforce') || message.includes('CRM')) integrations.push('salesforce');
    if (message.includes('Slack') || message.includes('Teams')) integrations.push('slack');
    if (message.includes('WhatsApp') || message.includes('Telegram')) integrations.push('messaging');
    
    return integrations;
  }

  private extractTimeline(message: string): string {
    if (message.includes('urgent') || message.includes('ASAP')) return 'urgent';
    if (message.includes('week') || message.includes('month')) return 'planned';
    return 'flexible';
  }

  private extractBudget(message: string): string {
    if (message.includes('free') || message.includes('low cost')) return 'low';
    if (message.includes('premium') || message.includes('enterprise')) return 'high';
    return 'medium';
  }

  private calculateIntentConfidence(message: string): number {

    const clarity = message.length > 20 ? 0.8 : 0.6;
    const specificity = message.includes('?') ? 0.9 : 0.7;
    return (clarity + specificity) / 2;
  }
}
