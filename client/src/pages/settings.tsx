import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabs } from "@/components/ui/scrollable-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { TwilioIcon } from '@/components/icons/TwilioIcon';
import { useAvailablePlans, Plan } from "@/hooks/use-available-plans";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { PlanCard } from "@/components/settings/PlanCard";
import { CheckoutDialog } from "@/components/settings/CheckoutDialog";
import { SubscriptionManagement } from "@/components/settings/SubscriptionManagement";
import { AffiliateEarningsCard } from "@/components/settings/AffiliateEarningsCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  AlertTriangle,
  Settings2,
  Key,
  Plus,
  Trash,
  Edit
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { WhatsAppEmbeddedSignup } from '@/components/settings/WhatsAppEmbeddedSignup';
import { WhatsAppBusinessApiForm } from '@/components/settings/WhatsAppBusinessApiForm';
import { MetaWhatsAppIntegratedOnboarding } from '@/components/settings/MetaWhatsAppIntegratedOnboarding';
import { ApiAccessTab } from '@/components/settings/ApiAccessTab';
import { WhatsAppTwilioForm } from '@/components/settings/WhatsAppTwilioForm';
import { Unified360DialogSetup } from '@/components/settings/Unified360DialogSetup';
import { InstagramConnectionForm } from '@/components/settings/InstagramConnectionForm';
import { TwilioSmsConnectionForm } from '@/components/settings/TwilioSmsConnectionForm';
import { EnhancedInstagramConnectionForm } from '@/components/settings/EnhancedInstagramConnectionForm';
import { MessengerConnectionForm } from '@/components/settings/MessengerConnectionForm';
import { TikTokConnectionForm } from '@/components/settings/TikTokConnectionForm';
import { TelegramConnectionForm } from '@/components/settings/TelegramConnectionForm';
import { TeamMembersList } from '@/components/settings/TeamMembersList';
import { RolesAndPermissions } from '@/components/settings/RolesAndPermissions';
import { SmtpConfiguration } from '@/components/settings/SmtpConfiguration';
import { PartnerConfigurationForm } from '@/components/settings/PartnerConfigurationForm';
import { TikTokPlatformConfigForm } from '@/components/settings/TikTokPlatformConfigForm';
import { WhatsAppBehaviorSettings } from '@/components/settings/WhatsAppBehaviorSettings';
import { InboxSettings } from '@/components/settings/InboxSettings';
import { EmailChannelForm } from '@/components/settings/EmailChannelForm';
import { EditEmailChannelForm } from '@/components/settings/EditEmailChannelForm';
import { EditWhatsAppBusinessApiForm } from '@/components/settings/EditWhatsAppBusinessApiForm';
import { EditMessengerConnectionForm } from '@/components/settings/EditMessengerConnectionForm';
import { EditInstagramConnectionForm } from '@/components/settings/EditInstagramConnectionForm';
import { EditTikTokConnectionForm } from '@/components/settings/EditTikTokConnectionForm';
import { EditTwilioSmsConnectionForm } from '@/components/settings/EditTwilioSmsConnectionForm';
import { WebChatConnectionForm } from '@/components/settings/WebChatConnectionForm';
import { EditWebChatConnectionForm } from '@/components/settings/EditWebChatConnectionForm';
import ConnectionControl from '@/components/whatsapp/ConnectionControl';
import CompanyAiCredentialsTab from '@/components/settings/CompanyAiCredentialsTab';
import AiUsageAnalytics from '@/components/settings/AiUsageAnalytics';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  companyId: number;
  company?: {
    id: number;
    name: string;
    plan: string;
    planId: number;
    subscriptionStatus: string;
    subscriptionEndDate?: string;
  };
}

interface ChannelConnection {
  id: number;
  userId: number;
  channelType: string;
  accountId: string;
  accountName: string;
  connectionData: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const getActiveTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return tab || 'channels';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location]);

  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBusinessApiModal, setShowBusinessApiModal] = useState(false);
  const [showEmbeddedSignupModal, setShowEmbeddedSignupModal] = useState(false);
  const [showMetaIntegratedOnboardingModal, setShowMetaIntegratedOnboardingModal] = useState(false);
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [showUnified360DialogSetup, setShowUnified360DialogSetup] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showEnhancedInstagramModal, setShowEnhancedInstagramModal] = useState(false);
  const [showMessengerModal, setShowMessengerModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTwilioSmsModal, setShowTwilioSmsModal] = useState(false);
  const [showWebChatModal, setShowWebChatModal] = useState(false);
  const [showPartnerConfigModal, setShowPartnerConfigModal] = useState(false);
  const [showTikTokPlatformConfigModal, setShowTikTokPlatformConfigModal] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const { toast } = useToast();

  const { plans, isLoading: isLoadingPlans } = useAvailablePlans();

  const { paymentMethods, isLoading: isLoadingPaymentMethods } = usePaymentMethods();

  const { data: planInfo, isLoading: isLoadingPlanInfo } = useQuery({
    queryKey: ['/api/user/plan-info'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user/plan-info');
      if (!res.ok) throw new Error('Failed to fetch plan info');
      return res.json();
    },
  });

  const credentialsForm = useForm({
    defaultValues: {
      clientId: '',
      clientSecret: '',
      redirectUri: window.location.origin + '/api/google/callback'
    }
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
    refetchOnWindowFocus: false
  });

  const {
    data: fetchedConnections = [],
    refetch: refetchConnections
  } = useQuery<ChannelConnection[]>({
    queryKey: ['/api/channel-connections'],
    refetchOnWindowFocus: false
  });

  const {
    data: googleCalendarStatus,
    refetch: refetchGoogleCalendarStatus
  } = useQuery<{ connected: boolean; message: string }>({
    queryKey: ['/api/google/calendar/status'],
    refetchOnWindowFocus: false
  });

  const {
    data: googleCalendarCredentials,
    refetch: refetchGoogleCalendarCredentials
  } = useQuery<{ configured: boolean; clientId: string; clientSecret: string; redirectUri: string }>({
    queryKey: ['/api/google/credentials'],
    refetchOnWindowFocus: false,
    enabled: currentUser?.role === 'admin' || currentUser?.isSuperAdmin
  });

  useEffect(() => {
    if (googleCalendarCredentials) {
      credentialsForm.reset({
        clientId: googleCalendarCredentials.clientId || '',
        clientSecret: '',
        redirectUri: googleCalendarCredentials.redirectUri || window.location.origin + '/api/google/callback'
      });
    }
  }, [googleCalendarCredentials, credentialsForm]);

  const { data: googleCalendarAuthData } = useQuery<{ authUrl: string }>({
    queryKey: ['/api/google/auth'],
    refetchOnWindowFocus: false,
    enabled: googleCalendarCredentials?.configured === true
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/google/calendar/disconnect');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.google_calendar_disconnected', 'Google Calendar Disconnected'),
        description: t('settings.google_calendar_disconnect_success', 'Your Google Calendar account has been disconnected successfully.'),
      });
      refetchGoogleCalendarStatus();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.google_calendar_disconnect_error', 'Failed to disconnect Google Calendar: {{error}}', { error: error.message }),
        variant: 'destructive',
      });
    },
  });

  const updateGoogleCredentialsMutation = useMutation({
    mutationFn: async (credentials: { clientId: string; clientSecret: string; redirectUri: string }) => {
      const res = await apiRequest('POST', '/api/google/credentials', credentials);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.google_calendar_credentials_updated', 'Google Calendar Credentials Updated'),
        description: t('settings.google_calendar_credentials_success', 'Your Google OAuth credentials have been updated successfully.'),
      });
      setShowCredentialsModal(false);
      refetchGoogleCalendarCredentials();
      disconnectGoogleCalendarMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.google_calendar_credentials_error', 'Failed to update Google Calendar credentials: {{error}}', { error: error.message }),
        variant: 'destructive',
      });
    },
  });

  const [channelConnections, setChannelConnections] = useState<ChannelConnection[]>([]);

  useEffect(() => {
    setChannelConnections(fetchedConnections);
  }, [fetchedConnections]);

  const handleConnectionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
  };

  const handleSaveAccount = () => {
    toast({
      title: t('settings.account_updated', 'Account Updated'),
      description: t('settings.account_updated_success', 'Your account settings have been saved successfully'),
    });
  };



  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.api_key_empty_error', 'API key cannot be empty'),
        variant: "destructive"
      });
      return;
    }

    toast({
      title: t('settings.api_key_saved', 'API Key Saved'),
      description: t('settings.api_key_updated', 'Your API key has been updated'),
    });
    setApiKey('');
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsCheckoutDialogOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setIsCheckoutDialogOpen(false);
    toast({
      title: t('settings.subscription_updated', 'Subscription Updated'),
      description: t('settings.subscription_updated_success', 'Your subscription has been updated successfully'),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };

  const [showQrModal, setShowQrModal] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);


  const [proxyServers, setProxyServers] = useState<any[]>([]);
  const [selectedProxyForEdit, setSelectedProxyForEdit] = useState<any | null>(null);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [isLoadingProxies, setIsLoadingProxies] = useState(false);
  const [isDeletingProxy, setIsDeletingProxy] = useState<number | null>(null);
  const [isTestingProxyId, setIsTestingProxyId] = useState<number | null>(null);
  

  const [proxyFormData, setProxyFormData] = useState({
    name: '',
    enabled: true,
    type: 'http' as 'http' | 'https' | 'socks5',
    host: '',
    port: '',
    username: '',
    password: '',
    description: ''
  });


  const [selectedProxyId, setSelectedProxyId] = useState<number | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [awaitingManualQr, setAwaitingManualQr] = useState(false);
  const [qrGenerationInProgress, setQrGenerationInProgress] = useState(false);
  const [qrGenerationTimeout, setQrGenerationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [qrRetryCount, setQrRetryCount] = useState(0);
  const [qrRetryTimeout, setQrRetryTimeout] = useState<NodeJS.Timeout | null>(null);


  const memoizedWhatsAppQR = useMemo(() => {
    if (!qrCode) return null;
    
    return (
      <QRCodeSVG 
        value={qrCode} 
        size={256}
        className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[256px]"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    );
  }, [qrCode]);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameConnectionId, setRenameConnectionId] = useState<number | null>(null);
  const [newChannelName, setNewChannelName] = useState('');

  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editEmailConnectionId, setEditEmailConnectionId] = useState<number | null>(null);

  const [showEditWhatsAppModal, setShowEditWhatsAppModal] = useState(false);
  const [editWhatsAppConnectionId, setEditWhatsAppConnectionId] = useState<number | null>(null);

  const [showEditMessengerModal, setShowEditMessengerModal] = useState(false);
  const [editMessengerConnectionId, setEditMessengerConnectionId] = useState<number | null>(null);

  const [showEditInstagramModal, setShowEditInstagramModal] = useState(false);
  const [editInstagramConnectionId, setEditInstagramConnectionId] = useState<number | null>(null);

  const [showEditTikTokModal, setShowEditTikTokModal] = useState(false);
  const [editTikTokConnectionId, setEditTikTokConnectionId] = useState<number | null>(null);

  const [showEditTwilioSmsModal, setShowEditTwilioSmsModal] = useState(false);
  const [editTwilioSmsConnectionId, setEditTwilioSmsConnectionId] = useState<number | null>(null);
  const [showEditWebChatModal, setShowEditWebChatModal] = useState(false);
  const [editWebChatConnectionId, setEditWebChatConnectionId] = useState<number | null>(null);

  const [syncingChannels, setSyncingChannels] = useState<Set<number>>(new Set());


  const activeConnectionIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    activeConnectionIdRef.current = activeConnectionId;
  }, [activeConnectionId]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 2000;
    const socketRef = { current: socket };


    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        

        const currentActiveConnectionId = activeConnectionIdRef.current;

        if (data.type === 'whatsappQrCode' && currentActiveConnectionId && data.connectionId === currentActiveConnectionId) {
          setQrCode(data.qrCode);
          setConnectionStatus('qr_code');
          setAwaitingManualQr(false);setQrGenerationInProgress(false);
          setQrRetryCount(0);
          

          setQrGenerationTimeout(prev => {
            if (prev) clearTimeout(prev);
            return null;
          });
          setQrRetryTimeout(prev => {
            if (prev) clearTimeout(prev);
            return null;
          });
        }

        else if (data.type === 'whatsappConnectionStatus' && currentActiveConnectionId && data.connectionId === currentActiveConnectionId) {
          setConnectionStatus(data.status);
          setAwaitingManualQr(false);

          if (data.status === 'connected') {
            toast({
              title: t('settings.whatsapp_connected', 'WhatsApp Connected'),
              description: t('settings.whatsapp_connected_success', 'Your WhatsApp account has been connected successfully!'),
            });
            queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
            setTimeout(() => {
              setShowQrModal(false);
              setQrCode(null);
              setAwaitingManualQr(false);
            }, 2000);
          }
        }

        else if (data.type === 'whatsappConnectionError' && currentActiveConnectionId && data.connectionId === currentActiveConnectionId) {
          console.error('WhatsApp connection error:', data.error);
          setConnectionStatus('error');
          toast({
            title: t('settings.connection_error', 'Connection Error'),
            description: data.error,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    const reconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }

        setTimeout(() => {
          const newSocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

          newSocket.onopen = () => {
            reconnectAttempts = 0;

            if (currentUser?.id) {
              newSocket.send(JSON.stringify({
                type: 'authenticate',
                userId: currentUser.id
              }));
            }
          };

          newSocket.onmessage = handleWebSocketMessage;

          newSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          newSocket.onclose = () => {
            if (reconnectAttempts < maxReconnectAttempts) {
              setTimeout(reconnect, reconnectInterval);
            }
          };

          socketRef.current = newSocket;
        }, reconnectInterval);
      } else {
        console.error('Max reconnection attempts reached');

        setTimeout(() => {
          reconnectAttempts = 0;
        }, 60000);
      }
    };

    socket.onopen = () => {
      reconnectAttempts = 0;

      if (currentUser?.id) {
        socket.send(JSON.stringify({
          type: 'authenticate',
          userId: currentUser.id
        }));
      }
    };

    socket.onmessage = handleWebSocketMessage;

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      reconnect();
    };

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [currentUser?.id]);


  const handleConnectChannel = async (channelType: string) => {
    try {
      if (channelType === 'WhatsApp Unofficial') {

        setActiveConnectionId(null);
        setConnectionStatus('');
        setQrCode(null);
        setAwaitingManualQr(false);
        setQrGenerationInProgress(false);
        setSelectedProxyId(null); // Reset proxy selection
        setShowQrModal(true);
        

      } else if (channelType === 'WhatsApp Business API') {
        setShowBusinessApiModal(true);
      } else if (channelType === 'WhatsApp Business Embedded') {
        setShowEmbeddedSignupModal(true);
      } else if (channelType === 'WhatsApp Business API (Twilio)') {
        setShowTwilioModal(true);
      } else if (channelType === 'WhatsApp Business API (360Dialog)') {
        setShowUnified360DialogSetup(true);
      } else if (channelType === 'Instagram') {
        setShowInstagramModal(true);
      } else if (channelType === 'Messenger') {
        setShowMessengerModal(true);
      } else if (channelType === 'Twilio SMS') {
        setShowTwilioSmsModal(true);
      } else if (channelType === 'TikTok') {
        setShowTikTokModal(true);
      } else if (channelType === 'Telegram') {

        setShowTelegramModal(true);
      } else if (channelType === 'Email') {
        setShowEmailModal(true);
      } else if (channelType === 'WebChat') {
        setShowWebChatModal(true);
      } else {
        toast({
          title: "Channel Connection Initiated",
          description: `Starting connection flow for ${channelType}`,
        });
      }
    } catch (error: any) {
      console.error('Error connecting to channel:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to channel",
        variant: "destructive"
      });
    }
  };


  const generateQRCode = async (isManual: boolean = false, connectionId?: number) => {
    let targetConnectionId = connectionId || activeConnectionId;
    

    if (!targetConnectionId) {
      try {
        const response = await fetch('/api/channel-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channelType: 'whatsapp_unofficial',
            accountId: `whatsapp-${Date.now()}`,
            accountName: 'WhatsApp Personal',
            proxyServerId: selectedProxyId,
            connectionData: {}
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create WhatsApp connection');
        }

        const connection = await response.json();
        targetConnectionId = connection.id;
        setActiveConnectionId(connection.id);
      } catch (error: any) {
        toast({
          title: t('settings.error', 'Error'),
          description: error.message || 'Failed to create connection',
          variant: "destructive"
        });
        return;
      }
    } else {

      const currentConnection = channelConnections.find(c => c.id === targetConnectionId);
      const currentProxyId = (currentConnection as any)?.proxyServerId;
      
      if (currentProxyId !== selectedProxyId) {
        try {
          const response = await fetch(`/api/channel-connections/${targetConnectionId}/proxy`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              proxyServerId: selectedProxyId
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update proxy selection');
          }
          

          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
        } catch (error: any) {
          console.error('Error updating proxy selection:', error);

        }
      }
    }


    if (qrGenerationInProgress) {
      return;
    }

    try {
      setQrGenerationInProgress(true);
      setConnectionStatus('connecting');
      setQrCode(null);
      setAwaitingManualQr(true);


      setQrGenerationTimeout(prev => {
        if (prev) clearTimeout(prev);
        return null;
      });
      setQrRetryTimeout(prev => {
        if (prev) clearTimeout(prev);
        return null;
      });


      const timeout = setTimeout(() => {

        setQrGenerationInProgress(false);
        setAwaitingManualQr(false);
        
        if (connectionStatus === 'connecting') {
          setConnectionStatus('error');
          toast({
            title: t('settings.error', 'Error'),
            description: t('settings.qr_timeout', 'QR code generation timed out. Please try again.'),
            variant: "destructive"
          });
        }
      }, 30000);

      setQrGenerationTimeout(timeout);


      const response = await fetch(`/api/whatsapp/connect/${targetConnectionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to connect to WhatsApp');
      }




      if (isManual) {
        toast({
          title: t('settings.connecting_whatsapp', 'Connecting WhatsApp'),
          description: t('settings.generating_qr', 'Generating QR code for authentication...'),
        });
      }
    } catch (error: any) {
      console.error('Error connecting to WhatsApp:', error);
      setConnectionStatus('error');
      setAwaitingManualQr(false);setQrGenerationInProgress(false);


      setQrGenerationTimeout(prev => {
        if (prev) clearTimeout(prev);
        return null;
      });
      setQrRetryTimeout(prev => {
        if (prev) clearTimeout(prev);
        return null;
      });

      toast({
        title: t('settings.error', 'Error'),
        description: error.message || t('settings.connection_failed', 'Failed to connect to WhatsApp'),
        variant: "destructive"
      });
    }
  };

  const handleManualConnect = async () => {
    await generateQRCode(true);
  };

  const handleRefreshQR = async () => {
    if (!activeConnectionId) {
      toast({
        title: t('settings.error', 'Error'),
        description: t('settings.no_active_connection', 'No active connection found'),
        variant: "destructive"
      });
      return;
    }

    try {
      setConnectionStatus('connecting');
      setQrCode(null);


      const response = await fetch(`/api/channel-connections/${activeConnectionId}/reconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh QR code');
      }

      toast({
        title: t('settings.qr_refreshing', 'Refreshing QR Code'),
        description: t('settings.generating_new_qr', 'Generating a new QR code...'),
      });


    } catch (error: any) {
      console.error('Error refreshing QR code:', error);
      setConnectionStatus('error');
      toast({
        title: t('settings.refresh_failed', 'Refresh Failed'),
        description: error.message || t('settings.failed_refresh_qr', 'Failed to refresh QR code'),
        variant: "destructive"
      });
    }
  };

  const handleDisconnectChannel = async (connectionId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/disconnect/${connectionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect channel');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      toast({
        title: "Channel Disconnected",
        description: "The channel has been disconnected successfully",
      });
    } catch (error: any) {
      console.error('Error disconnecting channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect channel",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChannel = async (connectionId: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
        return;
      }

      const response = await fetch(`/api/channel-connections/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel connection');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      toast({
        title: "Channel Deleted",
        description: "The channel connection has been permanently deleted",
      });
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete channel connection",
        variant: "destructive"
      });
    }
  };

  const handleReconnectChannel = async (connectionId: number) => {
    try {

      const connection = channelConnections.find(c => c.id === connectionId);
      

      setActiveConnectionId(connectionId);
      setConnectionStatus(''); // Reset to allow proxy selection
      setQrCode(null);
      setAwaitingManualQr(false);
      setQrGenerationInProgress(false);
      

      if (connection && (connection as any).proxyServerId) {
        setSelectedProxyId((connection as any).proxyServerId);
      } else {
        setSelectedProxyId(null);
      }
      
      setShowQrModal(true);
      


      
    } catch (error) {
      console.error('Error opening reconnect modal:', error);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    }
  };

  const handleOpenRenameModal = (connectionId: number, currentName: string) => {
    setRenameConnectionId(connectionId);
    setNewChannelName(currentName);
    setShowRenameModal(true);
  };

  const handleOpenEditEmailModal = (connectionId: number) => {
    setEditEmailConnectionId(connectionId);
    setShowEditEmailModal(true);
  };

  const handleConnectEmailChannel = async (connectionId: number) => {
    try {
      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          connectionId: connectionId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email channel connected successfully!",
        });
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: "Connection Failed",
          description: errorData.message || "Failed to connect email channel",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error connecting email channel:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect email channel",
        variant: "destructive"
      });
    }
  };

  const handleSyncEmailChannel = async (connectionId: number) => {
    try {
      setSyncingChannels(prev => new Set(prev).add(connectionId));
      const response = await fetch(`/api/email/sync/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (response.ok) {
        toast({ title: "Sync Started", description: "Email sync initiated successfully!" });
      } else {
        const errorData = await response.json();
        toast({ title: "Sync Failed", description: errorData.message || "Failed to sync", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to sync", variant: "destructive" });
    } finally {
      setTimeout(() => setSyncingChannels(prev => { const newSet = new Set(prev); newSet.delete(connectionId); return newSet; }), 2000);
    }
  };

  const handleOpenEditWhatsAppModal = (connectionId: number) => {
    setEditWhatsAppConnectionId(connectionId);
    setShowEditWhatsAppModal(true);
  };

  const handleOpenEditMessengerModal = (connectionId: number) => {
    setEditMessengerConnectionId(connectionId);
    setShowEditMessengerModal(true);
  };

  const handleOpenEditInstagramModal = (connectionId: number) => {
    setEditInstagramConnectionId(connectionId);
    setShowEditInstagramModal(true);
  };

  const handleOpenEditTikTokModal = (connectionId: number) => {
    setEditTikTokConnectionId(connectionId);
    setShowEditTikTokModal(true);
  };

  const handleOpenEditTwilioSmsModal = (connectionId: number) => {
    setEditTwilioSmsConnectionId(connectionId);
    setShowEditTwilioSmsModal(true);
  };

  const handleOpenEditWebChatModal = (connectionId: number) => {
    setEditWebChatConnectionId(connectionId);
    setShowEditWebChatModal(true);
  };

  const handleCopyWebChatEmbed = async (connectionId: number) => {
    const connection = channelConnections.find(c => c.id === connectionId);
    const token = connection?.connectionData?.widgetToken;
    if (token) {
      const embedCode = `<script src="${window.location.origin}/api/webchat/widget/${token}" async></script>`;
      await navigator.clipboard.writeText(embedCode);
      toast({ title: 'Copied!', description: 'Embed code copied to clipboard' });
    } else {
      toast({ title: 'Token not found', description: 'This WebChat connection does not have a widget token yet', variant: 'destructive' });
    }
  };




  useEffect(() => {
    const loadProxies = async () => {
      if (activeTab !== 'proxy-config' && activeTab !== 'channels') return;
      setIsLoadingProxies(true);
      try {
        const res = await apiRequest('GET', '/api/whatsapp-proxy-servers');
        if (res.ok) {
          const proxies = await res.json();
          setProxyServers(proxies);
        }
      } catch (e) {
        console.error('Failed to load proxy servers:', e);
      } finally {
        setIsLoadingProxies(false);
      }
    };
    loadProxies();
  }, [activeTab]);


  useEffect(() => {
    if (showQrModal) {
      apiRequest('GET', '/api/whatsapp-proxy-servers')
        .then(res => res.json())
        .then(proxies => setProxyServers(proxies))
        .catch(err => console.error('Failed to load proxies:', err));
    }
  }, [showQrModal]);

  const openAddProxyModal = () => {
    setProxyFormData({
      name: '',
      enabled: true,
      type: 'http',
      host: '',
      port: '',
      username: '',
      password: '',
      description: ''
    });
    setSelectedProxyForEdit(null);
    setShowProxyModal(true);
  };

  const openEditProxyModal = (proxy: any) => {
    setProxyFormData({
      name: proxy.name || '',
      enabled: proxy.enabled !== undefined ? proxy.enabled : true,
      type: proxy.type || 'http',
      host: proxy.host || '',
      port: proxy.port ? String(proxy.port) : '',
      username: proxy.username || '',
      password: '',
      description: proxy.description || ''
    });
    setSelectedProxyForEdit(proxy);
    setShowProxyModal(true);
  };

  const saveProxy = async () => {
    try {
      if (!proxyFormData.name || !proxyFormData.host || !proxyFormData.port) {
        toast({ title: 'Validation Error', description: 'Name, host, and port are required.', variant: 'destructive' });
        return;
      }
      const p = Number(proxyFormData.port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) {
        toast({ title: 'Validation Error', description: 'Port must be 1-65535.', variant: 'destructive' });
        return;
      }

      const payload = {
        name: proxyFormData.name,
        enabled: proxyFormData.enabled,
        type: proxyFormData.type,
        host: proxyFormData.host,
        port: p,
        username: proxyFormData.username || null,
        password: proxyFormData.password || null,
        description: proxyFormData.description || null
      };

      if (selectedProxyForEdit) {
        const res = await apiRequest('PUT', `/api/whatsapp-proxy-servers/${selectedProxyForEdit.id}`, payload);
        if (res.ok) {
          toast({ title: 'Success', description: 'Proxy server updated successfully.' });
          const updatedRes = await apiRequest('GET', '/api/whatsapp-proxy-servers');
          if (updatedRes.ok) {
            setProxyServers(await updatedRes.json());
          }
          setShowProxyModal(false);
        } else {
          const error = await res.json().catch(() => ({ error: 'Failed to update proxy server' }));
          toast({ title: 'Error', description: error.error || 'Failed to update proxy server', variant: 'destructive' });
        }
      } else {
        const res = await apiRequest('POST', '/api/whatsapp-proxy-servers', payload);
        if (res.ok) {
          toast({ title: 'Success', description: 'Proxy server created successfully.' });
          const updatedRes = await apiRequest('GET', '/api/whatsapp-proxy-servers');
          if (updatedRes.ok) {
            setProxyServers(await updatedRes.json());
          }
          setShowProxyModal(false);
        } else {
          const error = await res.json().catch(() => ({ error: 'Failed to create proxy server' }));
          toast({ title: 'Error', description: error.error || 'Failed to create proxy server', variant: 'destructive' });
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save proxy server', variant: 'destructive' });
    }
  };

  const deleteProxy = async (proxyId: number) => {
    if (!confirm('Are you sure you want to delete this proxy server?')) {
      return;
    }

    try {
      setIsDeletingProxy(proxyId);
      const res = await apiRequest('DELETE', `/api/whatsapp-proxy-servers/${proxyId}`);
      if (res.ok) {
        toast({ title: 'Success', description: 'Proxy server deleted successfully.' });
        const updatedRes = await apiRequest('GET', '/api/whatsapp-proxy-servers');
        if (updatedRes.ok) {
          setProxyServers(await updatedRes.json());
        }
      } else {
        const error = await res.json().catch(() => ({ error: 'Failed to delete proxy server' }));
        toast({ title: 'Error', description: error.error || 'Failed to delete proxy server', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete proxy server', variant: 'destructive' });
    } finally {
      setIsDeletingProxy(null);
    }
  };

  const testProxy = async (proxyId: number) => {
    try {
      setIsTestingProxyId(proxyId);
      const res = await apiRequest('POST', `/api/whatsapp-proxy-servers/${proxyId}/test`);
      const result = await res.json().catch(() => null);
      
      if (res.ok && result && result.success) {
        toast({ title: 'Proxy Test Successful', description: result.message || 'Proxy connection is working.' });
        const updatedRes = await apiRequest('GET', '/api/whatsapp-proxy-servers');
        if (updatedRes.ok) {
          setProxyServers(await updatedRes.json());
        }
      } else {
        toast({ title: 'Proxy Test Failed', description: result?.error || 'Proxy test failed.', variant: 'destructive' });
        const updatedRes = await apiRequest('GET', '/api/whatsapp-proxy-servers');
        if (updatedRes.ok) {
          setProxyServers(await updatedRes.json());
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to test proxy', variant: 'destructive' });
    } finally {
      setIsTestingProxyId(null);
    }
  };

  const handleRenameChannel = async () => {
    if (!renameConnectionId || !newChannelName.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/channel-connections/${renameConnectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountName: newChannelName.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to rename channel connection');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      setShowRenameModal(false);
      setRenameConnectionId(null);
      setNewChannelName('');

      toast({
        title: "Channel Renamed",
        description: "The channel has been renamed successfully",
      });
    } catch (error: any) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to rename channel",
        variant: "destructive"
});
    }
  };

  const getChannelInfo = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp_official':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: 'WhatsApp Business API' };
      case 'whatsapp_unofficial':
        return { icon: 'ri-whatsapp-line', color: '#F59E0B', name: 'WhatsApp (Unofficial)' };
      case 'messenger':
        return { icon: 'ri-messenger-line', color: '#1877F2', name: 'Facebook Messenger' };
      case 'instagram':
        return { icon: 'ri-instagram-line', color: '#E4405F', name: 'Instagram' };
      case 'tiktok':
        return { icon: 'ri-tiktok-line', color: '#000000', name: 'TikTok Business' };
      case 'telegram':
        return { icon: 'ri-telegram-line', color: '#0088CC', name: 'Telegram' };
      case 'twilio_sms':
        return { icon: <TwilioIcon className="h-6 w-6 sm:h-6 sm:w-6 mb-2" style={{ color: '#F22F46' }} />, color: '#F22F46', name: 'Twilio SMS' };
      case 'email':
        return { icon: 'ri-mail-line', color: '#3B82F6', name: 'Email' };
      case 'webchat':
        return { icon: 'ri-message-3-line', color: '#6366f1', name: 'WebChat' };
      default:
        return { icon: 'ri-message-3-line', color: '#333235', name: 'Chat' };
    }
  };  const handleQrModalClose = async () => {    setQrGenerationInProgress(false);
    setQrRetryCount(0);
    

    if (qrGenerationTimeout) {
      clearTimeout(qrGenerationTimeout);
      setQrGenerationTimeout(null);
    }
    if (qrRetryTimeout) {
      clearTimeout(qrRetryTimeout);
      setQrRetryTimeout(null);
    }

    if (activeConnectionId && connectionStatus !== 'connected') {
      try {
        const response = await fetch(`/api/channel-connections/${activeConnectionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

          toast({
            title: "Connection Cancelled",
            description: "WhatsApp connection has been cancelled and removed.",
          });
        } else {
          await fetch(`/api/whatsapp/disconnect/${activeConnectionId}`, {
            method: 'POST'
          });
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
        }
      } catch (error) {
        console.error('Error cleaning up WhatsApp connection:', error);
        try {
          await fetch(`/api/whatsapp/disconnect/${activeConnectionId}`, {
            method: 'POST'
          });
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
        } catch (disconnectError) {
          console.error('Error disconnecting WhatsApp:', disconnectError);
        }
      }
    }

    setActiveConnectionId(null);
    setConnectionStatus('');
    setQrCode(null);
  };

  const handleSubmitCredentials = (data: any) => {
    setIsUpdatingCredentials(true);
    updateGoogleCredentialsMutation.mutate(data, {
      onSettled: () => {
        setIsUpdatingCredentials(false);
      }
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Rename Channel</DialogTitle>
            <DialogDescription className="text-sm">
              Enter a new name for this channel connection to help identify it better in your sidebar and conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="channelName" className="mb-2 block text-sm">Channel Name</Label>
            <Input
              id="channelName"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Enter new channel name"
              className="w-full"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRenameModal(false);
                setRenameConnectionId(null);
                setNewChannelName('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              className="btn-brand-primary w-full sm:w-auto"
              onClick={handleRenameChannel}
              disabled={!newChannelName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {googleCalendarCredentials?.configured ? 'Update' : 'Configure'} Google Calendar API Credentials
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter your company's Google Cloud OAuth credentials to enable Google Calendar integration.
              These credentials will be used for all users in your company.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Form {...credentialsForm}>
              <form onSubmit={credentialsForm.handleSubmit(handleSubmitCredentials)} className="space-y-4">
                <FormField
                  control={credentialsForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Your Google OAuth Client ID"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Client ID from Google Cloud Console OAuth credentials
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialsForm.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Your Google OAuth Client Secret"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Client Secret from Google Cloud Console OAuth credentials
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialsForm.control}
                  name="redirectUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redirect URI</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://your-app-url.com/api/google/callback"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        This should match the authorized redirect URI in your Google Cloud Console
                      </p>
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t border-gray-100">
                  <Alert className="mb-4 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription className="text-xs">
                      After updating these credentials, you will need to reconnect your Google account.
                      All previous Google Calendar connections will be invalidated.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCredentialsModal(false);
                        credentialsForm.reset();
                      }}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>

                    <Button
                      variant={'brand'}
                      type="submit"
                      disabled={isUpdatingCredentials}
                      className="w-full sm:w-auto"
                    >
                      {isUpdatingCredentials && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUpdatingCredentials
                        ? 'Saving...'
                        : googleCalendarCredentials?.configured
                          ? 'Update Credentials'
                          : 'Save Credentials'
                      }
                    </Button>
                  </DialogFooter>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl">Settings</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Manage your account, channels, integrations, and team settings
              </p>
            </div>
          </div>

          {/* WhatsApp QR Code Modal */}
          <Dialog open={showQrModal} onOpenChange={(open) => {
            if (!open) {

              setQrGenerationTimeout(prev => {
                if (prev) clearTimeout(prev);
                return null;
              });
              setQrRetryTimeout(prev => {
                if (prev) clearTimeout(prev);
                return null;
              });
              setAwaitingManualQr(false);setQrGenerationInProgress(false);
              setQrRetryCount(0);
            }
            setShowQrModal(open);
          }}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {connectionStatus === 'connected' ? t('settings.whatsapp_connected', 'WhatsApp Connected') : t('settings.connect_whatsapp', 'Connect WhatsApp')}
                </DialogTitle>
                <DialogDescription>
                  {!connectionStatus && t('settings.whatsapp_connection_instructions', 'Connect your WhatsApp account by scanning the QR code with your mobile app')}
                  {connectionStatus === 'connecting' && t('settings.preparing_qr', 'Preparing QR code for authentication...')}
                  {connectionStatus === 'qr_code' && t('settings.scan_qr', 'Scan the QR code with your WhatsApp mobile app')}
                  {connectionStatus === 'connected' && t('settings.whatsapp_connected_success', 'Your WhatsApp has been connected successfully!')}
                </DialogDescription>
              </DialogHeader>

              {!connectionStatus && (
                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="proxySelector" className="text-sm font-medium mb-2 block">
                    Proxy Server (optional)
                  </Label>
                  <select 
                    id="proxySelector"
                    className="border rounded h-10 px-2 w-full"
                    value={selectedProxyId || ''}
                    onChange={(e) => setSelectedProxyId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">No Proxy (Direct Connection)</option>
                    {proxyServers.filter(p => p.enabled).map(proxy => (
                      <option key={proxy.id} value={proxy.id}>
                        {proxy.name} ({proxy.type.toUpperCase()} - {proxy.host}:{proxy.port})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a proxy server to route this connection through, or use direct connection.
                  </p>
                </div>
              )}

              <div className="flex justify-center items-center py-4">
                {!connectionStatus && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="mb-4 text-lg font-medium">{t('settings.ready_to_connect', 'Ready to Connect')}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      {t('settings.select_proxy_and_connect', 'Select a proxy server (optional) and click "Generate QR Code" to start the connection process')}
                    </p>
                  </div>
                )}
                
                {connectionStatus === 'connecting' && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="mb-4">{t('settings.preparing_connection', 'Preparing WhatsApp connection...')}</p>
                    {qrGenerationInProgress && (
                      <p className="text-sm text-blue-600 mb-2">
                        {t('settings.generating_qr_progress', 'Generating QR code... Please wait')}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {t('settings.qr_delay_message', 'If QR code doesn\'t appear automatically, use the Generate QR Code button below')}
                    </p>
                  </div>
                )}

                {connectionStatus === 'qr_code' && !qrCode && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">{t('settings.qr_not_received', 'QR Code Not Received')}</p>
                    <p className="text-sm text-gray-500">
                      {t('settings.qr_generation_issue', 'The QR code is taking longer than expected. Use the Generate QR Code button below.')}
                    </p>
                  </div>
                )}

                {connectionStatus === 'qr_code' && qrCode && (
                  <div className="text-center py-4">
                    <div className="border-8 border-white inline-block rounded-lg shadow-md">
                      {memoizedWhatsAppQR}
                    </div>
                    <div className="mt-4 mb-2 flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 py-2 px-4 rounded-lg mx-4">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t('settings.qr_expires', 'QR code expires after 30 seconds. Use Generate QR Code button if needed.')}</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 px-2">
                      {t('settings.whatsapp_scan_steps_1', '1. Open WhatsApp on your phone')}<br />
                      {t('settings.whatsapp_scan_steps_2', '2. Tap Menu or Settings and select WhatsApp Web')}<br />
                      {t('settings.whatsapp_scan_steps_3', '3. Point your phone to this screen to scan the code')}
                    </p>
                  </div>
                )}

                {connectionStatus === 'connected' && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">{t('settings.connection_successful', 'Connection Successful!')}</p>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="text-center py-8">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-red-600">{t('settings.connection_failed', 'Connection Failed')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('settings.try_again', 'Please try again')}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => {
                  setShowQrModal(false);
                  setAwaitingManualQr(false);setQrGenerationInProgress(false);
                  setQrRetryCount(0);
                  

                  if (qrGenerationTimeout) {
                    clearTimeout(qrGenerationTimeout);
                    setQrGenerationTimeout(null);
                  }
                  if (qrRetryTimeout) {
                    clearTimeout(qrRetryTimeout);
                    setQrRetryTimeout(null);
                  }
                }}>
                  {connectionStatus === 'connected' ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
                </Button>
                {!connectionStatus && (
                  <Button 
                    onClick={handleManualConnect}
                    disabled={qrGenerationInProgress}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${qrGenerationInProgress ? 'animate-spin' : ''}`} />
                    {qrGenerationInProgress ? t('settings.generating', 'Generating...') : t('settings.generate_qr', 'Generate QR Code')}
                  </Button>
                )}
                {connectionStatus === 'qr_code' && (
                  <Button 
                    onClick={handleManualConnect}
                    disabled={qrGenerationInProgress}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${qrGenerationInProgress ? 'animate-spin' : ''}`} />
                    {qrGenerationInProgress ? t('settings.generating', 'Generating...') : t('settings.generate_qr', 'Generate QR Code')}
                  </Button>
                )}
                {connectionStatus === 'error' && (
                  <Button 
                    onClick={handleManualConnect}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('settings.try_again', 'Try Again')}
                  </Button>
                )}
                {connectionStatus === 'connecting' && (
                  <Button 
                    onClick={handleManualConnect}
                    disabled={qrGenerationInProgress}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${qrGenerationInProgress ? 'animate-spin' : ''}`} />
                    {qrGenerationInProgress ? t('settings.generating', 'Generating...') : t('settings.generate_qr', 'Generate QR Code')}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Proxy Add/Edit Modal */}
          <Dialog open={showProxyModal} onOpenChange={setShowProxyModal}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedProxyForEdit ? 'Edit Proxy Server' : 'Add Proxy Server'}
                </DialogTitle>
                <DialogDescription>
                  Configure a proxy server for WhatsApp connections.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proxyName">Name *</Label>
                  <Input 
                    id="proxyName" 
                    value={proxyFormData.name} 
                    onChange={(e) => setProxyFormData({...proxyFormData, name: e.target.value})}
                    placeholder="e.g., US Proxy, EU Proxy"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="proxyEnabled" 
                    checked={proxyFormData.enabled} 
                    onChange={(e) => setProxyFormData({...proxyFormData, enabled: e.target.checked})}
                  />
                  <Label htmlFor="proxyEnabled">Enabled</Label>
                </div>
                <div>
                  <Label htmlFor="proxyType">Type *</Label>
                  <select 
                    id="proxyType" 
                    className="border rounded h-10 px-2 w-full"
                    value={proxyFormData.type}
                    onChange={(e) => setProxyFormData({...proxyFormData, type: e.target.value as any})}
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="proxyHost">Host *</Label>
                    <Input 
                      id="proxyHost" 
                      value={proxyFormData.host}
                      onChange={(e) => setProxyFormData({...proxyFormData, host: e.target.value})}
                      placeholder="proxy.example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="proxyPort">Port *</Label>
                    <Input 
                      id="proxyPort" 
                      type="number"
                      value={proxyFormData.port}
                      onChange={(e) => setProxyFormData({...proxyFormData, port: e.target.value})}
                      placeholder="8080"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="proxyUsername">Username (optional)</Label>
                  <Input 
                    id="proxyUsername" 
                    value={proxyFormData.username}
                    onChange={(e) => setProxyFormData({...proxyFormData, username: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="proxyPassword">Password (optional)</Label>
                  <Input 
                    id="proxyPassword" 
                    type="password"
                    value={proxyFormData.password}
                    onChange={(e) => setProxyFormData({...proxyFormData, password: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="proxyDescription">Description (optional)</Label>
                  <Input 
                    id="proxyDescription" 
                    value={proxyFormData.description}
                    onChange={(e) => setProxyFormData({...proxyFormData, description: e.target.value})}
                    placeholder="Notes about this proxy"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProxyModal(false)}>Cancel</Button>
                <Button onClick={saveProxy}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* WhatsApp Business API Connection Modal */}
          <WhatsAppBusinessApiForm
            isOpen={showBusinessApiModal}
            onClose={() => setShowBusinessApiModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* WhatsApp Business API Embedded Signup Modal */}
          <WhatsAppEmbeddedSignup
            isOpen={showEmbeddedSignupModal}
            onClose={() => setShowEmbeddedSignupModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Meta WhatsApp Integrated Onboarding Modal */}
          <MetaWhatsAppIntegratedOnboarding
            isOpen={showMetaIntegratedOnboardingModal}
            onClose={() => setShowMetaIntegratedOnboardingModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* WhatsApp Twilio Modal */}
          <WhatsAppTwilioForm
            isOpen={showTwilioModal}
            onClose={() => setShowTwilioModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Unified 360Dialog Setup Modal */}
          <Unified360DialogSetup
            isOpen={showUnified360DialogSetup}
            onClose={() => setShowUnified360DialogSetup(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Partner Configuration Modal - Super Admin Only */}
          {currentUser?.isSuperAdmin && (
            <>
              <PartnerConfigurationForm
                isOpen={showPartnerConfigModal}
                onClose={() => setShowPartnerConfigModal(false)}
                onSuccess={() => {

                  toast({
                    title: "Success",
                    description: "Partner configuration updated successfully",
                  });
                }}
                provider="360dialog"
              />

              <TikTokPlatformConfigForm
                isOpen={showTikTokPlatformConfigModal}
                onClose={() => setShowTikTokPlatformConfigModal(false)}
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "TikTok platform configuration updated successfully",
                  });
                }}
              />
            </>
          )}

          {/* Instagram Connection Modal */}
      <InstagramConnectionForm
            isOpen={showInstagramModal}
            onClose={() => setShowInstagramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* WebChat Connection Modal */}
          <WebChatConnectionForm
            isOpen={showWebChatModal}
            onClose={() => setShowWebChatModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Enhanced Instagram Connection Modal */}
          <EnhancedInstagramConnectionForm
            isOpen={showEnhancedInstagramModal}
            onClose={() => setShowEnhancedInstagramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Messenger Connection Modal */}
          <MessengerConnectionForm
            isOpen={showMessengerModal}
            onClose={() => setShowMessengerModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* TikTok Connection Modal */}
          <TikTokConnectionForm
            isOpen={showTikTokModal}
            onClose={() => setShowTikTokModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Telegram Connection Modal */}
          <TelegramConnectionForm
            isOpen={showTelegramModal}
            onClose={() => setShowTelegramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Email Channel Connection Modal */}
          <EmailChannelForm
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Edit Email Channel Modal */}
          {editEmailConnectionId && (
            <EditEmailChannelForm
              isOpen={showEditEmailModal}
              onClose={() => {
                setShowEditEmailModal(false);
                setEditEmailConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                toast({
                  title: "Email Channel Updated",
                  description: "Your email channel has been updated successfully",
                });
              }}
              connectionId={editEmailConnectionId}
            />
          )}

          {/* Edit WhatsApp Business API Modal */}
          {editWhatsAppConnectionId && (
            <EditWhatsAppBusinessApiForm
              isOpen={showEditWhatsAppModal}
              onClose={() => {
                setShowEditWhatsAppModal(false);
                setEditWhatsAppConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                toast({
                  title: "WhatsApp Business API Updated",
                  description: "Your WhatsApp Business API connection has been updated successfully",
                });
              }}
              connectionId={editWhatsAppConnectionId}
            />
          )}

          {/* Edit Messenger Connection Modal */}
          {editMessengerConnectionId && (
            <EditMessengerConnectionForm
              isOpen={showEditMessengerModal}
              onClose={() => {
                setShowEditMessengerModal(false);
                setEditMessengerConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditMessengerModal(false);
                setEditMessengerConnectionId(null);
              }}
              connectionId={editMessengerConnectionId}
            />
          )}

          {/* Edit Instagram Connection Modal */}
          {editInstagramConnectionId && (
            <EditInstagramConnectionForm
              isOpen={showEditInstagramModal}
              onClose={() => {
                setShowEditInstagramModal(false);
                setEditInstagramConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditInstagramModal(false);
                setEditInstagramConnectionId(null);
              }}
              connectionId={editInstagramConnectionId}
            />
          )}

          {/* Edit TikTok Connection Modal */}
          {editTikTokConnectionId && (
            <EditTikTokConnectionForm
              isOpen={showEditTikTokModal}
              onClose={() => {
                setShowEditTikTokModal(false);
                setEditTikTokConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditTikTokModal(false);
                setEditTikTokConnectionId(null);
              }}
              connectionId={editTikTokConnectionId}
            />
          )}

          {/* Edit Twilio SMS Connection Modal */}
          {editTwilioSmsConnectionId && (
            <EditTwilioSmsConnectionForm
              isOpen={showEditTwilioSmsModal}
              onClose={() => {
                setShowEditTwilioSmsModal(false);
                setEditTwilioSmsConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditTwilioSmsModal(false);
                setEditTwilioSmsConnectionId(null);
              }}
              connectionId={editTwilioSmsConnectionId}
            />
          )}

          {editWebChatConnectionId && (
            <EditWebChatConnectionForm
              isOpen={showEditWebChatModal}
              onClose={() => {
                setShowEditWebChatModal(false);
                setEditWebChatConnectionId(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditWebChatModal(false);
                setEditWebChatConnectionId(null);
              }}
              connectionId={editWebChatConnectionId}
            />
          )}

      

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-6">
              <ScrollableTabs>
                <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max gap-1 flex-nowrap">
                  <TabsTrigger value="channels" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.channel_connections', 'Channel Connections')}</span>
                    <span className="sm:hidden">{t('settings.tabs.channels', 'Channels')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="inbox" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.inbox_settings', 'Inbox Settings')}</span>
                    <span className="sm:hidden">{t('settings.tabs.inbox', 'Inbox')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp-behavior" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.whatsapp_behavior', 'WhatsApp Behavior')}</span>
                    <span className="sm:hidden">{t('settings.tabs.whatsapp', 'WhatsApp')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="proxy-config" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">WhatsApp Proxy</span>
                    <span className="sm:hidden">Proxy</span>
                  </TabsTrigger>

                  <TabsTrigger value="billing" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.billing', 'Billing')}</span>
                    <span className="sm:hidden">{t('settings.tabs.billing', 'Billing')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.team_members', 'Team Members')}</span>
                    <span className="sm:hidden">{t('settings.tabs.team', 'Team')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="api" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.api_access', 'API Access')}</span>
                    <span className="sm:hidden">{t('settings.tabs.api', 'API')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-credentials" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.ai_credentials', 'AI Credentials')}</span>
                    <span className="sm:hidden">{t('settings.tabs.ai_keys', 'AI Keys')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-usage" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.ai_usage', 'AI Usage')}</span>
                    <span className="sm:hidden">{t('settings.tabs.usage', 'Usage')}</span>
                  </TabsTrigger>
                  {currentUser?.isSuperAdmin && (
                    <TabsTrigger value="platform" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                      <span className="hidden sm:inline">{t('settings.tabs.platform', 'Platform')}</span>
                      <span className="sm:hidden">{t('settings.tabs.platform', 'Platform')}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </ScrollableTabs>
            </div>



            <TabsContent value="channels">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.channel_connections.title', 'Channel Connections')}</CardTitle>
                  <CardDescription>
                    {t('settings.channel_connections.description', 'Connect and manage your communication channels')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Connected Channels */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Connected Channels</h3>
                      <div className="space-y-4">
                        {channelConnections.map((connection: any) => {
                          const channelInfo = getChannelInfo(connection.channelType);

                          return (
                            <div key={connection.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div className="flex items-center">
                                  {typeof channelInfo.icon === 'string' ? (
                                    <i
                                      className={channelInfo.icon + " text-xl sm:text-2xl mr-3"}
                                      style={{ color: channelInfo.color }}
                                    />
                                  ) : (
                                    <span className="text-xl sm:text-2xl mr-3" style={{ color: channelInfo.color }}>
                                      {channelInfo.icon}
                                    </span>
                                  )}
                                  <div>
                                    <h4 className="font-medium text-sm sm:text-base">{connection.accountName}</h4>
                                    <p className="text-xs sm:text-sm text-gray-500">{channelInfo.name}</p>
                                    <p className="text-xs text-gray-500">{connection.accountId}</p>
                                    {connection.channelType === 'whatsapp_unofficial' && (() => {
                                      if (connection.proxyServerId) {
                                        const proxyServer = proxyServers.find(p => p.id === connection.proxyServerId);
                                        if (proxyServer) {
                                          return (
                                            <div className="flex items-center gap-1 mt-1">
                                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                                <i className="ri-shield-line mr-1"></i>
                                                Proxy: {proxyServer.name} ({proxyServer.type.toUpperCase()})
                                              </Badge>
                                            </div>
                                          );
                                        }
                                      } else {
                                        return (
                                          <div className="flex items-center gap-1 mt-1">
                                            <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                              <i className="ri-global-line mr-1"></i>
                                              Direct Connection
                                            </Badge>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {connection.channelType === 'email' && connection.lastSyncAt && (
                                      <p className="text-xs text-gray-400">
                                        Last sync: {new Date(connection.lastSyncAt).toLocaleString()}
                                      </p>
                                    )}
                                    {connection.channelType === 'tiktok' && connection.connectionData && (
                                      <div className="mt-1 space-y-1">
                                        {connection.connectionData.displayName && (
                                          <p className="text-xs text-gray-600">
                                            {connection.connectionData.displayName}
                                            {connection.connectionData.isVerified && (
                                              <span className="ml-1 text-blue-500">âœ“</span>
                                            )}
                                          </p>
                                        )}
                                        {connection.connectionData.username && (
                                          <p className="text-xs text-gray-500">
                                            @{connection.connectionData.username}
                                          </p>
                                        )}
                                        {connection.connectionData.lastSyncAt && (
                                          <p className="text-xs text-gray-400">
                                            Last sync: {new Date(connection.connectionData.lastSyncAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                                  <div className="flex flex-wrap gap-2 items-center">
                                    {(connection.channelType === 'whatsapp_unofficial' || connection.channelType === 'whatsapp_official' || connection.channelType === 'whatsapp_twilio' || connection.channelType === 'whatsapp_360dialog') && (() => {
                                      return (
                                        <ConnectionControl
                                          connectionId={connection.id}
                                          status={connection.status}
                                          channelType={connection.channelType}
                                          onReconnectClick={() => {
                                            handleReconnectChannel(connection.id);
                                          }}
                                        />
                                      );
                                    })()}

                                    {/* Edit button for email channels */}
                                    {connection.channelType === 'email' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditEmailModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Sync button for email channels */}
                                    {connection.channelType === 'email' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-purple-500 hover:text-purple-700 text-xs sm:text-sm"
                                        onClick={() => handleSyncEmailChannel(connection.id)}
                                        disabled={syncingChannels.has(connection.id)}
                                      >
                                        {syncingChannels.has(connection.id) ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            <span className="hidden sm:inline">Syncing...</span>
                                            <span className="sm:hidden">Sync...</span>
                                          </>
                                        ) : (
                                          <>
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            <span className="hidden sm:inline">Sync</span>
                                            <span className="sm:hidden">Sync</span>
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {/* Edit button for WhatsApp Business API channels */}
                                    {connection.channelType === 'whatsapp_official' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditWhatsAppModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}


                                    {/* Edit button for Messenger channels */}
                                    {connection.channelType === 'messenger' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditMessengerModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Edit button for WebChat channels */}
                                    {connection.channelType === 'webchat' && (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="brand"
                                          size="sm"
                                          className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                          onClick={() => handleOpenEditWebChatModal(connection.id)}
                                        >
                                          <span className="hidden sm:inline">Edit</span>
                                          <span className="sm:hidden">Edit</span>
                                        </Button>
                                        <Button
                                          variant="brand"
                                          size="sm"
                                          className="btn-brand-primary text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                                          onClick={() => handleCopyWebChatEmbed(connection.id)}
                                        >
                                          <span className="hidden sm:inline">Copy Embed</span>
                                          <span className="sm:hidden">Embed</span>
                                        </Button>
                                      </div>
                                    )}

                                    {/* Edit button for Instagram channels */}
                                    {connection.channelType === 'instagram' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditInstagramModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Edit button for TikTok channels */}
                                    {connection.channelType === 'tiktok' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditTikTokModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">View Details</span>
                                        <span className="sm:hidden">Details</span>
                                      </Button>
                                    )}

                                    {/* Edit button for Twilio SMS channels */}
                                    {connection.channelType === 'twilio_sms' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditTwilioSmsModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Status badge for TikTok channels */}
                                    {connection.channelType === 'tiktok' && (
                                      <div className="flex items-center gap-2">
                                        {connection.status === 'active' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                                            Active
                                          </span>
                                        )}
                                        {connection.status === 'error' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span>
                                            Error
                                          </span>
                                        )}
                                        {connection.status === 'disconnected' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            <span className="w-2 h-2 mr-1 bg-gray-500 rounded-full"></span>
                                            Disconnected
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <Button
                                      variant="brand"
                                      size="sm"
                                      className="btn-brand-primary text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                                      onClick={() => handleOpenRenameModal(connection.id, connection.accountName)}
                                    >
                                      <span className="hidden sm:inline">Rename</span>
                                      <span className="sm:hidden">Rename</span>
                                    </Button>

                                    {/* Legacy disconnect button for non-WhatsApp connections */}
                                    {connection.channelType !== 'whatsapp_unofficial' && connection.channelType !== 'whatsapp_official' && connection.channelType !== 'whatsapp_twilio' && connection.channelType !== 'whatsapp_360dialog' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-orange-500 hover:text-orange-700 text-xs sm:text-sm"
                                        onClick={() => handleDisconnectChannel(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Disconnect</span>
                                        <span className="sm:hidden">Disconnect</span>
                                      </Button>
                                    )}

                                    <Button
                                      variant="brand"
                                      size="sm"
                                      className="btn-brand-primary text-red-500 hover:text-red-700 text-xs sm:text-sm"
                                      onClick={() => handleDeleteChannel(connection.id)}
                                    >
                                      <span className="hidden sm:inline">Delete</span>
                                      <span className="sm:hidden">Delete</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {connection.channelType === 'whatsapp_unofficial' && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-error-warning-line text-yellow-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-yellow-700 font-medium">Unofficial Connection</p>
                                      <p className="text-xs text-yellow-600">
                                        This connection is not using the official WhatsApp Business API.
                                        It may have limitations and could be subject to blocking by WhatsApp.
                                        Configure proxy settings via the Edit button to improve connection stability and reduce blocking risks.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {connection.channelType === 'whatsapp_official' && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-check-line text-green-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-green-700 font-medium">Official WhatsApp Business API (Meta)</p>
                                      <p className="text-xs text-green-600">
                                        This connection uses the official WhatsApp Business API from Meta.
                                        It provides reliable messaging with advanced features and compliance.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}


                              {connection.channelType === 'whatsapp_360dialog' && (
                                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-check-line text-purple-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-purple-700 font-medium">Official WhatsApp Business API (360Dialog Partner)</p>
                                      <p className="text-xs text-purple-600">
                                        This connection uses 360Dialog's Partner API with Integrated Onboarding.
                                        It provides enterprise-grade WhatsApp Business API access with streamlined setup.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Add New Channel</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Business API')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp Business API (Meta)</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Official Meta WhatsApp Business API</p>
                          <Button className="mt-3 w-full text-xs py-1" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            handleConnectChannel('WhatsApp Business Embedded');
                          }}>
                            Easy Setup
                          </Button>
                        </div>

                
                        {/* <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Business API (360Dialog)')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp Business API (360Dialog)</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Integrated Onboarding via 360Dialog</p>
                        </div> */}

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Unofficial')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp QR Code</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            <i className="ri-error-warning-line mr-1"></i>
                            Non-official connection
                          </p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Messenger')}>
                          <i className="ri-messenger-line text-2xl sm:text-3xl mb-2" style={{ color: '#1877F2' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Facebook Messenger</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Via Facebook Pages</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Instagram')}>
                          <i className="ri-instagram-line text-2xl sm:text-3xl mb-2" style={{ color: '#E4405F' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Instagram</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Business Account Integration</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('TikTok')}>
                          <i className="ri-tiktok-line text-2xl sm:text-3xl mb-2"></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">TikTok</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Business Messaging</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Telegram')}>
                          <i className="ri-telegram-line text-2xl sm:text-3xl mb-2" style={{ color: '#0088CC' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Telegram</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Bot Integration</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Email')}>
                          <i className="ri-mail-line text-2xl sm:text-3xl mb-2" style={{ color: '#3B82F6' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Email</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">IMAP/SMTP Email Integration</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WebChat')}>
                          <i className="ri-message-3-line text-2xl sm:text-3xl mb-2" style={{ color: '#6366f1' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WebChat</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Chat widget for your website</p>
                        </div>
                        
                          <div
                            className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleConnectChannel('Twilio SMS')}
                          >
                            <TwilioIcon className="h-6 w-6 sm:h-6 sm:w-6 mb-2" style={{ color: '#F22F46' }} />
                            <h4 className="font-medium text-sm sm:text-base text-center">Twilio SMS</h4>
                            <p className="text-xs text-gray-500 text-center mt-1">Programmable Messaging (SMS/MMS)</p>
                          </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Multi-Proxy Configuration */}
            <TabsContent value="proxy-config">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>WhatsApp Proxy Servers</CardTitle>
                      <CardDescription>
                        Manage proxy servers for WhatsApp QR connections. Each connection can use a different proxy.
                      </CardDescription>
                    </div>
                    <Button onClick={openAddProxyModal}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Proxy Server
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingProxies ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </div>
                  ) : proxyServers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No proxy servers configured.</p>
                      <p className="text-sm mt-2">Add a proxy server to route WhatsApp connections through it.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proxyServers.map(proxy => (
                        <Card key={proxy.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{proxy.name}</h3>
                                {proxy.enabled ? (
                                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                                ) : (
                                  <Badge variant="secondary">Disabled</Badge>
                                )}
                                {proxy.testStatus === 'working' && (
                                  <Badge className="bg-blue-100 text-blue-800">Working</Badge>
                                )}
                                {proxy.testStatus === 'failed' && (
                                  <Badge variant="destructive">Failed</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><span className="font-medium">Type:</span> {proxy.type.toUpperCase()}</p>
                                <p><span className="font-medium">Host:</span> {proxy.host}:{proxy.port}</p>
                                {proxy.username && <p><span className="font-medium">Username:</span> {proxy.username}</p>}
                                {proxy.description && <p><span className="font-medium">Description:</span> {proxy.description}</p>}
                                {proxy.lastTested && (
                                  <p className="text-xs text-gray-500">
                                    Last tested: {new Date(proxy.lastTested).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => testProxy(proxy.id)}
                                disabled={isTestingProxyId === proxy.id}
                              >
                                {isTestingProxyId === proxy.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditProxyModal(proxy)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => deleteProxy(proxy.id)}
                                disabled={isDeletingProxy === proxy.id}
                              >
                                {isDeletingProxy === proxy.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inbox">
              <InboxSettings />
            </TabsContent>

            <TabsContent value="whatsapp-behavior">
              <WhatsAppBehaviorSettings />
            </TabsContent>




            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.billing.title', 'Billing & Subscription')}</CardTitle>
                  <CardDescription>
                    {t('settings.billing.description', 'Manage your subscription plan and payment methods')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <SubscriptionManagement />

                    <Separator />

                    <AffiliateEarningsCard />

                    <Separator />



                    <div id="available-plans">
                      <h3 className="text-base sm:text-lg font-medium mb-4">Available Plans</h3>
                      {isLoadingPlans ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : plans && plans.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {plans.map((plan) => {
                            const isCurrentPlan = planInfo?.plan?.id === plan.id || planInfo?.plan?.name === plan.name;

                            return (
                              <PlanCard
                                key={plan.id}
                                plan={plan}
                                isCurrentPlan={isCurrentPlan}
                                onSelectPlan={handleSelectPlan}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                          No plans available at the moment
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Payment History</h3>

                      {(() => {
                        const { data: transactions, isLoading } = useQuery({
                          queryKey: ['/api/payment/transactions'],
                          queryFn: async () => {
                            const res = await apiRequest('GET', '/api/payment/transactions');
                            if (!res.ok) throw new Error('Failed to fetch payment history');
                            return res.json();
                          }
                        });

                        if (isLoading) {
                          return (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          );
                        }

                        if (!transactions || transactions.length === 0) {
                          return (
                            <div className="text-center py-4 text-gray-500 text-sm sm:text-base">
                              No payment history available
                            </div>
                          );
                        }

                        return (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Description
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Amount
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {transactions.map((transaction: any) => (
                                    <tr key={transaction.id}>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                        {transaction.planName || 'Subscription Payment'}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-medium">
                                        ${transaction.amount.toFixed(2)}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${transaction.status === 'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : transaction.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <CheckoutDialog
                isOpen={isCheckoutDialogOpen}
                onClose={() => setIsCheckoutDialogOpen(false)}
                plan={selectedPlan}
                paymentMethods={paymentMethods || []}
                onSuccess={handleCheckoutSuccess}
              />
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.team.title', 'Team Members')}</CardTitle>
                  <CardDescription>
                    {t('settings.team.description', 'Manage team members and their permissions')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <TeamMembersList />

                    <div className="border-t pt-6">
                      <RolesAndPermissions />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api">
              <ApiAccessTab />
            </TabsContent>

            <TabsContent value="ai-credentials">
              <CompanyAiCredentialsTab />
            </TabsContent>

            <TabsContent value="ai-usage">
              <AiUsageAnalytics />
            </TabsContent>

            {currentUser?.isSuperAdmin && (
              <TabsContent value="platform">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.platform.title', 'Platform Configuration')}</CardTitle>
                    <CardDescription>
                      {t('settings.platform.description', 'Configure platform-wide integrations and partner API settings')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium">360Dialog Partner API</h3>
                            <p className="text-sm text-gray-500">
                              Configure 360Dialog Partner credentials for company onboarding
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowPartnerConfigModal(true)}
                            variant="outline"
                            className="btn-brand-primary"
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>â€¢ Platform-wide Partner API integration</p>
                          <p>â€¢ Enables Integrated Onboarding for companies</p>
                          <p>â€¢ Manages client WhatsApp Business accounts</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <i className="ri-tiktok-line text-2xl"></i>
                            <div>
                              <h3 className="text-lg font-medium">TikTok Business Messaging API</h3>
                              <p className="text-sm text-gray-500">
                                Configure TikTok Partner credentials for company messaging
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowTikTokPlatformConfigModal(true)}
                            variant="outline"
                            className="btn-brand-primary"
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>â€¢ Platform-wide TikTok Business API integration</p>
                          <p>â€¢ Enables TikTok messaging for companies</p>
                          <p>â€¢ Requires TikTok Messaging Partner approval</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 opacity-50">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium">Additional Integrations</h3>
                            <p className="text-sm text-gray-500">
                              More platform-wide integrations coming soon
                            </p>
                          </div>
                          <Button variant="outline" disabled>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Coming Soon
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Twilio SMS Connection Modal */}
      <TwilioSmsConnectionForm
        isOpen={showTwilioSmsModal}
        onClose={() => setShowTwilioSmsModal(false)}
        onSuccess={handleConnectionSuccess}
      />

    </div>
  );
}