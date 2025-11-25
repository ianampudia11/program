import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  connectionId: number | null;
}

export function EditWebChatConnectionForm({ isOpen, onClose, onSuccess, connectionId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingConn, setLoadingConn] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [widgetColor, setWidgetColor] = useState('#6366f1');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  const [showAvatar, setShowAvatar] = useState(true);
  const [allowFileUpload, setAllowFileUpload] = useState(false);
  const [collectEmail, setCollectEmail] = useState(false);
  const [collectName, setCollectName] = useState(false);
  const [widgetToken, setWidgetToken] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !connectionId) return;
      setLoadingConn(true);
      try {
        const res = await fetch(`/api/channel-connections/${connectionId}`);
        if (!res.ok) throw new Error('Failed to load connection');
        const c = await res.json();
        setAccountName(c.accountName || '');
        const data = c.connectionData || {};
        setWidgetColor(data.widgetColor || '#6366f1');
        setWelcomeMessage(data.welcomeMessage || '');
        setCompanyName(data.companyName || '');
        setPosition(data.position || 'bottom-right');
        setShowAvatar(data.showAvatar !== false);
        setAllowFileUpload(!!data.allowFileUpload);
        setCollectEmail(!!data.collectEmail);
        setCollectName(data.collectName !== false);
        setWidgetToken(data.widgetToken || '');
      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || 'Failed to load WebChat connection', variant: 'destructive' });
        onClose();
      } finally {
        setLoadingConn(false);
      }
    };
    load();
  }, [isOpen, connectionId]);

  const handleSave = async () => {
    if (!connectionId) return;
    if (!accountName.trim()) {
      toast({ title: 'Validation Error', description: 'Account name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/channel-connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: 'webchat',
          accountName,
          connectionData: {
            widgetColor,
            welcomeMessage,
            companyName,
            position,
            showAvatar,
            allowFileUpload,
            collectEmail,
            collectName,
            widgetToken
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update WebChat connection');
      }
      toast({ title: 'Updated', description: 'WebChat connection updated successfully' });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: 'Update Failed', description: e?.message || 'Failed to update connection', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!connectionId) return;
    if (!confirm('Regenerate token? Old embed code will stop working.')) return;
    try {
      const res = await fetch(`/api/channel-connections/${connectionId}/regenerate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to regenerate token');
      }
      const data = await res.json();
      const token = data?.connectionData?.widgetToken;
      if (token) setWidgetToken(token);
      toast({ title: 'Token Regenerated', description: 'Embed code updated with new token' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Failed to regenerate token', variant: 'destructive' });
    }
  };

  const embedCode = widgetToken ? `<script src="${window.location.origin}/api/webchat/widget.js?token=${widgetToken}" async></script>` : '';
  const iframeCode = widgetToken ? `<iframe src="${window.location.origin}/api/webchat/embed/${widgetToken}" style=\"width: 100%; height: 600px; border: 0; background: transparent;\" sandbox=\"allow-scripts allow-same-origin\" referrerpolicy=\"no-referrer\" loading=\"lazy\" title=\"WebChat\"></iframe>` : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit WebChat Connection</DialogTitle>
          <DialogDescription>Update widget settings and manage your embed code.</DialogDescription>
        </DialogHeader>
        {loadingConn ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Account Name</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Widget Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="h-9 w-12 border rounded" />
                <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="max-w-[140px]" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Welcome Message</Label>
              <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} maxLength={500} />
            </div>
            <div className="grid gap-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={(v: any) => setPosition(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <input id="showAvatar" type="checkbox" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} />
                <Label htmlFor="showAvatar">Show Avatar</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="allowFileUpload" type="checkbox" checked={allowFileUpload} onChange={(e) => setAllowFileUpload(e.target.checked)} />
                <Label htmlFor="allowFileUpload">Allow File Upload</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="collectEmail" type="checkbox" checked={collectEmail} onChange={(e) => setCollectEmail(e.target.checked)} />
                <Label htmlFor="collectEmail">Collect Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="collectName" type="checkbox" checked={collectName} onChange={(e) => setCollectName(e.target.checked)} />
                <Label htmlFor="collectName">Collect Name</Label>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Embed Codes</h4>
              <div>
                <Label className="text-xs">Script tag (recommended)</Label>
                <p className="text-xs text-gray-600 mb-2">Embed this script tag in your website's HTML to display the chat widget.</p>
                <div className="bg-gray-50 p-3 rounded border text-xs break-all select-text">{embedCode || 'Token not available'}</div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={async () => { if (embedCode) { await navigator.clipboard.writeText(embedCode); toast({ title: 'Copied!', description: 'Script embed copied' }); } }}>Copy Script</Button>
                  <Button variant="outline" onClick={() => window.open(`/api/webchat/preview/${widgetToken}`, '_blank')}>Preview</Button>
                </div>
              </div>
              {iframeCode ? (
                <div>
                  <Label className="text-xs">Iframe embed</Label>
                  <p className="text-xs text-gray-600 mb-2">Use this iframe to embed the chat widget directly in a page section.</p>
                  <div className="bg-gray-50 p-3 rounded border text-xs break-all select-text">{iframeCode}</div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(iframeCode); toast({ title: 'Copied!', description: 'Iframe embed copied' }); }}>Copy Iframe</Button>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleRegenerateToken}>Regenerate Token</Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Widget Statistics</h4>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="button" onClick={handleSave} className="btn-brand-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
