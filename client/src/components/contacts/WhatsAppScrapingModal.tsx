import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/hooks/use-translation';
import { Loader2, CheckCircle, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ScrapedContact {
  phoneNumber: string;
  jid: string;
  profilePicture?: string;
  name?: string;
}

interface WhatsAppConnection {
  id: number;
  accountName: string;
  status: string;
  channelType: string;
}

interface WhatsAppScrapingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppScrapingModal({ isOpen, onClose }: WhatsAppScrapingModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();


  useEffect(() => {
    if (isOpen) {

    }
  }, [isOpen]);

  const [startingNumber, setStartingNumber] = useState('');
  const [count, setCount] = useState('100');
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);


  const [isScrapingInProgress, setIsScrapingInProgress] = useState(false);
  const [scrapingResults, setScrapingResults] = useState<ScrapedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [scrapingStats, setScrapingStats] = useState<{
    totalChecked: number;
    validCount: number;
    errors: string[];
    totalToCheck?: number;
    progress?: number;
    currentBatch?: number;
    totalBatches?: number;
    currentPhoneNumber?: string;
    isCompleted?: boolean;
  } | null>(null);


  const [scrapingStatus, setScrapingStatus] = useState<string>('');
  const [recentlyFound, setRecentlyFound] = useState<ScrapedContact[]>([]);


  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/channel-connections'],

    select: (data: WhatsAppConnection[]) => {

      console.log('[WhatsApp Scraping] All connections summary:', data.map((c: any) => ({
        id: c.id,
        name: c.accountName,
        type: c.channelType,
        status: c.status
      })));



      const filtered = data.filter((conn: WhatsAppConnection) =>
        (conn.channelType === 'whatsapp_unofficial' || conn.channelType === 'whatsapp') &&
        conn.status === 'active'
      );



      console.log('[WhatsApp Scraping] Filtered connections summary:', filtered.map((c: any) => ({
        id: c.id,
        name: c.accountName,
        type: c.channelType,
        status: c.status
      })));

      return filtered;
    },
    enabled: isOpen
  });


  useEffect(() => {
    console.log('[WhatsApp Scraping] Connections state updated:', {
      count: connections.length,
      isLoading: isLoadingConnections,
      connections: connections.map((c: any) => ({
        id: c.id,
        name: c.accountName,
        type: c.channelType,
        status: c.status
      }))
    });
  }, [connections, isLoadingConnections]);


  useEffect(() => {
    if (connections.length === 1 && !selectedConnectionId) {

      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);


  const startScrapingWithSSE = async (data: { startingNumber: string; count: number; connectionId: number }) => {
    try {
      setIsScrapingInProgress(true);
      setScrapingResults([]);
      setScrapingStats({
        totalChecked: 0,
        validCount: 0,
        errors: [],
        totalToCheck: data.count,
        progress: 0,
        isCompleted: false
      });
      setScrapingStatus('Connecting...');

      const response = await fetch('/api/contacts/scrape-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scraping');
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                handleScrapingUpdate(eventData);
              } catch (parseError) {

              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      setIsScrapingInProgress(false);
      toast({
        title: t('contacts.scraping.error_title', 'Scraping failed'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };


  const handleScrapingUpdate = (update: any) => {
    switch (update.type) {
      case 'started':
        setScrapingStatus('Scraping started...');
        setScrapingStats(prev => ({
          ...prev,
          totalToCheck: update.totalToCheck,
          totalChecked: 0,
          validCount: 0,
          errors: [],
          progress: 0
        }));
        break;

      case 'batch_started':
        setScrapingStatus(`Processing batch ${update.batchNumber} of ${update.totalBatches}...`);
        setScrapingStats(prev => ({
          ...prev,
          currentBatch: update.batchNumber,
          totalBatches: update.totalBatches,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          errors: prev?.errors || []
        }));
        break;

      case 'checking_number':
        setScrapingStatus(`Checking ${update.phoneNumber}...`);
        setScrapingStats(prev => ({
          ...prev,
          currentPhoneNumber: update.phoneNumber,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          progress: update.progress,
          errors: prev?.errors || []
        }));
        break;

      case 'contact_found':

        setScrapingResults(prev => [...prev, update.contact]);
        setScrapingStats(prev => ({
          ...prev,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          progress: update.progress,
          errors: prev?.errors || []
        }));
        setScrapingStatus(`Found: ${update.contact.name || update.contact.phoneNumber}`);


        setRecentlyFound(prev => {
          const newRecent = [update.contact, ...prev.slice(0, 4)]; // Keep last 5
          return newRecent;
        });


        setTimeout(() => {
          setRecentlyFound(prev => prev.filter(c => c.phoneNumber !== update.contact.phoneNumber));
        }, 3000);
        break;

      case 'number_invalid':
        setScrapingStats(prev => ({
          ...prev,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          progress: update.progress,
          errors: prev?.errors || []
        }));
        break;

      case 'number_error':
        setScrapingStats(prev => ({
          ...prev,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          errors: [...(prev?.errors || []), update.error],
          progress: update.progress
        }));
        break;

      case 'batch_completed':
        setScrapingStatus(`Completed batch ${update.batchNumber} of ${update.totalBatches}`);
        break;

      case 'batch_delay':
        setScrapingStatus(update.message);
        break;

      case 'completed':
        setIsScrapingInProgress(false);
        setScrapingStats(prev => ({
          ...prev,
          totalChecked: update.totalChecked,
          validCount: update.validCount,
          errors: update.errors,
          progress: 100,
          isCompleted: true
        }));
        setScrapingStatus('Scraping completed!');

        toast({
          title: t('contacts.scraping.success_title', 'Scraping completed'),
          description: t('contacts.scraping.success_description', 'Found {{count}} valid WhatsApp numbers', {
            count: update.validCount || 0
          }),
        });
        break;

      case 'error':
        setIsScrapingInProgress(false);
        setScrapingStatus('Scraping failed');
        toast({
          title: t('contacts.scraping.error_title', 'Scraping failed'),
          description: update.error || 'Unknown error',
          variant: "destructive",
        });
        break;

      default:

        break;
    }
  };


  const addContactsMutation = useMutation({
    mutationFn: async (contacts: ScrapedContact[]) => {
      const contactsData = contacts.map(contact => ({
        name: contact.name || contact.phoneNumber,
        phone: contact.phoneNumber,
        identifier: contact.phoneNumber,
        identifierType: 'whatsapp',
        source: 'whatsapp_scraping',
        tags: ['scraped', 'whatsapp'],
        avatarUrl: contact.profilePicture || null // Preserve profile picture from scraping
      }));

      const promises = contactsData.map(contactData =>
        fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactData),
        })
      );

      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(result => result.status === 'fulfilled').length;
      const failed = responses.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: contacts.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/tags'] });
      
      toast({
        title: t('contacts.scraping.add_success_title', 'Contacts added'),
        description: t('contacts.scraping.add_success_description', 'Successfully added {{count}} contacts', {
          count: data.successful
        }),
      });


      resetModal();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('contacts.scraping.add_error_title', 'Failed to add contacts'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetModal = () => {
    setStartingNumber('');
    setCount('100');
    setSelectedConnectionId(null);
    setIsScrapingInProgress(false);
    setScrapingResults([]);
    setSelectedContacts(new Set());
    setScrapingStats(null);
    setScrapingStatus('');
    setRecentlyFound([]);
  };

  const handleStartScraping = () => {
    if (!startingNumber.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('contacts.scraping.starting_number_required', 'Starting phone number is required'),
        variant: 'destructive'
      });
      return;
    }

    if (!selectedConnectionId) {
      toast({
        title: t('common.error', 'Error'),
        description: t('contacts.scraping.connection_required', 'Please select a WhatsApp connection'),
        variant: 'destructive'
      });
      return;
    }

    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(startingNumber)) {
      toast({
        title: t('common.error', 'Error'),
        description: t('contacts.scraping.invalid_phone_format', 'Invalid phone number format. Use digits only (10-15 digits)'),
        variant: 'destructive'
      });
      return;
    }

    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > 1000) {
      toast({
        title: t('common.error', 'Error'),
        description: t('contacts.scraping.invalid_count', 'Count must be between 1 and 1000'),
        variant: 'destructive'
      });
      return;
    }

    startScrapingWithSSE({
      startingNumber: startingNumber.trim(),
      count: countNum,
      connectionId: selectedConnectionId
    });
  };

  const handleContactToggle = (phoneNumber: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(phoneNumber)) {
      newSelected.delete(phoneNumber);
    } else {
      newSelected.add(phoneNumber);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === scrapingResults.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(scrapingResults.map(contact => contact.phoneNumber)));
    }
  };

  const handleAddSelectedContacts = () => {
    const contactsToAdd = scrapingResults.filter(contact => 
      selectedContacts.has(contact.phoneNumber)
    );

    if (contactsToAdd.length === 0) {
      toast({
        title: t('common.error', 'Error'),
        description: t('contacts.scraping.no_contacts_selected', 'Please select at least one contact to add'),
        variant: 'destructive'
      });
      return;
    }

    addContactsMutation.mutate(contactsToAdd);
  };

  const handleClose = () => {
    if (isScrapingInProgress) {
      toast({
        title: t('common.warning', 'Warning'),
        description: t('contacts.scraping.scraping_in_progress', 'Scraping is in progress. Please wait for it to complete.'),
        variant: 'destructive'
      });
      return;
    }
    resetModal();
    onClose();
  };


  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 [&>div]:overflow-hidden [&>div]:p-0 [&>div]:pr-0">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            {t('contacts.scraping.title', 'Scrape WhatsApp Contacts')}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {t('contacts.scraping.description', 'Check sequential phone numbers for active WhatsApp accounts and add them to your contacts.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">

          {!isScrapingInProgress && scrapingResults.length === 0 && (
            <div className="space-y-4 sm:space-y-6">
              {/* WhatsApp Connection Selection */}
              <div className="space-y-2">
                <Label htmlFor="connection" className="text-sm sm:text-base font-medium">
                  {t('contacts.scraping.connection_label', 'WhatsApp Connection')}
                </Label>
                {isLoadingConnections ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('contacts.scraping.loading_connections', 'Loading connections...')}
                  </div>
                ) : connections.length === 0 ? (
                  <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                    {t('contacts.scraping.no_connections', 'No active WhatsApp connections found. Please set up a WhatsApp connection first.')}
                  </div>
                ) : (
                  <select
                    id="connection"
                    className="w-full p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={selectedConnectionId || ''}
                    onChange={(e) => setSelectedConnectionId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">{t('contacts.scraping.select_connection', 'Select a connection...')}</option>
                    {connections.map((conn: WhatsAppConnection) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.accountName} ({conn.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Starting Number Input */}
              <div className="space-y-2">
                <Label htmlFor="startingNumber" className="text-sm sm:text-base font-medium">
                  {t('contacts.scraping.starting_number_label', 'Starting Phone Number')}
                </Label>
                <Input
                  id="startingNumber"
                  type="text"
                  placeholder="923059002132"
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-sm sm:text-base p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs sm:text-sm text-gray-500">
                  {t('contacts.scraping.starting_number_help', 'Enter the starting phone number (digits only, including country code)')}
                </p>
              </div>

              {/* Count Input */}
              <div className="space-y-2">
                <Label htmlFor="count" className="text-sm sm:text-base font-medium">
                  {t('contacts.scraping.count_label', 'Number of Contacts to Check')}
                </Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="text-sm sm:text-base p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs sm:text-sm text-gray-500">
                  {t('contacts.scraping.count_help', 'How many sequential numbers to check (maximum 1000)')}
                </p>
              </div>
            </div>
          )}

          {/* Real-time Scraping Progress */}
          {isScrapingInProgress && (
            <div className="space-y-4 sm:space-y-6">
              {/* Progress Header */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-green-600" />
                <div className="text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-medium">{t('contacts.scraping.in_progress', 'Scraping in progress...')}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">{scrapingStatus}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {scrapingStats && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-green-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                      style={{ width: `${scrapingStats.progress || 0}%` }}
                    ></div>
                  </div>

                  {/* Live Statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">{scrapingStats.totalChecked || 0}</div>
                      <div className="text-gray-500 text-xs">{t('contacts.scraping.checked', 'Checked')}</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-600 text-sm sm:text-base">{scrapingStats.validCount || 0}</div>
                      <div className="text-gray-500 text-xs">{t('contacts.scraping.found', 'Found')}</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="font-medium text-red-600 text-sm sm:text-base">{scrapingStats.errors?.length || 0}</div>
                      <div className="text-gray-500 text-xs">{t('contacts.scraping.errors', 'Errors')}</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-600 text-sm sm:text-base">{scrapingStats.progress || 0}%</div>
                      <div className="text-gray-500 text-xs">{t('contacts.scraping.progress', 'Progress')}</div>
                    </div>
                  </div>

                  {/* Batch Progress */}
                  {scrapingStats.currentBatch && scrapingStats.totalBatches && (
                    <div className="text-center text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      {t('contacts.scraping.batch_progress', 'Batch {{current}} of {{total}}', {
                        current: scrapingStats.currentBatch,
                        total: scrapingStats.totalBatches
                      })}
                    </div>
                  )}

                  {/* Current Phone Number */}
                  {scrapingStats.currentPhoneNumber && (
                    <div className="text-center text-xs sm:text-sm text-gray-600 font-mono bg-blue-50 p-2 rounded-lg break-all">
                      {t('contacts.scraping.checking', 'Checking: +{{phone}}', {
                        phone: scrapingStats.currentPhoneNumber
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Results Display */}
              {scrapingResults.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                      {t('contacts.scraping.found_contacts', 'Found Contacts ({{count}})', {
                        count: scrapingResults.length
                      })}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="selectAllLive"
                        checked={selectedContacts.size === scrapingResults.length && scrapingResults.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="selectAllLive" className="cursor-pointer text-xs sm:text-sm">
                        {selectedContacts.size === scrapingResults.length && scrapingResults.length > 0
                          ? t('contacts.scraping.deselect_all', 'Deselect All')
                          : t('contacts.scraping.select_all', 'Select All')
                        }
                      </Label>
                    </div>
                  </div>

                  {/* Live Contact List */}
                  <div className="max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg">
                    {scrapingResults.map((contact) => {
                      const isRecentlyFound = recentlyFound.some(r => r.phoneNumber === contact.phoneNumber);
                      return (
                        <div
                          key={contact.phoneNumber}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b last:border-b-0 transition-all duration-500 ${
                            isRecentlyFound
                              ? 'bg-green-50 border-green-200 animate-pulse'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox
                            checked={selectedContacts.has(contact.phoneNumber)}
                            onCheckedChange={() => handleContactToggle(contact.phoneNumber)}
                          />

                          {/* Profile Picture */}
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {contact.profilePicture ? (
                              <img
                                src={contact.profilePicture}
                                alt={contact.name || contact.phoneNumber}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate">
                              {contact.name || contact.phoneNumber}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate">
                              +{contact.phoneNumber}
                            </div>
                          </div>

                          {/* WhatsApp Status & New Indicator */}
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3" />
                              <span className="text-xs hidden sm:inline">WhatsApp</span>
                            </div>

                            {/* Recently Found Indicator */}
                            {isRecentlyFound && (
                              <div className="text-xs bg-green-100 text-green-700 px-1 sm:px-2 py-1 rounded-full">
                                {t('contacts.scraping.new', 'New!')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}

          {/* Scraping Results */}
          {!isScrapingInProgress && scrapingResults.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              {/* Results Summary */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <h3 className="font-medium text-sm sm:text-base">{t('contacts.scraping.results_title', 'Scraping Results')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">{t('contacts.scraping.total_checked', 'Total Checked:')}</span>
                    <span className="ml-2 font-medium">{scrapingStats?.totalChecked || 0}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">{t('contacts.scraping.valid_found', 'Valid Found:')}</span>
                    <span className="ml-2 font-medium text-green-600">{scrapingStats?.validCount || 0}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">{t('contacts.scraping.errors', 'Errors:')}</span>
                    <span className="ml-2 font-medium text-red-600">{scrapingStats?.errors?.length || 0}</span>
                  </div>
                </div>
                {scrapingStats?.errors && scrapingStats.errors.length > 0 && (
                  <div className="mt-3">
                    <details className="text-xs sm:text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-700">
                        {t('contacts.scraping.view_errors', 'View Errors')}
                      </summary>
                      <div className="mt-2 max-h-24 sm:max-h-32 overflow-y-auto bg-red-50 p-2 rounded text-red-700">
                        {scrapingStats.errors.map((error, index) => (
                          <div key={index} className="text-xs break-words">{error}</div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Select All Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedContacts.size === scrapingResults.length && scrapingResults.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="selectAll" className="cursor-pointer text-xs sm:text-sm">
                    {selectedContacts.size === scrapingResults.length && scrapingResults.length > 0
                      ? t('contacts.scraping.deselect_all', 'Deselect All')
                      : t('contacts.scraping.select_all', 'Select All')
                    }
                  </Label>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">
                  {t('contacts.scraping.selected_count', '{{selected}} of {{total}} selected', {
                    selected: selectedContacts.size,
                    total: scrapingResults.length
                  })}
                </span>
              </div>

              {/* Results List */}
              <div className="max-h-64 sm:max-h-96 overflow-y-auto border rounded-lg">
                {scrapingResults.map((contact) => (
                  <div
                    key={contact.phoneNumber}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.phoneNumber)}
                      onCheckedChange={() => handleContactToggle(contact.phoneNumber)}
                    />

                    {/* Profile Picture */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {contact.profilePicture ? (
                        <img
                          src={contact.profilePicture}
                          alt={contact.name || contact.phoneNumber}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm truncate">
                        {contact.name || contact.phoneNumber}
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        +{contact.phoneNumber}
                      </div>
                    </div>

                    {/* WhatsApp Status */}
                    <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs hidden sm:inline">WhatsApp</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

          <DialogFooter className="px-4 sm:px-6 py-3 border-t flex-shrink-0 mt-auto">
            {!isScrapingInProgress && scrapingResults.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleStartScraping}
                  disabled={!selectedConnectionId || !startingNumber.trim() || connections.length === 0}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  {t('contacts.scraping.start_scraping', 'Start Scraping')}
                </Button>
              </div>
            )}

            {!isScrapingInProgress && scrapingResults.length > 0 && scrapingStats?.isCompleted && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button variant="outline" onClick={() => {
                  setScrapingResults([]);
                  setScrapingStats(null);
                  setScrapingStatus('');
                }} className="w-full sm:w-auto order-2 sm:order-1">
                  {t('contacts.scraping.start_new', 'Start New Scraping')}
                </Button>
                <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-3 sm:order-2">
                  {t('common.close', 'Close')}
                </Button>
                <Button
                  onClick={handleAddSelectedContacts}
                  disabled={selectedContacts.size === 0 || addContactsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-3"
                >
                  {addContactsMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      {t('contacts.scraping.adding', 'Adding...')}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      <span className="hidden sm:inline">
                        {t('contacts.scraping.add_selected', 'Add Selected Contacts ({{count}})', {
                          count: selectedContacts.size
                        })}
                      </span>
                      <span className="sm:hidden">
                        {t('contacts.scraping.add_selected_short', 'Add ({{count}})', {
                          count: selectedContacts.size
                        })}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {isScrapingInProgress && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:items-center">
                <div className="flex-1 text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  {scrapingStats && (
                    <span className="break-words">
                      <span className="hidden sm:inline">
                        {t('contacts.scraping.live_progress', 'Progress: {{checked}}/{{total}} checked, {{found}} found', {
                          checked: scrapingStats.totalChecked || 0,
                          total: scrapingStats.totalToCheck || 0,
                          found: scrapingStats.validCount || 0
                        })}
                      </span>
                      <span className="sm:hidden">
                        {t('contacts.scraping.live_progress_short', '{{checked}}/{{total}} • {{found}} found', {
                          checked: scrapingStats.totalChecked || 0,
                          total: scrapingStats.totalToCheck || 0,
                          found: scrapingStats.validCount || 0
                        })}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2 order-1 sm:order-2">
                  {scrapingResults.length > 0 && (
                    <Button
                      onClick={handleAddSelectedContacts}
                      disabled={selectedContacts.size === 0 || addContactsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      size="sm"
                    >
                      {addContactsMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          {t('contacts.scraping.adding', 'Adding...')}
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          {t('contacts.scraping.add_selected_short', 'Add ({{count}})', {
                            count: selectedContacts.size
                          })}
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" disabled className="flex-1 sm:flex-none">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">{t('contacts.scraping.scraping', 'Scraping...')}</span>
                    <span className="sm:hidden">{t('contacts.scraping.scraping_short', 'Scraping')}</span>
                  </Button>
                </div>
              </div>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
