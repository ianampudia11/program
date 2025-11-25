import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Wand2,
  Eye,
  Check,
  AlertCircle,
  RefreshCw,
  Settings,
  Key,
  Shield,
  Building,
  Minimize2,
  Maximize2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { FlowPreviewModal } from './FlowPreviewModal';

interface WhatsAppTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  flowSuggestion?: FlowSuggestion;
  error?: boolean;
  templates?: WhatsAppTemplate[];
}

interface FlowSuggestion {
  id: string;
  title: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    data: any;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
  confidence: number;
  reasoning: string;
}

interface AIFlowAssistantProps {
  flowId?: number;
  onApplyFlow?: (suggestion: FlowSuggestion) => void;
  onAddNode?: (type: string, data?: any, position?: { x: number; y: number }) => void;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AIFlowAssistant({
  flowId,
  onApplyFlow,
  onAddNode,
  className = '',
  isOpen: externalIsOpen = false,
  onClose
}: AIFlowAssistantProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen || internalIsOpen;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<FlowSuggestion | null>(null);
  const [credentialSource, setCredentialSource] = useState<'auto' | 'company' | 'system'>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);


  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);


  const whatsappTemplates: WhatsAppTemplate[] = [
    {
      id: 'lead-qualification',
      title: '🎯 Lead Qualification Bot',
      description: 'Qualify leads, capture contact info, and add to CRM pipeline',
      prompt: 'Create a WhatsApp bot that qualifies leads by asking about their business needs, budget, and timeline. Capture their contact information and automatically add qualified leads to the CRM pipeline with appropriate stage.'
    },
    {
      id: 'product-brochure',
      title: '📋 Product Brochure Sharing',
      description: 'AI bot that shares product brochures and captures leads',
      prompt: 'Create a WhatsApp bot with AI assistant that can share product brochures when customers ask for them. The bot should also capture user information as leads and add them to the sales pipeline.'
    },
    {
      id: 'appointment-booking',
      title: '📅 Appointment Booking Bot',
      description: 'Schedule appointments and sync with calendar',
      prompt: 'Create a WhatsApp appointment booking bot that uses AI to understand customer requests, check calendar availability, and book appointments. Include confirmation messages and calendar integration.'
    },
    {
      id: 'customer-support',
      title: '🛠️ Customer Support Bot',
      description: 'AI-powered support with knowledge base integration',
      prompt: 'Create a WhatsApp customer support bot with AI assistant that can answer common questions using knowledge base, escalate complex issues to human agents, and provide helpful resources.'
    },
    {
      id: 'order-tracking',
      title: '📦 Order Tracking Bot',
      description: 'Track orders and provide delivery updates',
      prompt: 'Create a WhatsApp bot that helps customers track their orders by asking for order numbers, providing delivery status updates, and handling delivery-related inquiries with AI assistance.'
    },
    {
      id: 'feedback-collection',
      title: '⭐ Feedback Collection Bot',
      description: 'Collect customer feedback and reviews',
      prompt: 'Create a WhatsApp bot that collects customer feedback after purchases, asks for ratings and reviews, and stores feedback data for analysis. Include follow-up actions for negative feedback.'
    }
  ];

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `👋 Hi! I'm your AI Flow Assistant.

Choose a WhatsApp bot template to get started instantly, or describe your own custom flow:`,
        timestamp: new Date(),
        templates: whatsappTemplates
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const handleTemplateClick = async (template: WhatsAppTemplate) => {

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: `${template.title}: ${template.description}`,
      timestamp: new Date()
    };


    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-flow-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: template.prompt,
          conversationHistory: messages.slice(-10).map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          })),
          flowId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();


      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.message,
          timestamp: new Date(),
          flowSuggestion: data.flowSuggestion
        };
        return [...withoutTyping, assistantMessage];
      });

    } catch (error) {
      console.error('Error sending template message:', error);


      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your template. Please try again.',
          timestamp: new Date(),
          error: true
        };
        return [...withoutTyping, errorMessage];
      });

      toast({
        title: "Error",
        description: "Failed to process template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-flow-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          flowId,
          conversationHistory: messages.slice(-10).map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          })), // Send last 10 messages for context
          credentialSource
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        

        if (errorMessage.includes('API key') || errorMessage.includes('credential')) {
          toast({
            title: 'API Key Error',
            description: errorMessage,
            variant: 'destructive'
          });
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.message,
        timestamp: new Date(),
        flowSuggestion: data.flowSuggestion
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI Flow Assistant error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `I apologize, but I'm having trouble processing your request right now. Please try again in a moment.

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "AI Assistant Error",
        description: "Failed to get response from AI assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };



  const applyFlowSuggestion = (suggestion: FlowSuggestion) => {
    if (onApplyFlow) {
      onApplyFlow(suggestion);
      toast({
        title: "Flow Applied",
        description: `Successfully applied "${suggestion.title}" to your flow builder.`,
      });
    }
  };

  const previewFlowSuggestion = (suggestion: FlowSuggestion) => {
    setSelectedSuggestion(suggestion);
    setPreviewModalOpen(true);
  };

  const handlePreviewApprove = (suggestion: FlowSuggestion) => {
    applyFlowSuggestion(suggestion);
    setPreviewModalOpen(false);
    setSelectedSuggestion(null);
  };

  const handlePreviewReject = () => {
    setPreviewModalOpen(false);
    setSelectedSuggestion(null);
  };

  const handlePreviewModify = (modifiedSuggestion: FlowSuggestion) => {
    setSelectedSuggestion(modifiedSuggestion);
  };

  const clearChat = () => {
    setMessages([]);
  };


  if (!isOpen) {
    return null;











































  }


  const containerClasses = isMobile
    ? `fixed inset-0 z-50 ${className}`
    : isFullscreen
      ? `fixed inset-4 z-50 ${className}`
      : `fixed right-6 bottom-6 top-6 w-96 z-50 ${className}`;

  const cardClasses = isMobile
    ? "h-full w-full flex flex-col shadow-none border-0 bg-background rounded-none"
    : "h-full flex flex-col shadow-2xl border-0 bg-background/95 backdrop-blur-sm rounded-xl";

  return (
    <motion.div
      initial={{
        x: isMobile ? 0 : 400,
        y: isMobile ? '100%' : 0,
        opacity: 0,
        scale: isMobile ? 0.95 : 1
      }}
      animate={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1
      }}
      exit={{
        x: isMobile ? 0 : 400,
        y: isMobile ? '100%' : 0,
        opacity: 0,
        scale: isMobile ? 0.95 : 1
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 200
      }}
      className={containerClasses}
    >
      <Card className={cardClasses}>
        <CardHeader className={`pb-3 border-b ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className={`font-semibold ${isMobile ? 'text-base' : 'text-sm'}`}>
                  AI Flow Assistant
                </CardTitle>
                <div className="flex items-center pointer-events-none">
                  <Badge
                    variant="secondary"
                    className={`bg-green-500 text-white border-0 shadow-sm font-medium ${isMobile ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'}`}
                  >
                    BETA
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0 hover:bg-muted/50"
                  title={isFullscreen ? "Minimize" : "Maximize"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-0 hover:bg-muted/50 ${isMobile ? 'h-9 w-9' : 'h-8 w-8'}`}
                title="AI Configuration"
              >
                <Settings className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className={`p-0 hover:bg-muted/50 ${isMobile ? 'h-9 w-9' : 'h-8 w-8'}`}
                title="Clear Chat"
              >
                <RefreshCw className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    setInternalIsOpen(false);
                  }
                }}
                className={`p-0 hover:bg-muted/50 ${isMobile ? 'h-9 w-9' : 'h-8 w-8'}`}
                title="Close"
              >
                <X className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
            </div>
          </div>

          {/* AI Configuration Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b"
              >
                <div className={`bg-muted/30 ${isMobile ? 'p-4' : 'p-4'}`}>
                  <div className={`space-y-${isMobile ? '4' : '3'}`}>
                    <div>
                      <Label className={`font-medium text-muted-foreground flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                        <Key className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                        Credential Source
                      </Label>
                      <Select value={credentialSource} onValueChange={(value: 'auto' | 'company' | 'system') => setCredentialSource(value)}>
                        <SelectTrigger className={`mt-2 ${isMobile ? 'text-sm h-10' : 'text-xs h-7'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">
                            <div className="flex items-center gap-2">
                              <Shield className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                              <span className={isMobile ? 'text-sm' : 'text-xs'}>
                                Auto (Company → System)
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="company">
                            <div className="flex items-center gap-2">
                              <Building className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                              <span className={isMobile ? 'text-sm' : 'text-xs'}>
                                Company Credentials
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Shield className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                              <span className={isMobile ? 'text-sm' : 'text-xs'}>
                                System Credentials
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-[10px]'}`}>
                      {credentialSource === 'auto' && (
                        <span className="flex items-center gap-2">
                          <Shield className={`text-blue-500 ${isMobile ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                          Will use company credentials first, then fallback to system credentials
                        </span>
                      )}
                      {credentialSource === 'company' && (
                        <span className="flex items-center gap-2">
                          <Building className={`text-green-500 ${isMobile ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                          Using company-configured OpenAI credentials
                        </span>
                      )}
                      {credentialSource === 'system' && (
                        <span className="flex items-center gap-2">
                          <Shield className={`text-blue-500 ${isMobile ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                          Using system-level OpenAI credentials
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'p-4' : 'p-4'}`} style={{ maxHeight: '100%' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 min-h-0">
                <div className={`p-6 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 ${isMobile ? 'p-8' : 'p-6'}`}>
                  <Sparkles className={`text-purple-600 ${isMobile ? 'h-12 w-12' : 'h-8 w-8'}`} />
                </div>
                <div className="space-y-3">
                  <h3 className={`font-semibold text-foreground ${isMobile ? 'text-xl' : 'text-lg'}`}>
                    Welcome to AI Flow Assistant
                  </h3>
                  <p className={`text-muted-foreground max-w-sm leading-relaxed ${isMobile ? 'text-base px-4' : 'text-sm'}`}>
                    Describe your automation scenario and I'll help you build the perfect flow with intelligent suggestions.
                  </p>
                </div>
                <div className={`grid grid-cols-1 gap-3 w-full max-w-sm ${isMobile ? 'px-4' : ''}`}>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    className="justify-start text-left h-auto p-3 hover:bg-muted/50"
                    onClick={() => setInputValue("Create a customer support flow")}
                  >
                    <div className="text-left">
                      <div className="font-medium">Customer Support</div>
                      <div className="text-xs text-muted-foreground">Handle inquiries and tickets</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    className="justify-start text-left h-auto p-3 hover:bg-muted/50"
                    onClick={() => setInputValue("Build a lead qualification flow")}
                  >
                    <div className="text-left">
                      <div className="font-medium">Lead Qualification</div>
                      <div className="text-xs text-muted-foreground">Qualify and route leads</div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`space-y-${isMobile ? '6' : '4'} min-h-0`}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onApplyFlow={applyFlowSuggestion}
                    onPreviewFlow={previewFlowSuggestion}
                    onTemplateClick={handleTemplateClick}
                    isLoading={isLoading}
                    isMobile={isMobile}
                  />
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className={`border-t bg-background/50 backdrop-blur-sm ${isMobile ? 'p-4' : 'p-4'}`}>
            <div className={`flex gap-${isMobile ? '3' : '2'}`}>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={isMobile ? "Describe your flow..." : "Describe your automation scenario..."}
                disabled={isLoading}
                className={`flex-1 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 ${
                  isMobile ? 'h-12 text-base' : 'h-10 text-sm'
                }`}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                size={isMobile ? "default" : "sm"}
                className={`transition-all duration-200 hover:scale-105 ${
                  isMobile ? 'h-12 w-12 p-0' : 'px-3'
                } ${
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    : ''
                }`}
              >
                {isLoading ? (
                  <Loader2 className={`animate-spin ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                ) : (
                  <Send className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                )}
              </Button>
            </div>
            {isMobile && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Press Enter to send • Powered by GPT-4o
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flow Preview Modal */}
      <FlowPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        suggestion={selectedSuggestion}
        onApprove={handlePreviewApprove}
        onReject={handlePreviewReject}
        onModify={handlePreviewModify}
      />
    </motion.div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onApplyFlow?: (suggestion: FlowSuggestion) => void;
  onPreviewFlow?: (suggestion: FlowSuggestion) => void;
  onTemplateClick?: (template: WhatsAppTemplate) => void;
  isLoading?: boolean;
  isMobile?: boolean;
}


function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-background border border-border/50 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-muted-foreground">AI is thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}


function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString();
}


function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {

  const formatContent = (text: string): string => {
    const codeClass = isUser
      ? 'inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-white/20 text-white'
      : 'inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-foreground';

    return text

      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')

      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>')

      .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`)

      .replace(/\n/g, '<br>')

      .replace(/^[•\-]\s+(.+)$/gm, '<div class="flex items-start gap-2 my-1"><span class="mt-0.5 opacity-70">•</span><span>$1</span></div>');
  };

  const formattedContent = formatContent(content);

  return (
    <div
      className="whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'anywhere'
      }}
    />
  );
}

function MessageBubble({ message, onApplyFlow, onPreviewFlow, onTemplateClick, isLoading = false, isMobile = false }: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = message.type === 'user';
  const hasFlowSuggestion = message.flowSuggestion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 p-2 rounded-xl shadow-sm ${
        isUser
          ? 'bg-gradient-to-r from-blue-600 to-blue-700'
          : message.error
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-purple-600 to-blue-600'
      }`}>
        {isUser ? (
          <User className={`text-white ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
        ) : message.error ? (
          <AlertCircle className={`text-white ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
        ) : (
          <Bot className={`text-white ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isMobile ? 'max-w-[85%]' : 'max-w-[75%]'} ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl shadow-sm break-words ${
          isMobile ? 'p-4' : 'p-3'
        } ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto'
            : message.error
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-background border border-border/50'
        }`}>
          <div className={`leading-relaxed break-words overflow-wrap-anywhere ${
            isMobile ? 'text-base' : 'text-sm'
          } ${
            isUser ? 'text-white' : message.error ? 'text-red-800' : 'text-foreground'
          }`}>
            <MessageContent content={message.content} isUser={isUser} />
          </div>

          {/* WhatsApp Templates */}
          {message.templates && message.templates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-6 space-y-4"
            >
              {/* Templates Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787"/>
                  </svg>
                </div>
                <div>
                  <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-sm'} text-foreground`}>
                    WhatsApp Bot Templates
                  </h3>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
                    Choose a template to get started instantly
                  </p>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {message.templates.map((template, index) => (
                  <motion.button
                    key={template.id}
                    onClick={() => onTemplateClick?.(template)}
                    disabled={isLoading}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      group relative p-5 rounded-xl border text-left transition-all duration-300
                      ${isLoading
                        ? 'opacity-50 cursor-not-allowed border-border bg-muted/50'
                        : 'border-border hover:border-primary/30 bg-card hover:bg-accent/30 cursor-pointer shadow-sm hover:shadow-md'
                      }
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                      backdrop-blur-sm
                    `}
                  >
                    {/* Template Icon & Title */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300">
                        <span className="text-lg">{template.title.split(' ')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold mb-1 ${
                          isMobile ? 'text-base' : 'text-sm'
                        } text-foreground group-hover:text-primary transition-colors truncate`}>
                          {template.title.replace(/^[^\s]+\s/, '')}
                        </h4>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <svg
                          className="w-3 h-3 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Template Description */}
                    <p className={`${
                      isMobile ? 'text-sm' : 'text-xs'
                    } text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80 transition-colors`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                      {template.description}
                    </p>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </motion.button>
                ))}
              </div>

              {/* Custom Flow Option */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="relative"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="text-center p-4 rounded-lg bg-muted/30 border border-dashed border-border"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className={`font-medium ${isMobile ? 'text-sm' : 'text-xs'} text-foreground`}>
                    Custom Flow
                  </span>
                </div>
                <p className={`${
                  isMobile ? 'text-sm' : 'text-xs'
                } text-muted-foreground`}>
                  Describe your own automation scenario below
                </p>
              </motion.div>
            </motion.div>
          )}

          {hasFlowSuggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-4 pt-4 border-t border-border/30"
            >
              <FlowSuggestionCard
                suggestion={message.flowSuggestion!}
                onApply={onApplyFlow}
                onPreview={onPreviewFlow}
                isExpanded={isExpanded}
                onToggleExpanded={() => setIsExpanded(!isExpanded)}
              />
            </motion.div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`flex items-center gap-2 mt-2 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span className={`text-muted-foreground flex items-center gap-1 ${
            isMobile ? 'text-xs' : 'text-[10px]'
          }`}>
            <Clock className="w-3 h-3" />
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface FlowSuggestionCardProps {
  suggestion: FlowSuggestion;
  onApply?: (suggestion: FlowSuggestion) => void;
  onPreview?: (suggestion: FlowSuggestion) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

function FlowSuggestionCard({
  suggestion,
  onApply,
  onPreview,
  isExpanded,
  onToggleExpanded
}: FlowSuggestionCardProps) {
  return (
    <div className="bg-background/50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-sm">{suggestion.title}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {Math.round(suggestion.confidence * 100)}% match
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        {suggestion.description}
      </p>
      
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-6 px-2 text-xs"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-border/30">
              <div className="text-xs text-muted-foreground mb-2">
                <strong>Nodes:</strong> {suggestion.nodes.length} | <strong>Connections:</strong> {suggestion.edges.length}
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                <strong>Reasoning:</strong> {suggestion.reasoning}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {suggestion.nodes.map((node) => (
                  <Badge key={node.id} variant="outline" className="text-xs">
                    {node.label}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onApply?.(suggestion)}
          className="flex-1 h-7 text-xs"
        >
          <Check className="h-3 w-3 mr-1" />
          Apply Flow
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview?.(suggestion)}
          className="h-7 px-2"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
