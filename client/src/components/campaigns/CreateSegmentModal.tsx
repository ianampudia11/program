import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Tag,
  X,
  Plus,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Activity,
  Trash2,
  Undo2,
  Upload,
  Download,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import type { SegmentFilterCriteria } from '../../../../shared/schema';

interface CreateSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSegmentCreated: (segment: any) => void;
}

type SegmentCriteria = SegmentFilterCriteria;

interface ContactPreview {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  tags: string[] | null;
  createdAt: string;
  lastActivity: string | null;
}

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function CreateSegmentModal({ isOpen, onClose, onSegmentCreated }: CreateSegmentModalProps) {
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
  const [contactPreview, setContactPreview] = useState<ContactPreview[]>([]);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [excludedContactIds, setExcludedContactIds] = useState<number[]>([]);
  const [excludedContactDetails, setExcludedContactDetails] = useState<ContactPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [csvColumnMapping, setCsvColumnMapping] = useState<Record<string, string>>({});
  const [csvImportStep, setCsvImportStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload');
  const [csvImportResults, setCsvImportResults] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '' });
      setCriteria({ tags: [], created_after: '', created_before: '' });
      setNewTag('');
      setContactCount(null);
      setContactPreview([]);
      setHasMoreContacts(false);
      setExcludedContactIds([]);
      setExcludedContactDetails([]);
      setShowCsvImport(false);
      setCsvFile(null);
      setCsvPreviewData([]);
      setCsvColumnMapping({});
      setCsvImportStep('upload');
      setCsvImportResults(null);
    }
  }, [isOpen]);

  const debouncedPreview = useCallback(
    debounce(async (criteria: SegmentCriteria) => {
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
        }
      } catch (error) {
        console.error('Failed to preview contacts:', error);
        setContactCount(null);
        setContactPreview([]);
        setHasMoreContacts(false);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (isOpen && ((criteria.tags?.length ?? 0) > 0 || criteria.created_after || criteria.created_before)) {
      debouncedPreview(criteria);
    } else {
      setContactCount(null);
      setContactPreview([]);
      setHasMoreContacts(false);
    }
  }, [criteria, isOpen, debouncedPreview]);

  const handleExcludeContact = (contactId: number) => {
    const contactToExclude = contactPreview.find(c => c.id === contactId);

    setExcludedContactIds(prev => [...prev, contactId]);

    if (contactToExclude) {
      setExcludedContactDetails(prev => [...prev, contactToExclude]);
    }

    toast({
      title: t('segments.create.contact_excluded_title', 'Contact excluded'),
      description: t('segments.create.contact_excluded_desc', 'Contact has been removed from this segment preview'),
    });
  };

  const handleUndoExclusion = (contactId: number) => {
    setExcludedContactIds(prev => prev.filter(id => id !== contactId));
    setExcludedContactDetails(prev => prev.filter(contact => contact.id !== contactId));
    toast({
      title: t('segments.create.contact_restored_title', 'Contact restored'),
      description: t('segments.create.contact_restored_desc', 'Contact has been added back to the segment preview'),
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

  const handleAddTag = () => {
    if (newTag.trim() && !(criteria.tags ?? []).includes(newTag.trim())) {
      setCriteria(prev => ({
        ...prev,
        tags: [...(prev.tags ?? []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCriteria(prev => ({
      ...prev,
      tags: (prev.tags ?? []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const downloadCsvTemplate = async () => {
    try {
      const response = await fetch('/api/contacts/csv-template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contact_import_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download template');
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.csv.template_download_failed', 'Failed to download CSV template'),
        variant: 'destructive'
      });
    }
  };

  const handleCsvFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCsvFile(file);
    } else {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.csv.invalid_file', 'Please select a valid CSV file'),
        variant: 'destructive'
      });
    }
  };

  const parseCsvFile = (file: File) => {
    setCsvImportLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          throw new Error(t('segments.csv.insufficient_data', 'CSV file must contain at least a header row and one data row'));
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        setCsvPreviewData(dataRows.slice(0, 10)); // Show first 10 rows for preview


        const mapping: Record<string, string> = {};
        const expectedColumns = ['name', 'phone', 'email', 'company', 'tags', 'notes'];

        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
          const match = expectedColumns.find(col =>
            col === normalizedHeader ||
            normalizedHeader.includes(col) ||
            col.includes(normalizedHeader)
          );
          if (match) {
            mapping[header] = match;
          }
        });

        setCsvColumnMapping(mapping);
        setCsvImportStep('mapping');
      } catch (error) {
        toast({
          title: t('common.error', 'Error'),
          description: error instanceof Error ? error.message : t('segments.csv.parse_error', 'Failed to parse CSV file'),
          variant: 'destructive'
        });
      } finally {
        setCsvImportLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    setCsvImportStep('importing');
    setCsvImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('duplicateHandling', 'skip');
      formData.append('columnMapping', JSON.stringify(csvColumnMapping));

      const response = await fetch('/api/contacts/import-for-segment', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setCsvImportResults(result);
        setCsvImportStep('results'); // Add this line to show results


        if ((criteria.tags?.length ?? 0) > 0 || criteria.created_after || criteria.created_before) {
          debouncedPreview(criteria);
        }

        toast({
          title: t('common.success', 'Success'),
          description: t('segments.csv.import_success', 'Successfully imported {{count}} contacts', { count: result.successful })
        });
      } else {
        throw new Error(result.error || t('segments.csv.import_failed', 'Failed to import contacts'));
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('segments.csv.import_failed', 'Failed to import contacts'),
        variant: 'destructive'
      });
    } finally {
      setCsvImportLoading(false);
    }
  };

  const resetCsvImport = () => {
    setShowCsvImport(false);
    setCsvFile(null);
    setCsvPreviewData([]);
    setCsvColumnMapping({});
    setCsvImportStep('upload');
    setCsvImportResults(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.create.name_required', 'Please enter a segment name'),
        variant: 'destructive'
      });
      return;
    }

    if ((criteria.tags?.length ?? 0) === 0 && !criteria.created_after && !criteria.created_before) {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.create.criteria_required', 'Please add at least one filter criteria'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          criteria: {
            ...criteria,
            excludedContactIds
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: t('common.success', 'Success'),
          description: t('segments.create.success', 'Segment created successfully')
        });
        onSegmentCreated(data.data);
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('segments.create.failed', 'Failed to create segment'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('segments.create.title', 'Create Contact Segment')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('segments.create.name_label', 'Segment Name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('segments.create.name_placeholder', 'e.g., VIP Customers, New Leads')}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{t('segments.create.description_label', 'Description (Optional)')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('segments.create.description_placeholder', 'Describe this segment...')}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{t('segments.create.filter_criteria_title', 'Filter Criteria')}</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('segments.csv.download_template', 'Download Template')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCsvImport(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {t('segments.csv.import_contacts', 'Import from CSV')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="created_after">{t('segments.create.created_after_label', 'Created After')}</Label>
                <Input
                  id="created_after"
                  type="date"
                  value={criteria.created_after}
                  onChange={(e) => setCriteria(prev => ({ ...prev, created_after: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="created_before">{t('segments.create.created_before_label', 'Created Before')}</Label>
                <Input
                  id="created_before"
                  type="date"
                  value={criteria.created_before}
                  onChange={(e) => setCriteria(prev => ({ ...prev, created_before: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>{t('segments.create.contact_tags_label', 'Contact Tags')}</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('segments.create.tag_placeholder', 'Enter tag name')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {(criteria.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(criteria.tags ?? []).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveTag(tag);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('segments.create.tags_description', 'Contacts must have ALL selected tags')}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('segments.create.contact_preview_title', 'Contact Preview')}
              </h4>
              {effectiveContactCount !== null && (
                <div className="text-sm text-muted-foreground">
                  {hasMoreContacts ? (
                    <>{t('segments.create.showing_first_50', 'Showing first 50 of')} <strong>{effectiveContactCount}</strong> {t('segments.create.unique_contacts', 'unique contacts')}</>
                  ) : (
                    <><strong>{effectiveContactCount}</strong> {t('segments.create.unique_contacts_match_criteria', 'unique contacts match these criteria')}</>
                  )}
                  {excludedContactIds.length > 0 && (
                    <span className="text-orange-600 ml-2">
                      ({excludedContactIds.length} {t('segments.create.excluded', 'excluded')})
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('segments.create.deduplication_note', 'Note: Duplicates by phone number are automatically removed. Counts reflect unique phone numbers.')}
                  </div>
                </div>
              )}
            </div>

            {isPreviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('segments.create.loading_preview', 'Loading contact preview...')}
                </div>
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('segments.create.table.contact_name', 'Contact Name')}</TableHead>
                      <TableHead>{t('segments.create.table.phone', 'Phone')}</TableHead>
                      <TableHead>{t('segments.create.table.email', 'Email')}</TableHead>
                      <TableHead>{t('segments.create.table.tags', 'Tags')}</TableHead>
                      <TableHead>{t('segments.create.table.created', 'Created')}</TableHead>
                      <TableHead>{t('segments.create.table.last_activity', 'Last Activity')}</TableHead>
                      <TableHead className="w-20">{t('segments.create.table.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {contact.name || t('segments.create.table.unknown', 'Unknown')}
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
                              {contact.tags.slice(0, 2).map((tag, index) => (
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
                              <span className="text-sm text-muted-foreground">{t('segments.create.table.no_activity', 'No activity')}</span>
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
                            title={t('segments.create.exclude_contact_tooltip', 'Exclude contact from segment')}
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
                <p>{t('segments.create.all_contacts_excluded', 'All contacts have been excluded from this segment')}</p>
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
                      {t('segments.create.restore_all_contacts', 'Restore all contacts')}
                    </Button>
                  )}
                </p>
              </div>
            ) : effectiveContactCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('segments.create.no_contacts_match', 'No contacts match the current criteria')}</p>
                <p className="text-sm">{t('segments.create.try_adjusting_filters', 'Try adjusting your filters')}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('segments.create.add_filter_criteria', 'Add filter criteria to preview contacts')}</p>
                <p className="text-sm">{t('segments.create.select_tags_or_dates', 'Select tags or date ranges to see matching contacts')}</p>
              </div>
            )}

            {excludedContactIds.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-orange-800">
                    {t('segments.create.excluded_contacts_title', 'Excluded Contacts')} ({excludedContactIds.length})
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
                    {t('segments.create.restore_all', 'Restore All')}
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
                        title={t('segments.create.restore_contact_tooltip', 'Restore contact')}
                      >
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('segments.create.create_button', 'Create Segment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* CSV Import Dialog */}
      <Dialog open={showCsvImport} onOpenChange={resetCsvImport}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('segments.csv.import_title', 'Import Contacts from CSV')}
            </DialogTitle>
            <DialogDescription>
              {t('segments.csv.import_description', 'Upload a CSV file to import contacts into your segment')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {csvImportStep === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t('segments.csv.upload_instruction', 'Choose a CSV file to upload')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('segments.csv.file_requirements', 'File must be in CSV format with headers: name, phone, email, company, tags, notes')}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4" />
                    {t('segments.csv.select_file', 'Select CSV File')}
                  </label>
                </div>

                {csvImportLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('segments.csv.parsing', 'Parsing CSV file...')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {csvImportStep === 'mapping' && csvPreviewData.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">
                    {t('segments.csv.column_mapping', 'Column Mapping')}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('segments.csv.mapping_instruction', 'Map your CSV columns to contact fields')}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(csvPreviewData[0] || {}).map(csvColumn => (
                      <div key={csvColumn} className="space-y-2">
                        <Label className="text-sm font-medium">{csvColumn}</Label>
                        <Select
                          value={csvColumnMapping[csvColumn] || ''}
                          onValueChange={(value) =>
                            setCsvColumnMapping(prev => ({ ...prev, [csvColumn]: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('segments.csv.select_field', 'Select field')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">{t('segments.csv.skip_column', 'Skip this column')}</SelectItem>
                            <SelectItem value="name">{t('segments.csv.field_name', 'Name')}</SelectItem>
                            <SelectItem value="phone">{t('segments.csv.field_phone', 'Phone')}</SelectItem>
                            <SelectItem value="email">{t('segments.csv.field_email', 'Email')}</SelectItem>
                            <SelectItem value="company">{t('segments.csv.field_company', 'Company')}</SelectItem>
                            <SelectItem value="tags">{t('segments.csv.field_tags', 'Tags')}</SelectItem>
                            <SelectItem value="notes">{t('segments.csv.field_notes', 'Notes')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    {t('segments.csv.preview_title', 'Data Preview')}
                  </h4>
                  <div className="border rounded-lg max-h-60 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(csvPreviewData[0] || {}).map(column => (
                            <TableHead key={column} className="text-xs">
                              {column}
                              {csvColumnMapping[column] && (
                                <div className="text-xs text-muted-foreground">
                                  → {csvColumnMapping[column]}
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreviewData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <TableCell key={cellIndex} className="text-xs">
                                {String(value).substring(0, 30)}
                                {String(value).length > 30 && '...'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {csvImportStep === 'importing' && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('segments.csv.importing', 'Importing contacts...')}
                </div>
              </div>
            )}

            {csvImportStep === 'results' && csvImportResults && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    {t('segments.csv.import_complete', 'Import Complete')}
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>{t('segments.csv.successful_imports', 'Successfully imported: {{count}} contacts', { count: csvImportResults.successful })}</p>
                    <p>{t('segments.csv.failed_imports', 'Failed imports: {{count}}', { count: csvImportResults.failed })}</p>
                    {csvImportResults.errors && csvImportResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">{t('segments.csv.errors', 'Errors:')}</p>
                        <ul className="list-disc list-inside text-xs">
                          {csvImportResults.errors.slice(0, 5).map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                          {csvImportResults.errors.length > 5 && (
                            <li>{t('segments.csv.more_errors', 'And {{count}} more errors...', { count: csvImportResults.errors.length - 5 })}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetCsvImport}>
              {csvImportResults ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
            </Button>
            {csvImportStep === 'mapping' && (
              <Button
                onClick={handleCsvImport}
                disabled={csvImportLoading || Object.keys(csvColumnMapping).filter(k => csvColumnMapping[k] && csvColumnMapping[k] !== '__skip__').length === 0}
              >
                {csvImportLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('segments.csv.import_button', 'Import Contacts')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
