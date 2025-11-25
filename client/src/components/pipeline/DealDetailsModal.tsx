import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { Deal } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ContactAvatar } from '@/components/contacts/ContactAvatar';
import {
  User,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  FileText,
  AlertCircle,
  Phone,
  Mail,
  Building
} from 'lucide-react';

interface DealDetailsModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealDetailsModal({ deal, isOpen, onClose }: DealDetailsModalProps) {
  const { data: contact } = useQuery({
    queryKey: ['/api/contacts', deal?.contactId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/contacts/${deal?.contactId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          return res.json();
        }
        return null;
      } catch (error) {
        console.warn('Failed to fetch contact:', error);
        return null;
      }
    },
    enabled: !!deal?.contactId && typeof deal.contactId === 'number',
  });

  const { data: assignedUser } = useQuery({
    queryKey: ['/api/users', deal?.assignedToUserId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${deal?.assignedToUserId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          return res.json();
        }
        return null;
      } catch (error) {
        console.warn('Failed to fetch assigned user:', error);
        return null;
      }
    },
    enabled: !!deal?.assignedToUserId && typeof deal.assignedToUserId === 'number',
  });

  const { data: pipelineStage } = useQuery({
    queryKey: ['/api/pipeline/stages', deal?.stageId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/pipeline/stages/${deal?.stageId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          return res.json();
        }
        return null;
      } catch (error) {
        console.warn('Failed to fetch pipeline stage:', error);
        return null;
      }
    },
    enabled: !!deal?.stageId && typeof deal.stageId === 'number',
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['/api/deals', deal?.id, 'activities'],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/deals/${deal?.id}/activities`, {
          credentials: 'include',
        });
        if (res.ok) {
          return res.json();
        }
        return [];
      } catch (error) {
        console.warn('Failed to fetch deal activities:', error);
        return [];
      }
    },
    enabled: !!deal?.id && typeof deal.id === 'number',
  });

  if (!deal) return null;

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };

  const priorityColor = priorityColors[deal.priority as keyof typeof priorityColors] || 'bg-gray-500';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${priorityColor}`} />
              {deal.title}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6">
            {contact && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <ContactAvatar contact={contact} size="lg" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-lg">{contact.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Deal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deal.value && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Deal Value</p>
                      <p className="font-semibold text-lg">
                        ${new Intl.NumberFormat().format(deal.value)}
                      </p>
                    </div>
                  </div>
                )}

                {pipelineStage && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: pipelineStage.color }}
                    />
                    <div>
                      <p className="text-sm text-muted-foreground">Pipeline Stage</p>
                      <p className="font-semibold">{pipelineStage.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="font-semibold capitalize">{deal.priority}</p>
                  </div>
                </div>

                {assignedUser && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="font-semibold">{assignedUser.name}</p>
                    </div>
                  </div>
                )}

                {deal.dueDate && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-semibold">
                        {format(new Date(deal.dueDate), 'PPP')}
                      </p>
                    </div>
                  </div>
                )}

                {deal.lastActivityAt && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Activity</p>
                      <p className="font-semibold">
                        {formatDistanceToNow(new Date(deal.lastActivityAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {deal.description && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">{deal.description}</p>
                </div>
              </>
            )}

            {deal.tags && deal.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activities.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Recent Activities</h3>
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((activity: any) => (
                      <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium">Created</p>
                <p>{format(new Date(deal.createdAt), 'PPP p')}</p>
              </div>
              <div>
                <p className="font-medium">Last Updated</p>
                <p>{format(new Date(deal.updatedAt), 'PPP p')}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
