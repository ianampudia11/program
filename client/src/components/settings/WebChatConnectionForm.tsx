import React, { useState } from 'react';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WebChatConnectionForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [iframeCode, setIframeCode] = useState<string>('');

  const [accountName, setAccountName] = useState('');
  const [widgetColor, setWidgetColor] = useState('#6366f1');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can we help?');
  const [companyName, setCompanyName] = useState('Support');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  const [showAvatar, setShowAvatar] = useState(true);
  const [allowFileUpload, setAllowFileUpload] = useState(false);
  const [collectEmail, setCollectEmail] = useState(false);
  const [collectName, setCollectName] = useState(false);

  const reset = () => {
    setAccountName('');
    setWidgetColor('#6366f1');
    setWelcomeMessage('Hi! How can we help?');
    setCompanyName('Support');
    setPosition('bottom-right');
    setShowAvatar(true);
    setAllowFileUpload(false);
    setCollectEmail(false);
    setCollectName(false);
    setEmbedCode('');
    setIframeCode('');
    setShowEmbed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast({ title: 'Validation Error', description: 'Account name is required', variant: 'destructive' });
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(widgetColor)) {
      toast({ title: 'Validation Error', description: 'Color must be a hex value like #6366f1', variant: 'destructive' });
      return;
    }
    if (welcomeMessage.length > 500) {
      toast({ title: 'Validation Error', description: 'Welcome message must be 500 characters or less', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: 'webchat',
          accountId: `webchat-${Date.now()}`,
          accountName,
          connectionData: {
            widgetColor,
            welcomeMessage,
            companyName,
            position,
            showAvatar,
            allowFileUpload,
            collectEmail,
            collectName
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create WebChat connection');
      }
      const data = await res.json();
      const token = data?.connectionData?.widgetToken;
      const embed = data?.embedScript || (token ? `<script src="${window.location.origin}/api/webchat/widget.js?token=${token}" async></script>` : '');
      const iframe = token ? `<iframe src="${window.location.origin}/api/webchat/embed/${token}" style="width: 100%; height: 600px; border: 0; background: transparent;" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" loading="lazy" title="WebChat"></iframe>` : '';
      if (embed) {
        setEmbedCode(embed);
        setIframeCode(iframe);
        setShowEmbed(true);
      }
      toast({ title: 'WebChat Connected', description: 'Your WebChat widget has been created. Copy the embed code to install it on your site.' });
      onSuccess();
    } catch (e: any) {
      toast({ title: 'Connection Failed', description: e?.message || 'Failed to create WebChat connection', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create WebChat Connection</DialogTitle>
            <DialogDescription>
              Add a customizable chat widget to your website. Configure appearance and behavior below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Website Chat" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Shown in widget header" />
              </div>
              <div className="grid gap-2">
                <Label>Widget Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="h-9 w-12 border rounded" />
                  <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="max-w-[140px]" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Textarea id="welcome" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} maxLength={500} />
              </div>
              <div className="grid gap-2">
                <Label>Widget Position</Label>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button type="submit" variant="outline" className="btn-brand-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create WebChat'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmbed} onOpenChange={(open) => { setShowEmbed(open); if (!open) { reset(); onClose(); } }}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Install WebChat Widget</DialogTitle>
            <DialogDescription>Copy and paste one of the following snippets into your website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Script tag (recommended)</h4>
              <p className="text-xs text-gray-600 mb-2">Embed this script tag in your website's HTML to display the chat widget.</p>
              <div className="bg-gray-50 p-3 rounded border text-xs break-all select-text">{embedCode}</div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(embedCode); toast({ title: 'Copied!', description: 'Script embed copied to clipboard' }); }}>Copy Script</Button>
              </div>
            </div>
            {iframeCode ? (
              <div>
                <h4 className="font-medium mb-2">Iframe embed</h4>
                <p className="text-xs text-gray-600 mb-2">Use this iframe to embed the chat widget directly in a page section.</p>
                <div className="bg-gray-50 p-3 rounded border text-xs break-all select-text">{iframeCode}</div>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(iframeCode); toast({ title: 'Copied!', description: 'Iframe embed copied to clipboard' }); }}>Copy Iframe</Button>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => { const m = iframeCode.match(/embed\/(wc_[a-z0-9]+)/i); const t = m?.[1]; window.open(t ? `/api/webchat/preview/${t}` : '/api/webchat/widget.html', '_blank'); }}>Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
