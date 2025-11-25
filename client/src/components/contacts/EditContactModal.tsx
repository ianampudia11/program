import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Contact {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  tags?: string[] | null;
  isActive?: boolean | null;
  identifier?: string | null;
  identifierType?: string | null;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditContactModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditContactModal({ contact, isOpen, onClose }: EditContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    identifierType: '',
    identifier: '',
    notes: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        identifierType: contact.identifierType || '',
        identifier: contact.identifier || '',
        notes: contact.notes || '',
        tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : ''
      });
    }
  }, [contact]);

  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!contact?.id) throw new Error(t('contacts.edit.contact_id_missing', 'Contact ID is missing'));

      const response = await apiRequest('PATCH', `/api/contacts/${contact.id}`, data);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('contacts.edit.update_failed', 'Failed to update contact'));
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('contacts.edit.success_title', 'Contact updated'),
        description: t('contacts.edit.success_description', 'The contact has been successfully updated.'),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/tags'] });

      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('contacts.edit.error_title', 'Update failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const tagsArray = formData.tags
      ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];
      
    updateContactMutation.mutate({
      ...formData,
      tags: tagsArray
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('contacts.edit.title', 'Edit Contact')}</DialogTitle>
          <DialogDescription>
            {t('contacts.edit.description', 'Make changes to the contact information below.')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('contacts.edit.name_label', 'Name')} *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('contacts.edit.email_label', 'Email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('contacts.edit.phone_label', 'Phone')}</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">{t('contacts.edit.company_label', 'Company')}</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="identifierType">{t('contacts.edit.channel_label', 'Channel')}</Label>
              <Select
                value={formData.identifierType}
                onValueChange={(value) => handleSelectChange('identifierType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contacts.edit.select_channel_placeholder', 'Select channel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp_official">{t('contacts.edit.channel.whatsapp_official', 'WhatsApp Official')}</SelectItem>
                  <SelectItem value="whatsapp_unofficial">{t('contacts.edit.channel.whatsapp_unofficial', 'WhatsApp Unofficial')}</SelectItem>
                  <SelectItem value="messenger">{t('contacts.edit.channel.messenger', 'Facebook Messenger')}</SelectItem>
                  <SelectItem value="instagram">{t('contacts.edit.channel.instagram', 'Instagram')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">{t('contacts.edit.channel_identifier_label', 'Channel Identifier')}</Label>
              <Input
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder={t('contacts.edit.channel_identifier_placeholder', 'Phone number or ID')}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">{t('contacts.edit.tags_label', 'Tags (comma separated)')}</Label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder={t('contacts.edit.tags_placeholder', 'lead, customer, etc.')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('contacts.edit.notes_label', 'Notes')}</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="brand"
              className="btn-brand-primary"
            >
              {isSubmitting ? t('contacts.edit.saving', 'Saving...') : t('contacts.edit.save_changes', 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}