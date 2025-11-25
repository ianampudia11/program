import { Router } from 'express';
import { aiFlowAssistantService } from '../services/ai-flow-assistant';
import { ensureAuthenticated } from '../middleware';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { aiFlowPerformanceMonitor, aiFlowOptimizer } from '../utils/ai-flow-performance';

const router = Router();


const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  flowId: z.number().optional(),
  conversationHistory: z.array(z.object({
    id: z.string(),
    type: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().transform(str => new Date(str))
  })).default([]),
  credentialSource: z.enum(['auto', 'company', 'system']).default('auto')
});

const flowAnalysisSchema = z.object({
  flowId: z.number(),
  analysisType: z.enum(['optimization', 'validation', 'suggestions']).default('suggestions')
});

/**
 * POST /api/ai-flow-assistant/chat
 * Process chat message and generate AI response
 */
router.post('/chat', ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = chatRequestSchema.parse(req.body);
    
    if (!req.user?.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const chatRequest = {
      ...validatedData,
      companyId: req.user.companyId,
      userId: req.user.id
    };

    logger.info('AIFlowAssistant', `Processing chat request from user ${req.user.id}`, {
      messageLength: validatedData.message.length,
      flowId: validatedData.flowId,
      historyLength: validatedData.conversationHistory.length
    });

    const response = await aiFlowAssistantService.processChat(chatRequest);

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    logger.error('AIFlowAssistant', 'Error in chat endpoint', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/ai-flow-assistant/analyze-flow
 * Analyze existing flow and provide suggestions
 */
router.post('/analyze-flow', ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = flowAnalysisSchema.parse(req.body);
    
    if (!req.user?.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }


    const analysisPrompt = `Please analyze the current flow (ID: ${validatedData.flowId}) and provide ${validatedData.analysisType}. Focus on:

1. Flow structure and logic
2. Node configuration optimization
3. User experience improvements
4. Performance considerations
5. Best practice recommendations

Provide specific, actionable suggestions.`;

    const chatRequest = {
      message: analysisPrompt,
      flowId: validatedData.flowId,
      conversationHistory: [],
      companyId: req.user.companyId,
      userId: req.user.id
    };

    const response = await aiFlowAssistantService.processChat(chatRequest);

    res.json({
      success: true,
      analysisType: validatedData.analysisType,
      ...response
    });

  } catch (error) {
    logger.error('AIFlowAssistant', 'Error in analyze-flow endpoint', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to analyze flow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ai-flow-assistant/templates
 * Get flow templates and examples
 */
router.get('/templates', ensureAuthenticated, async (req, res) => {
  try {
    const templates = [
      {
        id: 'welcome-sequence',
        title: 'Welcome Sequence',
        description: 'A basic welcome flow with greeting and menu options',
        category: 'basic',
        nodes: 3,
        useCase: 'First-time user onboarding'
      },
      {
        id: 'lead-qualification',
        title: 'Lead Qualification',
        description: 'Qualify leads with questions and route to appropriate team',
        category: 'sales',
        nodes: 6,
        useCase: 'Sales lead processing'
      },
      {
        id: 'customer-support',
        title: 'Customer Support',
        description: 'Handle common support queries with AI assistance',
        category: 'support',
        nodes: 8,
        useCase: 'Automated customer support'
      },
      {
        id: 'appointment-booking',
        title: 'Appointment Booking',
        description: 'Book appointments with calendar integration',
        category: 'scheduling',
        nodes: 10,
        useCase: 'Service appointment scheduling'
      },
      {
        id: 'ecommerce-order',
        title: 'E-commerce Order Flow',
        description: 'Handle product inquiries and order processing',
        category: 'ecommerce',
        nodes: 12,
        useCase: 'Online store automation'
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    logger.error('AIFlowAssistant', 'Error in templates endpoint', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * POST /api/ai-flow-assistant/generate-from-template
 * Generate flow from template
 */
router.post('/generate-from-template', ensureAuthenticated, async (req, res) => {
  try {
    const { templateId, customization } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    if (!req.user?.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }


    const templatePrompt = `Generate a complete flow based on the "${templateId}" template. ${
      customization ? `Customize it with these requirements: ${customization}` : ''
    }

Please create a comprehensive flow with:
1. Proper trigger node setup
2. Logical message sequence
3. Interactive elements where appropriate
4. Error handling and fallbacks
5. Variable usage for personalization

Make it production-ready and follow PowerChat best practices.`;

    const chatRequest = {
      message: templatePrompt,
      conversationHistory: [],
      companyId: req.user.companyId,
      userId: req.user.id
    };

    const response = await aiFlowAssistantService.processChat(chatRequest);

    res.json({
      success: true,
      templateId,
      ...response
    });

  } catch (error) {
    logger.error('AIFlowAssistant', 'Error in generate-from-template endpoint', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate flow from template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ai-flow-assistant/node-help/:nodeType
 * Get help and configuration guidance for specific node types
 */
router.get('/node-help/:nodeType', ensureAuthenticated, async (req, res) => {
  try {
    const { nodeType } = req.params;
    
    if (!nodeType) {
      return res.status(400).json({
        success: false,
        error: 'Node type is required'
      });
    }

    if (!req.user?.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const helpPrompt = `Provide comprehensive help and configuration guidance for the "${nodeType}" node type in PowerChat. Include:

1. **Purpose & Use Cases**: What this node does and when to use it
2. **Configuration Options**: All available settings and parameters
3. **Best Practices**: How to configure it optimally
4. **Common Patterns**: Typical usage patterns and connections
5. **Examples**: Practical configuration examples
6. **Troubleshooting**: Common issues and solutions
7. **Variable Integration**: How to use variables with this node

Be specific and actionable. Provide code examples where relevant.`;

    const chatRequest = {
      message: helpPrompt,
      conversationHistory: [],
      companyId: req.user.companyId,
      userId: req.user.id
    };

    const response = await aiFlowAssistantService.processChat(chatRequest);

    res.json({
      success: true,
      nodeType,
      ...response
    });

  } catch (error) {
    logger.error('AIFlowAssistant', 'Error in node-help endpoint', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get node help',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ai-flow-assistant/health
 * Health check endpoint with performance metrics
 */
router.get('/health', (req, res) => {
  const healthStatus = aiFlowPerformanceMonitor.getHealthStatus();

  res.json({
    success: true,
    service: 'AI Flow Assistant',
    status: healthStatus.status,
    issues: healthStatus.issues,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/ai-flow-assistant/performance
 * Get performance statistics
 */
router.get('/performance', ensureAuthenticated, async (req, res) => {
  try {
    const stats = aiFlowPerformanceMonitor.getAllStats();
    const recommendations = aiFlowOptimizer.getRecommendations();

    res.json({
      success: true,
      stats,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AIFlowAssistant', 'Error getting performance stats', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get performance statistics'
    });
  }
});

export default router;
