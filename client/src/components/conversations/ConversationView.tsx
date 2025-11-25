import { useEffect, useRef, useState } from 'react';
import { useConversations } from '@/context/ConversationContext';
import { useTranslation } from '@/hooks/use-translation';
import { useQuery } from '@tanstack/react-query';
import { useBotStatus } from '@/hooks/useBotStatus';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ContactDetails from './ContactDetails';
import DateSeparator from './DateSeparator';
import { GroupInfoPanel } from '@/components/groups/GroupInfoPanel';
import { GroupAvatar } from '@/components/groups/GroupAvatar';
import GroupParticipantsModal from '@/components/groups/GroupParticipantsModal';
import ConnectionControl from '../whatsapp/ConnectionControl';
import { ContactAvatar } from '@/components/contacts/ContactAvatar';
import { TwilioIcon } from '@/components/icons/TwilioIcon';
import AgentAssignment from './AgentAssignment';
import BotIcon from '@/components/ui/bot-icon';
import { useMobileLayout } from '@/contexts/mobile-layout-context';
import { shouldShowDateSeparator, getConversationStartDate, formatMessageDate, formatMessageDateTime } from '@/utils/dateUtils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import './ConversationStyles.css';

export default function ConversationView() {
  const {
    activeConversationId,
    messages,
    messagesPagination,
    loadMoreMessages,
    setReplyToMessage,
    conversations,
    groupConversations
  } = useConversations();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('unknown');
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastActiveConversationId, setLastActiveConversationId] = useState<number | null>(null);
  const [shouldScrollOnLoad, setShouldScrollOnLoad] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const handleDeleteContact = async () => {
    if (!contact || !activeConversationId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }

      toast({
        title: t('contacts.delete.success_title', 'Contact Deleted'),
        description: t('contacts.delete.success_message', 'Contact and all associated data have been permanently deleted.'),
      });


      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, 'messages'] });


      setIsDeleteModalOpen(false);
      setLocation('/inbox');
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: t('contacts.delete.error_title', 'Delete Failed'),
        description: error.message || t('contacts.delete.error_message', 'Failed to delete contact. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const {
    isMobile,
    isTablet,
    isContactDetailsOpen,
    toggleConversationList,
    toggleContactDetails
  } = useMobileLayout();

  const isGroupConversation = (conversationId: number): boolean => {
    const groupConv = groupConversations.find(conv => conv.id === conversationId);
    if (groupConv) return true;

    const regularConv = conversations.find(conv => conv.id === conversationId);
    if (regularConv && (regularConv.isGroup || regularConv.groupJid)) return true;

    return false;
  };

  const { data: activeConversation, isLoading } = useQuery({
    queryKey: (() => {
      if (!activeConversationId) return ['/api/conversations', null];
      const isGroup = isGroupConversation(activeConversationId);
      return isGroup
        ? ['/api/group-conversations', activeConversationId]
        : ['/api/conversations', activeConversationId];
    })(),
    enabled: !!activeConversationId,
    queryFn: async ({ queryKey }) => {
      const conversationId = queryKey[1] as number;
      const isGroupEndpoint = queryKey[0] === '/api/group-conversations';

      const endpoint = isGroupEndpoint
        ? `/api/group-conversations/${conversationId}`
        : `/api/conversations/${conversationId}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json();
    }
  });

  const isWhatsApp = activeConversation?.channelType === 'whatsapp' ||
                    activeConversation?.channelType === 'whatsapp_unofficial' ||
                    activeConversation?.channelType === 'whatsapp_official' ||
                    activeConversation?.channelType === 'whatsapp_twilio' ||
                    activeConversation?.channelType === 'whatsapp_360dialog';

  const { data: whatsAppStatus } = useQuery({
    queryKey: ['/api/whatsapp/status', activeConversation?.channelId],
    enabled: !!activeConversation?.channelId && isWhatsApp,
    queryFn: async ({ queryKey }) => {
      const connectionId = queryKey[1] as number;
      const response = await fetch(`/api/whatsapp/status/${connectionId}`);
      if (!response.ok) throw new Error('Failed to fetch WhatsApp status');
      return response.json();
    },
    refetchInterval: 30000
  });

  const { isBotDisabled } = useBotStatus(activeConversationId);

  useEffect(() => {
    if (whatsAppStatus && whatsAppStatus.status) {
      setConnectionStatus(whatsAppStatus.status);
    }
  }, [whatsAppStatus]);

  const activeMessages = activeConversationId ? (messages[activeConversationId] || []) : [];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isNearTop = scrollTop < 100;

      if (shouldScrollToBottom !== isNearBottom) {
        setShouldScrollToBottom(isNearBottom);
      }

      if (isNearTop && activeConversationId && !isLoadingMore) {
        const pagination = messagesPagination[activeConversationId];
        if (pagination && pagination.hasMore && !pagination.loading) {
          setIsLoadingMore(true);
          const previousScrollHeight = scrollHeight;

          loadMoreMessages(activeConversationId).then(() => {
            setTimeout(() => {
              const newScrollHeight = container.scrollHeight;
              const scrollDiff = newScrollHeight - previousScrollHeight;
              container.scrollTop = scrollTop + scrollDiff;
              setIsLoadingMore(false);
            }, 100);
          }).catch(() => {
            setIsLoadingMore(false);
          });
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [shouldScrollToBottom, activeConversationId, messagesPagination, loadMoreMessages, isLoadingMore]);

  useEffect(() => {
    if (activeConversationId !== lastActiveConversationId) {
      setPrevMessageCount(0);
      setShouldScrollToBottom(true);
      setShouldScrollOnLoad(true);
      setAssignedUserId(null);
      setLastActiveConversationId(activeConversationId);
    }
  }, [activeConversationId, lastActiveConversationId]);

  useEffect(() => {
    if (activeConversation) {
      setAssignedUserId(activeConversation.assignedToUserId || null);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (shouldScrollOnLoad && messagesEndRef.current) {
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          setShouldScrollOnLoad(false);
          setShouldScrollToBottom(true);
        }
      }, activeMessages.length > 0 ? 150 : 300);

      return () => clearTimeout(timeoutId);
    }
  }, [activeMessages, shouldScrollOnLoad]);

  useEffect(() => {
    const currentMessageCount = activeMessages.length;

    if (currentMessageCount > prevMessageCount && shouldScrollToBottom && !shouldScrollOnLoad) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }

    setPrevMessageCount(currentMessageCount);
  }, [activeMessages, prevMessageCount, shouldScrollToBottom, shouldScrollOnLoad]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToBottom(true);
    }
  };

  const handleReplyToMessage = (message: any) => {
    setReplyToMessage(message);
  };

  const handleQuotedMessageClick = (quotedMessageId: string) => {
    const messageElement = document.querySelector(`[data-external-id="${quotedMessageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      messageElement.classList.add('highlighted-message');
      setTimeout(() => {
        messageElement.classList.remove('highlighted-message');
      }, 2000);
    }
  };

  const renderMessagesWithDateSeparators = () => {

    const getMsgTime = (m: any) => {


      if (m.metadata?.timestamp) {
        const ts = m.metadata.timestamp;

        if (typeof ts === 'number') {
          return ts;
        }

        if (typeof ts === 'string') {
          return new Date(ts).getTime();
        }
      }

      const primary = m.sentAt || m.createdAt;
      const fallback = m.metadata?.timestamp ? new Date(m.metadata.timestamp) : null;
      const d = primary ? new Date(primary) : fallback;
      return d ? d.getTime() : 0;
    };

    const allMessages = activeMessages
      .filter((message, index, self) => {
        const isFirstOccurrenceById = index === self.findIndex(m => m.id === message.id);
        return isFirstOccurrenceById;
      })
      .sort((a, b) => {
        const ta = getMsgTime(a);
        const tb = getMsgTime(b);
        if (ta !== tb) return ta - tb;

        const idA = typeof a.id === 'number' ? a.id : Number.MAX_SAFE_INTEGER;
        const idB = typeof b.id === 'number' ? b.id : Number.MAX_SAFE_INTEGER;
        return idA - idB;
      });


    if (activeConversation?.channelType === 'webchat') {
      console.log('[WebChat Sorted Messages]', allMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        content: m.content?.substring(0, 30),
        sentAtMs: m.sentAt ? new Date(m.sentAt).getTime() : null,
        createdAtMs: new Date(m.createdAt).getTime(),
        metadataTimestamp: m.metadata?.timestamp,
        metadataChannelType: m.metadata?.channelType,
        calculatedTime: getMsgTime(m)
      })));
    }


    const filteredMessages = allMessages.filter(message => message.type !== 'reaction');
    const reactionMessages = allMessages.filter(message => message.type === 'reaction');


    const reactionsByTarget = reactionMessages.reduce((acc, reaction) => {
      const targetMessageId = reaction.metadata?.targetMessageId;
      if (targetMessageId) {
        if (!acc[targetMessageId]) {
          acc[targetMessageId] = [];
        }
        acc[targetMessageId].push(reaction);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const elements: JSX.Element[] = [];


    if (filteredMessages.length > 0) {
      const firstMessageDate = new Date(filteredMessages[0].sentAt || filteredMessages[0].createdAt);
      elements.push(
        <div key="conversation-start" className="flex justify-center mb-4">
          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {t('inbox.conversation_started_via', 'Conversation started via {{channel}}', { channel: channelInfo.name })}
          </span>
        </div>
      );
    }

    filteredMessages.forEach((message, index) => {
      const previousMessage = index > 0 ? filteredMessages[index - 1] : null;
      

      if (shouldShowDateSeparator(message, previousMessage)) {
        const messageDate = new Date(message.sentAt || message.createdAt);
        elements.push(
          <DateSeparator key={`date-${message.id}`} date={messageDate} />
        );
      }



      const messageReactions = reactionsByTarget[message.externalId] || [];

      elements.push(
        <MessageBubble
          key={message.id}
          message={message}
          contact={contact}
          channelType={activeConversation?.channelType}
          onReply={handleReplyToMessage}
          onQuotedMessageClick={handleQuotedMessageClick}
          conversation={activeConversation}
          reactions={messageReactions}
        />
      );
    });

    return elements;
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        {isMobile && (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-3 py-3" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <div className="flex items-center">
              <button
                onClick={toggleConversationList}
                className="p-2 rounded-md hover:bg-gray-100 mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('inbox.show_conversations', 'Show conversations')}
              >
                <i className="ri-menu-line text-lg text-gray-600"></i>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">{t('inbox.conversations', 'Conversations')}</h1>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="mb-4 text-primary-500">
              <i className="ri-chat-3-line text-6xl"></i>
            </div>
            <h2 className="text-2xl text-gray-800 mb-2">{t('inbox.no_conversation_selected', 'No Conversation Selected')}</h2>
            <p className="text-gray-600 mb-4">{t('inbox.select_conversation_hint', 'Select a conversation from the list to view messages')}</p>
            {isMobile && (
              <button
                onClick={toggleConversationList}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('inbox.show_conversations', 'Show conversations')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded w-96"></div>
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  const contact = activeConversation?.contact;

  const getChannelInfo = (channelType: string) => {
    switch(channelType) {
      case 'whatsapp':
      case 'whatsapp_unofficial':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: t('conversations.view.channel.whatsapp', 'WhatsApp') };
      case 'whatsapp_official':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: t('conversations.view.channel.whatsapp_business', 'WhatsApp Business') };
      case 'whatsapp_twilio':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: t('conversations.view.channel.whatsapp_twilio', 'WhatsApp Business (Twilio)') };
      case 'whatsapp_360dialog':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: t('conversations.view.channel.whatsapp_360dialog', 'WhatsApp Business (360Dialog)') };
      case 'facebook':
        return { icon: 'ri-messenger-line', color: '#1877F2', name: t('conversations.view.channel.messenger', 'Messenger') };
      case 'instagram':
        return { icon: 'ri-instagram-line', color: '#E4405F', name: t('conversations.view.channel.instagram', 'Instagram') };
      case 'email':
        return { icon: 'ri-mail-line', color: '#333235', name: t('conversations.view.channel.email', 'Email') };
      case 'sms':
        return { icon: 'ri-message-2-line', color: '#10B981', name: t('conversations.view.channel.sms', 'SMS') };
      case 'twilio_sms':
      case 'twilio_voice':
        return { icon: TwilioIcon, color: '#F22F46', name: t('conversations.view.channel.twilio', 'Twilio') };
      case 'webapp':
        return { icon: 'ri-global-line', color: '#8B5CF6', name: t('conversations.view.channel.web_chat', 'Web Chat') };
      default:
        return { icon: 'ri-message-3-line', color: '#333235', name: t('conversations.view.channel.chat', 'Chat') };
    }
  };

  const channelInfo = getChannelInfo(activeConversation?.channelType);

  const getLastActiveTime = () => {
    if (!activeConversation) return '';
    

    const lastMessage = activeMessages[activeMessages.length - 1];
    if (lastMessage) {
      const lastMessageDate = new Date(lastMessage.sentAt || lastMessage.createdAt);
      return formatMessageDateTime(lastMessageDate);
    }
    

    if (activeConversation.updatedAt) {
      const updatedDate = new Date(activeConversation.updatedAt);
      return formatMessageDateTime(updatedDate);
    }
    
    return t('inbox.last_active_unknown', 'Last active unknown');
  };



  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden h-full">
      <div className="top-0  bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 py-3" style={{ position: 'sticky' }}>
        <div className="flex items-center flex-1 min-w-0">
          {isMobile && (
            <button
              onClick={toggleConversationList}
              className="p-2 rounded-md hover:bg-gray-100 mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t('inbox.show_conversations', 'Show conversations')}
            >
              <i className="ri-menu-line text-lg text-gray-600"></i>
            </button>
          )}

          <div className="relative flex-shrink-0">
            {activeConversation?.isGroup ? (
              <GroupAvatar
                groupName={activeConversation.groupName || 'Group'}
                groupJid={activeConversation.groupJid}
                connectionId={activeConversation.channelId}
                conversationId={activeConversation.id}
                groupMetadata={activeConversation.groupMetadata}
                size="md"
                showRefreshButton={isWhatsApp && connectionStatus === 'active'}
              />
            ) : contact ? (
              <ContactAvatar
                contact={contact}
                connectionId={activeConversation.channelId}
                size="md"
                showRefreshButton={isWhatsApp && connectionStatus === 'active'}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            )}
            {!activeConversation?.isGroup && (
              <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${contact?.isActive ? 'bg-green-500' : 'bg-gray-300'} border-2 border-white`}></span>
            )}
          </div>

          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {activeConversation?.isGroup
                  ? (activeConversation.groupName || t('groups.unnamed_group', 'Unnamed Group'))
                  : contact?.name
                }
              </h2>
              {activeConversation?.status === 'open' && !assignedUserId && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                  {t('inbox.new_lead', 'New Lead')}
                </span>
              )}
              {activeConversationId && !isMobile && !activeConversation?.isGroup && (
                <AgentAssignment
                  conversationId={activeConversationId}
                  currentAssignedUserId={assignedUserId}
                  onAssignmentChange={setAssignedUserId}
                  variant="badge"
                  size="sm"
                />
              )}
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-1">
              <span className="flex items-center">
                {typeof channelInfo.icon === 'string' ? (
                  <i className={channelInfo.icon + " mr-1"} style={{ color: channelInfo.color }}></i>
                ) : (
                  <channelInfo.icon className="mr-1 h-4 w-4" style={{ color: channelInfo.color }} />
                )}
                <span className="truncate">{channelInfo.name}</span>
              </span>
              {activeConversation?.isGroup && (
                <>
                  <span className="mx-2">•</span>
                  <button
                    onClick={() => setIsParticipantsModalOpen(true)}
                    className="truncate hover:text-primary-600 hover:underline cursor-pointer transition-colors"
                    title={t('groups.participants.view_all', 'View all participants')}
                  >
                    {activeConversation.groupParticipantCount || 0} {t('groups.participants', 'participants')}
                  </button>
                </>
              )}
              <span className="mx-2 hidden sm:inline">•</span>
              <span className="hidden sm:inline truncate">{getLastActiveTime()}</span>
              {isBotDisabled && (
                <>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center text-gray-500">
                    <BotIcon className="mr-1 opacity-50" size={12} color="#6b7280" />
                    <span className="text-xs">{t('conversations.bot_disabled', 'Bot disabled')}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
          {isWhatsApp && activeConversation?.channelId && (
            <ConnectionControl
              connectionId={activeConversation.channelId}
              status={connectionStatus}
              onStatusChange={setConnectionStatus}
              channelType={activeConversation.channelType}
            />
          )}

          {/* Export Participants button for group conversations */}
          {activeConversation?.isGroup && (
            <button
              onClick={() => setIsParticipantsModalOpen(true)}
              className="p-2 sm:p-1.5 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center text-gray-600 hidden sm:flex"
              aria-label={t('groups.participants.export_participants', 'Export Participants')}
              title={t('groups.participants.export_participants', 'Export Participants')}
            >
              <i className="ri-download-line text-lg sm:text-base"></i>
            </button>
          )}

          <button
            onClick={toggleContactDetails}
            className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center ${
              isContactDetailsOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-600'
            }`}
            aria-label={isContactDetailsOpen ? t('contacts.details.close_details', 'Close contact details') : t('contacts.details.show_details', 'Show contact details')}
          >
            <i className="ri-information-line text-lg sm:text-base"></i>
          </button>

          <button
            className="p-2 sm:p-1.5 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center hidden sm:flex"
            aria-label={t('conversations.view.start_call', 'Start Call')}
          >
            <i className="ri-phone-line text-gray-600"></i>
          </button>

          {/* Delete Contact Button - Only visible to admins */}
          {(user?.role === 'admin' || user?.isSuperAdmin) && contact && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 sm:p-1.5 rounded-md hover:bg-red-100 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center hidden sm:flex"
              aria-label={t('conversations.view.delete_contact', 'Delete Contact')}
              disabled={isDeleting}
            >
              <i className={`ri-delete-bin-line ${isDeleting ? 'text-gray-400' : 'text-red-600'}`}></i>
            </button>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleContactDetails();
            }}
            className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center transition-colors duration-200 ${
              isContactDetailsOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-600'
            }`}
            aria-label={isContactDetailsOpen ? t('contacts.details.close_details', 'Close contact details') : t('contacts.details.show_details', 'Show contact details')}
          >
            <i className={`ri-more-2-fill transition-transform duration-200 ${isContactDetailsOpen ? 'rotate-90' : ''}`}></i>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto scroll-smooth conversation-background messages-container"
            id="conversation-messages"
          >
            {activeConversationId && messagesPagination[activeConversationId]?.loading && (
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                  {t('inbox.loading_messages', 'Loading more messages...')}
                </div>
              </div>
            )}

            {renderMessagesWithDateSeparators()}

            <div ref={messagesEndRef} />
          </div>

          {!shouldScrollToBottom && activeMessages.length > 5 && (
            <button
              onClick={scrollToBottom}
              className="absolute top-30 right-5 w-10 h-10 bg-brand-primary rounded-full shadow-md text-white flex items-center justify-center hover:bg-primary-600 transition-all z-10"
              aria-label={t('inbox.scroll_to_bottom', 'Scroll to bottom')}
            >
              <i className="ri-arrow-down-s-line text-lg text-white"></i>
            </button>
          )}

          <MessageInput
            conversationId={activeConversationId}
            conversation={activeConversation}
            contact={contact}
          />
        </div>

        {activeConversation?.isGroup ? (
          <GroupInfoPanel
            conversation={activeConversation}
            className={`${
              isContactDetailsOpen ? 'flex' : 'hidden'
            } flex-col fixed top-0 right-0 h-full z-50 lg:static lg:z-0 w-full max-w-sm sm:max-w-md lg:w-80 bg-white border-l border-gray-200 shadow-lg lg:shadow-none transition-all duration-300 ease-in-out overflow-y-auto`}
          />
        ) : (
          <ContactDetails
            contact={contact}
            conversation={activeConversation}
            className={`${
              isContactDetailsOpen ? 'flex' : 'hidden'
            } flex-col fixed top-0 right-0 h-full z-50 lg:static lg:z-0 w-full max-w-sm sm:max-w-md lg:w-80 bg-white border-l border-gray-200 shadow-lg lg:shadow-none transition-all duration-300 ease-in-out overflow-y-auto`}
          />
        )}
      </div>

      {/* Group Participants Modal */}
      {activeConversation?.isGroup && (
        <GroupParticipantsModal
          isOpen={isParticipantsModalOpen}
          onClose={() => setIsParticipantsModalOpen(false)}
          conversationId={activeConversationId!}
          groupName={activeConversation.groupName}
        />
      )}

      {/* Delete Contact Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {t('contacts.delete.confirm_title', 'Delete Contact')}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {t('contacts.delete.confirm_message',
                'This action will permanently delete this contact and ALL associated data including:'
              )}
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>{t('contacts.delete.conversations', 'All conversations with this contact')}</li>
                <li>{t('contacts.delete.messages', 'All messages in those conversations')}</li>
                <li>{t('contacts.delete.media', 'All media files (images, documents, audio, video)')}</li>
                <li>{t('contacts.delete.notes', 'All notes and deals associated with this contact')}</li>
              </ul>
              <p className="mt-3 font-semibold text-red-600">
                {t('contacts.delete.warning', 'This action cannot be undone!')}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={isDeleting}
              className="min-w-[100px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('contacts.delete.deleting', 'Deleting...')}
                </>
              ) : (
                t('contacts.delete.confirm_button', 'Delete Contact')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
