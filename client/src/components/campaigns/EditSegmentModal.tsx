import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Tag,
  X,
  Plus,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Activity,
  Trash2,
  Undo2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { ToastAction } from '@/components/ui/toast';
import type { SegmentFilterCriteria } from '../../../../shared/schema';

interface EditSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: number;
  onSegmentUpdated: (segment: any) => void;
}

type SegmentCriteria = SegmentFilterCriteria;

interface ContactSegment {
  id: number;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  contactCount: number;
  createdById: number;
}

export function EditSegmentModal({ isOpen, onClose, segmentId, onSegmentUpdated }: EditSegmentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [criteria, setCriteria] = useState<SegmentCriteria>({
    tags: [],
    created_after: '',
    created_before: ''
  });
  const [newTag, setNewTag] = useState('');
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [contactPreview, setContactPreview] = useState<any[]>([]);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [excludedContactIds, setExcludedContactIds] = useState<number[]>([]);
  const [excludedContactDetails, setExcludedContactDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [originalSegment, setOriginalSegment] = useState<ContactSegment | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const { t } = useTranslation();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    if (isOpen && segmentId) {
      loadSegment();
    }
  }, [isOpen, segmentId]);

  const loadSegment = async () => {
    setIsLoadingSegment(true);
    try {
      const response = await fetch(`/api/campaigns/segments/${segmentId}`);
      const data = await response.json();

      if (data.success) {
        const segment = data.data;
        setOriginalSegment(segment);
        setFormData({
          name: segment.name,
          description: segment.description || '',
        });
        const segmentCriteria = segment.criteria || { tags: [] };
        setCriteria(segmentCriteria);


        if (segmentCriteria.excludedContactIds && segmentCriteria.excludedContactIds.length > 0) {
          setExcludedContactIds(segmentCriteria.excludedContactIds);

        }

        setContactCount(segment.contactCount);


        if (segmentCriteria.tags.length > 0 || segmentCriteria.created_after || segmentCriteria.created_before) {
          debouncedPreview(segmentCriteria);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.edit.load_failed', 'Failed to load segment'),
        variant: 'destructive'
      });
      onClose();
    } finally {
      setIsLoadingSegment(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setCriteria({
      tags: [],
      created_after: '',
      created_before: ''
    });
    setNewTag('');
    setContactCount(null);
    setContactPreview([]);
    setHasMoreContacts(false);
    setExcludedContactIds([]);
    setExcludedContactDetails([]);
    setOriginalSegment(null);
    setRetryCount(0);
  };

  const retryUpdate = () => {
    setRetryCount(prev => prev + 1);

    const syntheticEvent = {
      preventDefault: () => {}
    } as React.FormEvent;
    handleSubmit(syntheticEvent);
  };


  const debouncedPreview = useCallback((criteria: SegmentCriteria) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const response = await fetch('/api/campaigns/segments/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria,
            includeDetails: true,
            limit: 50
          })
        });

        const data = await response.json();
        if (data.success) {
          setContactCount(data.data.count);
          setContactPreview(data.data.contacts || []);
          setHasMoreContacts(data.data.hasMore || false);


          if (excludedContactIds.length > 0 && excludedContactDetails.length === 0) {
            const excludedDetails = data.data.contacts.filter((contact: any) =>
              excludedContactIds.includes(contact.id)
            );
            setExcludedContactDetails(excludedDetails);
          }
        }
      } catch (error) {
        console.error('Failed to preview contacts:', error);
        setContactCount(null);
        setContactPreview([]);
        setHasMoreContacts(false);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 500);
  }, [excludedContactIds.length, excludedContactDetails.length]);


  useEffect(() => {
    if (isOpen && ((criteria.tags?.length ?? 0) > 0 || criteria.created_after || criteria.created_before)) {
      debouncedPreview(criteria);
    } else {
      setContactCount(null);
      setContactPreview([]);
      setHasMoreContacts(false);
    }
  }, [criteria, isOpen, debouncedPreview]);


  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);


  const handleExcludeContact = (contactId: number) => {

    const contactToExclude = contactPreview.find(c => c.id === contactId);

    setExcludedContactIds(prev => [...prev, contactId]);

    if (contactToExclude) {
      setExcludedContactDetails(prev => [...prev, contactToExclude]);
    }

    toast({
      title: t('segments.edit.contact_excluded_title', 'Contact excluded'),
      description: t('segments.edit.contact_excluded_desc', 'Contact has been removed from this segment preview'),
    });
  };


  const handleUndoExclusion = (contactId: number) => {
    setExcludedContactIds(prev => prev.filter(id => id !== contactId));
    setExcludedContactDetails(prev => prev.filter(contact => contact.id !== contactId));
    toast({
      title: t('segments.edit.contact_restored_title', 'Contact restored'),
      description: t('segments.edit.contact_restored_desc', 'Contact has been added back to the segment preview'),
    });
  };


  const isValidPhoneLength = (phone: string): boolean => {
    if (!phone) return false;
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    return digitsOnly.length <= 14;
  };



  const filteredContacts = contactPreview.filter(contact =>
    !excludedContactIds.includes(contact.id) && isValidPhoneLength(contact.phone)
  );


  const invalidPhoneContacts = contactPreview.filter(contact => !isValidPhoneLength(contact.phone));
  const effectiveContactCount = contactCount !== null ?
    Math.max(0, contactCount - excludedContactIds.length - invalidPhoneContacts.length) : null;

  const addTag = () => {
    if (newTag.trim() && !(criteria.tags ?? []).includes(newTag.trim())) {
      setCriteria(prev => ({
        ...prev,
        tags: [...(prev.tags ?? []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCriteria(prev => ({
      ...prev,
      tags: (prev.tags ?? []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t('segments.edit.validation_error', 'Validation Error'),
        description: t('segments.edit.name_required', 'Segment name is required'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/segments/${segmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          criteria: {
            ...criteria,
            excludedContactIds
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {

        const updatedSegment = {
          ...data.data,
          contactCount: data.data.contactCount || 0
        };

        toast({
          title: t('common.success', 'Success'),
          description: t('segments.edit.update_success', 'Segment updated successfully')
        });


        await new Promise(resolve => setTimeout(resolve, 100));


        onSegmentUpdated(updatedSegment);


        onClose();
        resetForm();
      } else {
        throw new Error(data.error || 'Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating segment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';


      if (retryCount < 2) {
        toast({
          title: t('common.error', 'Error'),
          description: t('segments.edit.update_failed', 'Failed to update segment') + ': ' + errorMessage,
          variant: 'destructive',
          action: (
            <ToastAction altText={t('common.retry', 'Retry')} onClick={retryUpdate}>
              {t('common.retry', 'Retry')}
            </ToastAction>
          )
        });
      } else {
        toast({
          title: t('common.error', 'Error'),
          description: t('segments.edit.update_failed_final', 'Failed to update segment after multiple attempts') + ': ' + errorMessage,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/segments/${segmentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: t('common.success', 'Success'),
          description: t('segments.edit.delete_success', 'Segment deleted successfully')
        });
        onSegmentUpdated(null); // Signal deletion
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: (error instanceof Error ? error.message : null) || t('segments.edit.delete_failed', 'Failed to delete segment'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoadingSegment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">{t('segments.edit.loading_segment', 'Loading segment...')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {

        if (!open && (isLoading || isLoadingSegment)) {
          return;
        }
        if (!open) {
          onClose();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('segments.edit.title', 'Edit Contact Segment')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('segments.edit.name_label', 'Segment Name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('segments.edit.name_placeholder', 'e.g., VIP Customers, New Leads')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('segments.edit.description_label', 'Description (Optional)')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('segments.edit.description_placeholder', 'Describe this segment...')}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Filter Criteria */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('segments.edit.filter_criteria_title', 'Filter Criteria')}</h3>

              {/* Tags */}
              <div className="space-y-2">
                <Label>{t('segments.edit.contact_tags_label', 'Contact Tags')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder={t('segments.edit.tag_placeholder', 'Add a tag...')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {(criteria.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(criteria.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeTag(tag);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="created_after">{t('segments.edit.created_after_label', 'Created After')}</Label>
                  <Input
                    id="created_after"
                    type="date"
                    value={criteria.created_after}
                    onChange={(e) => setCriteria(prev => ({ ...prev, created_after: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="created_before">{t('segments.edit.created_before_label', 'Created Before')}</Label>
                  <Input
                    id="created_before"
                    type="date"
                    value={criteria.created_before}
                    onChange={(e) => setCriteria(prev => ({ ...prev, created_before: e.target.value }))}
                  />
                </div>
              </div>

            </div>

            <Separator />

            {/* Contact Preview Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('segments.edit.contact_preview_title', 'Contact Preview')}
                </h4>
                {effectiveContactCount !== null && (
                  <div className="text-sm text-muted-foreground">
                    {hasMoreContacts ? (
                      <>{t('segments.edit.showing_first_50', 'Showing first 50 of')} <strong>{effectiveContactCount}</strong> {t('segments.edit.unique_contacts', 'unique contacts')}</>
                    ) : (
                      <><strong>{effectiveContactCount}</strong> {t('segments.edit.unique_contacts_match_criteria', 'unique contacts match these criteria')}</>
                    )}
                    {excludedContactIds.length > 0 && (
                      <span className="text-orange-600 ml-2">
                        ({excludedContactIds.length} {t('segments.edit.excluded', 'excluded')})
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('segments.edit.deduplication_note', 'Note: Duplicates by phone number are automatically removed. Counts reflect unique phone numbers.')}
                    </div>
                  </div>
                )}
              </div>

              {isPreviewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('segments.edit.loading_preview', 'Loading contact preview...')}
                  </div>
                </div>
              ) : filteredContacts.length > 0 ? (
                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('segments.edit.table.contact_name', 'Contact Name')}</TableHead>
                        <TableHead>{t('segments.edit.table.phone', 'Phone')}</TableHead>
                        <TableHead>{t('segments.edit.table.email', 'Email')}</TableHead>
                        <TableHead>{t('segments.edit.table.tags', 'Tags')}</TableHead>
                        <TableHead>{t('segments.edit.table.created', 'Created')}</TableHead>
                        <TableHead>{t('segments.edit.table.last_activity', 'Last Activity')}</TableHead>
                        <TableHead className="w-20">{t('segments.edit.table.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {contact.name || t('segments.edit.table.unknown', 'Unknown')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              {contact.phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                {contact.email}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.tags && contact.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {contact.tags.slice(0, 2).map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {contact.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{contact.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(contact.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.lastActivity ? (
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-green-500" />
                                <span className="text-sm">
                                  {new Date(contact.lastActivity).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{t('segments.edit.table.no_activity', 'No activity')}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleExcludeContact(contact.id);
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title={t('segments.edit.exclude_contact_tooltip', 'Exclude contact from segment')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : contactPreview.length > 0 && filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('segments.edit.all_contacts_excluded', 'All contacts have been excluded from this segment')}</p>
                  <p className="text-sm">
                    {excludedContactIds.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExcludedContactIds([]);
                          setExcludedContactDetails([]);
                        }}
                        className="mt-2"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        {t('segments.edit.restore_all_contacts', 'Restore all contacts')}
                      </Button>
                    )}
                  </p>
                </div>
              ) : effectiveContactCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('segments.edit.no_contacts_match', 'No contacts match the current criteria')}</p>
                  <p className="text-sm">{t('segments.edit.try_adjusting_filters', 'Try adjusting your filters')}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('segments.edit.add_filter_criteria', 'Add filter criteria to preview contacts')}</p>
                  <p className="text-sm">{t('segments.edit.select_tags_or_dates', 'Select tags or date ranges to see matching contacts')}</p>
                </div>
              )}

              {/* Excluded Contacts Section */}
              {excludedContactIds.length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-orange-800">
                      {t('segments.edit.excluded_contacts_title', 'Excluded Contacts')} ({excludedContactIds.length})
                    </h5>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExcludedContactIds([]);
                        setExcludedContactDetails([]);
                      }}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      {t('segments.edit.restore_all', 'Restore All')}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {excludedContactDetails.map((excludedContact) => (
                      <div
                        key={excludedContact.id}
                        className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-orange-200"
                      >
                        <span className="text-sm text-orange-800">
                          {excludedContact.name || excludedContact.phone || `Contact ${excludedContact.id}`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUndoExclusion(excludedContact.id);
                          }}
                          className="h-5 w-5 p-0 text-orange-600 hover:text-orange-800"
                          title={t('segments.edit.restore_contact_tooltip', 'Restore contact')}
                        >
                          <Undo2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('segments.edit.delete_button', 'Delete Segment')}
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('segments.edit.updating', 'Updating...')}
                    </>
                  ) : (
                    t('segments.edit.update_button', 'Update Segment')
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('segments.edit.delete_confirm_title', 'Delete Segment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('segments.edit.delete_confirm_message', 'Are you sure you want to delete this segment? This action cannot be undone.')}
              {originalSegment && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{originalSegment.name}</strong> ({originalSegment.contactCount} {t('segments.edit.contacts', 'contacts')})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('segments.edit.delete_confirm_button', 'Delete Segment')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
