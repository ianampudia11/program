import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from '@/hooks/use-translation';
import { useConversations } from '@/context/ConversationContext';
import {
  notificationManager,
  requestNotificationPermission,
  getNotificationPermission,
  canRequestNotificationPermission,
  testNotification
} from '@/utils/browser-notifications';
import { Loader2, MessageCircle, Users, Info, History, Download, RefreshCw, Bell, BellOff } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChannelConnections } from '@/hooks/useChannelConnections';
import { Progress } from "@/components/ui/progress";
import useSocket from '@/hooks/useSocket';
import { InboxBackupRestore } from './InboxBackupRestore';
import { InboxRestore } from './InboxRestore';

export function InboxSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showGroupChats, updateGroupChatSetting, browserNotifications, updateBrowserNotificationSetting, agentSignatureEnabled, updateAgentSignatureSetting } = useConversations();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isUpdatingAgentSignature, setIsUpdatingAgentSignature] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
  const { data: channelConnections } = useChannelConnections();

  const { data: inboxSettings, isLoading } = useQuery({
    queryKey: ['/api/settings/inbox'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/inbox');
      if (!response.ok) {
        throw new Error('Failed to fetch inbox settings');
      }
      return response.json();
    },
  });

  const handleGroupChatToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      await updateGroupChatSetting(enabled);
    } catch (error) {
      console.error('Error updating group chat setting:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    setIsUpdatingNotifications(true);
    try {
      if (enabled) {

        if (!notificationManager.isNotificationSupported()) {
          toast({
            title: t('settings.notifications_not_supported', 'Notifications Not Supported'),
            description: t('settings.notifications_not_supported_desc', 'Your browser does not support notifications.'),
            variant: 'destructive',
          });
          return;
        }


        if (notificationPermission !== 'granted') {
          const permission = await requestNotificationPermission();
          setNotificationPermission(permission);

          if (permission !== 'granted') {
            toast({
              title: t('settings.notification_permission_denied', 'Permission Denied'),
              description: t('settings.notification_permission_denied_desc', 'Please enable notifications in your browser settings to receive alerts.'),
              variant: 'destructive',
            });
            return;
          }
        }


        await testNotification();
      }

      await updateBrowserNotificationSetting(enabled);
    } catch (error) {
      console.error('Error updating browser notification setting:', error);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const handleAgentSignatureToggle = async (enabled: boolean) => {
    setIsUpdatingAgentSignature(true);
    try {
      await updateAgentSignatureSetting(enabled);
    } catch (error) {
      console.error('Error updating agent signature setting:', error);
    } finally {
      setIsUpdatingAgentSignature(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('settings.inbox.title', 'Inbox Settings')}
          </CardTitle>
          <CardDescription>
            {t('settings.inbox.description', 'Configure how your inbox displays conversations and messages')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('settings.inbox.title', 'Inbox Settings')}
          </CardTitle>
          <CardDescription>
            {t('settings.inbox.description', 'Configure how your inbox displays conversations and messages')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            

            {/* Browser Notifications Setting */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="browser-notifications" className="text-base font-medium flex items-center gap-2">
                  {browserNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  {t('settings.inbox.browser_notifications', 'Browser Notifications')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.inbox.browser_notifications_description', 'Receive desktop notifications when new messages arrive (only when the page is not in focus)')}
                </p>
                {notificationPermission === 'denied' && (
                  <p className="text-sm text-red-600">
                    {t('settings.inbox.notifications_blocked', 'Notifications are blocked. Please enable them in your browser settings.')}
                  </p>
                )}
                {notificationPermission === 'default' && browserNotifications && (
                  <p className="text-sm text-amber-600">
                    {t('settings.inbox.notifications_permission_needed', 'Permission will be requested when you enable notifications.')}
                  </p>
                )}
              </div>
              <Switch
                id="browser-notifications"
                checked={browserNotifications}
                onCheckedChange={handleBrowserNotificationToggle}
                disabled={isUpdatingNotifications || !notificationManager.isNotificationSupported()}
              />
            </div>

            {browserNotifications && notificationPermission === 'granted' && (
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  {t('settings.inbox.browser_notifications_enabled_info', 'You will receive desktop notifications for new messages when the page is not in focus. You can test notifications using the button below.')}
                </AlertDescription>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {

                      try {
                        const result = await testNotification();

                        if (!result) {
                          toast({
                            title: 'Test Failed',
                            description: 'Could not show test notification. Check browser console for details.',
                            variant: 'destructive',
                          });
                        }
                      } catch (error) {
                        console.error('Test notification error:', error);
                        toast({
                          title: 'Test Failed',
                          description: 'Error showing test notification: ' + (error instanceof Error ? error.message : String(error)),
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Bell className="h-3 w-3" />
                    {t('settings.inbox.test_notification', 'Test Notification')}
                  </Button>
                </div>
              </Alert>
            )}

            {/* Agent Signature Setting */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="agent-signature" className="text-base font-medium flex items-center gap-2">
                  <i className="ri-user-line text-base"></i>
                  {t('settings.inbox.agent_signature', 'Agent Signature')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.inbox.agent_signature_description', 'Automatically add agent name to outbound messages')}
                </p>
              </div>
              <Switch
                id="agent-signature"
                checked={agentSignatureEnabled}
                onCheckedChange={handleAgentSignatureToggle}
                disabled={isUpdatingAgentSignature}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      <WhatsAppHistorySyncSettings />

      {/* Backup & Restore Section */}
      <InboxBackupRestore />
      <InboxRestore />
    </div>
  );
}

function WhatsAppHistorySyncSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: channelConnections } = useChannelConnections();
  const [syncingConnections, setSyncingConnections] = useState<Set<number>>(new Set());
  const { onMessage } = useSocket('/ws');

  useEffect(() => {
    const unsubscribe = onMessage('whatsappHistorySyncProgress', (data) => {
      const { connectionId, progress, total, status } = data.data;

      queryClient.setQueryData(['channel-connections'], (oldData: any) => {
        if (!oldData) return oldData;

        return oldData.map((conn: any) =>
          conn.id === connectionId
            ? {
                ...conn,
                historySyncStatus: status,
                historySyncProgress: progress,
                historySyncTotal: total
              }
            : conn
        );
      });
    });

    return unsubscribe;
  }, [onMessage, queryClient]);

  useEffect(() => {
    const unsubscribe = onMessage('whatsappHistorySyncComplete', (data) => {
      const { connectionId } = data.data;

      queryClient.setQueryData(['channel-connections'], (oldData: any) => {
        if (!oldData) return oldData;

        return oldData.map((conn: any) =>
          conn.id === connectionId
            ? {
                ...conn,
                historySyncStatus: 'completed',
                lastHistorySyncAt: new Date().toISOString()
              }
            : conn
        );
      });

      setSyncingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    });

    return unsubscribe;
  }, [onMessage, queryClient]);

  const whatsappConnections = channelConnections?.filter(conn =>
    conn.channelType === 'whatsapp_unofficial' || conn.channelType === 'whatsapp'
  ) || [];

  const handleToggleHistorySync = async (connectionId: number, enabled: boolean) => {
    try {
      const response = await apiRequest('PUT', `/api/channel-connections/${connectionId}/history-sync`, {
        enabled
      });

      if (!response.ok) {
        throw new Error(t('settings.inbox.update_history_sync_failed', 'Failed to update history sync setting'));
      }

      toast({
        title: enabled ? t('settings.inbox.history_sync_enabled', 'History Sync Enabled') : t('settings.inbox.history_sync_disabled', 'History Sync Disabled'),
        description: enabled
          ? t('settings.inbox.history_sync_enabled_desc', 'WhatsApp message history will be synced on next connection')
          : t('settings.inbox.history_sync_disabled_desc', 'History sync has been disabled for this connection')
      });

      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
    } catch (error) {
      console.error('Error updating history sync:', error);
      toast({
        title: "Error",
        description: "Failed to update history sync setting",
        variant: "destructive"
      });
    }
  };

  const handleManualSync = async (connectionId: number) => {
    setSyncingConnections(prev => new Set(prev).add(connectionId));

    try {
      const response = await apiRequest('POST', `/api/channel-connections/${connectionId}/sync-history`);

      if (!response.ok) {
        throw new Error('Failed to start history sync');
      }

      toast({
        title: "History Sync Started",
        description: "WhatsApp will reconnect to sync message history from the last 7 days. You may need to scan the QR code again."
      });
    } catch (error) {
      console.error('Error starting history sync:', error);
      toast({
        title: "Error",
        description: "Failed to start history sync",
        variant: "destructive"
      });
    } finally {
      setSyncingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  if (whatsappConnections.length === 0) {
    return null;
  }
































































































}
