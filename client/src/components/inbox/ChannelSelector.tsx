import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Wifi,
  AlertCircle
} from 'lucide-react';

interface ChannelConnection {
  id: number;
  channelType: string;
  accountName?: string;
  accountId?: string;
  status: 'active' | 'inactive' | 'error';
  lastConnectedAt?: string;
  metadata?: any;
}

interface ChannelSelectorProps {
  activeChannelId?: number;
  onChannelChange: (channelId: number) => void;
  className?: string;
}

export function ChannelSelector({ activeChannelId, onChannelChange, className }: ChannelSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedChannelId, setSelectedChannelId] = useState<number | undefined>(activeChannelId);


  const { data: channels = [], isLoading, error } = useQuery<ChannelConnection[]>({
    queryKey: ['/api/channel-connections'],
    queryFn: async () => {
      const response = await fetch('/api/channel-connections');
      if (!response.ok) {
        throw new Error('Failed to fetch channel connections');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds to check connection status
  });


  const activeChannels = channels.filter(channel => channel.status === 'active');


  useEffect(() => {
    if (activeChannels.length > 0) {

      if (!selectedChannelId) {
        const firstChannel = activeChannels[0];
        setSelectedChannelId(firstChannel.id);
        onChannelChange(firstChannel.id);
      }

      else if (!activeChannels.find(c => c.id === selectedChannelId)) {
        const firstChannel = activeChannels[0];
        setSelectedChannelId(firstChannel.id);
        onChannelChange(firstChannel.id);

        toast({
          title: t('inbox.channel_unavailable', 'Channel Unavailable'),
          description: t('inbox.channel_switched_fallback', 'Previous channel is no longer available. Switched to {{channelName}}.', {
            channelName: getChannelDisplayName(firstChannel)
          }),
          variant: 'destructive',
        });
      }
    } else if (selectedChannelId) {

      setSelectedChannelId(undefined);
      toast({
        title: t('inbox.no_channels_available', 'No Channels Available'),
        description: t('inbox.no_channels_desc', 'All channels are currently unavailable. Please check your connections.'),
        variant: 'destructive',
      });
    }
  }, [activeChannels, selectedChannelId, onChannelChange, toast, t]);


  useEffect(() => {
    if (activeChannelId !== selectedChannelId) {
      setSelectedChannelId(activeChannelId);
    }
  }, [activeChannelId]);

  const handleChannelChange = (channelId: string) => {
    const numericChannelId = parseInt(channelId);
    setSelectedChannelId(numericChannelId);
    onChannelChange(numericChannelId);
    
    const selectedChannel = activeChannels.find(c => c.id === numericChannelId);
    if (selectedChannel) {
      toast({
        title: t('inbox.channel_switched', 'Channel Switched'),
        description: t('inbox.channel_switched_desc', 'Now using {{channelName}} for messages', {
          channelName: getChannelDisplayName(selectedChannel)
        }),
      });
    }
  };

  const getChannelDisplayName = (channel: ChannelConnection): string => {
    const typeDisplay = getChannelTypeDisplay(channel.channelType);
    if (channel.accountName) {
      return `${typeDisplay} (${channel.accountName})`;
    }
    return typeDisplay;
  };

  const getChannelTypeDisplay = (channelType: string): string => {
    switch (channelType) {
      case 'whatsapp_official':
        return 'WhatsApp Official';
      case 'whatsapp_unofficial':
      case 'whatsapp':
        return 'WhatsApp';
      case 'messenger':
        return 'Messenger';
      case 'instagram':
        return 'Instagram';
      case 'telegram':
        return 'Telegram';
      case 'email':
        return 'Email';
      case 'twilio_sms':
        return 'Twilio SMS';
      case 'webchat':
        return 'WebChat';
      default:
        return channelType;
    }
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp_official':
        return <i className="ri-whatsapp-line" style={{ color: '#25D366' }} />;
      case 'whatsapp_unofficial':
      case 'whatsapp':
        return <i className="ri-whatsapp-line" style={{ color: '#25D366' }} />;
      case 'messenger':
        return <i className="ri-messenger-line" style={{ color: '#1877F2' }} />;
      case 'instagram':
        return <i className="ri-instagram-line" style={{ color: '#E4405F' }} />;
      case 'telegram':
        return <i className="ri-telegram-line" style={{ color: '#0088CC' }} />;
      case 'email':
        return <i className="ri-mail-line" style={{ color: '#6B7280' }} />;
      case 'twilio_sms':
        return <i className="ri-message-3-line" style={{ color: '#E4405F' }} />;
      case 'webchat':
        return <i className="ri-message-3-line" style={{ color: '#6366f1' }} />;
      default:
        return <i className="ri-message-3-line" style={{ color: '#333235' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-32 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || activeChannels.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">
          {t('inbox.no_active_channels', 'No active channels available')}
        </span>
      </div>
    );
  }

  const selectedChannel = activeChannels.find(c => c.id === selectedChannelId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      
      <Select value={selectedChannelId?.toString()} onValueChange={handleChannelChange}>
        <SelectTrigger className="w-auto min-w-[200px] h-8 text-sm border-gray-200 focus:border-primary-300">
          <SelectValue>
            {selectedChannel && (
              <div className="flex items-center gap-2">
                <span className="text-sm">{getChannelIcon(selectedChannel.channelType)}</span>
                <span className="truncate">{getChannelDisplayName(selectedChannel)}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getStatusColor(selectedChannel.status)}`}
                >
                  <Wifi className="h-2 w-2 mr-1" />
                  {t('inbox.channel_status.active', 'Active')}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {activeChannels.map((channel) => (
            <SelectItem key={channel.id} value={channel.id.toString()}>
              <div className="flex items-center gap-2 w-full">
                <span>{getChannelIcon(channel.channelType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{getChannelDisplayName(channel)}</div>
                  {channel.accountId && (
                    <div className="text-xs text-gray-500 truncate">
                      {channel.accountId}
                    </div>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getStatusColor(channel.status)}`}
                >
                  <Wifi className="h-2 w-2 mr-1" />
                  {t(`inbox.channel_status.${channel.status}`, channel.status)}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
