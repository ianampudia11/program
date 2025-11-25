import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TikTokPlatformConfig {
  clientKey: string;
  redirectUrl: string;
  webhookUrl: string;
}

export function TikTokConnectionForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<TikTokPlatformConfig | null>(null);
  const [accountName, setAccountName] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');


  useEffect(() => {
    if (isOpen) {
      checkPlatformConfiguration();
    }
  }, [isOpen]);


  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'tiktok_oauth_success') {
        toast({
          title: "Success",
          description: "TikTok account connected successfully!",
        });
        handleClose();
        onSuccess();
      } else if (event.data.type === 'tiktok_oauth_error') {
        toast({
          title: "Connection Failed",
          description: event.data.error || "Failed to connect TikTok account",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, toast]);

  const checkPlatformConfiguration = async () => {
    setCheckingConfig(true);
    try {
      const response = await fetch('/api/admin/partner-configurations/tiktok');
      
      if (response.ok) {
        const config = await response.json();
        if (config && config.isActive) {
          setPlatformConfigured(true);
          setPlatformConfig({
            clientKey: config.partnerApiKey,
            redirectUrl: config.redirectUrl,
            webhookUrl: config.partnerWebhookUrl
          });
        } else {
          setPlatformConfigured(false);
        }
      } else {
        setPlatformConfigured(false);
      }
    } catch (error) {
      console.error('Error checking platform configuration:', error);
      setPlatformConfigured(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  const generateAuthorizationUrl = async () => {
    if (!platformConfig) return;

    const csrfState = Math.random().toString(36).substring(7);


    try {
      await fetch('/api/tiktok/oauth/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: csrfState,
          accountName: accountName
        })
      });
    } catch (error) {
      console.error('Error preparing OAuth:', error);
    }

    const scopes = [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.upload'
    ].join(',');

    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.append('client_key', platformConfig.clientKey);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', platformConfig.redirectUrl);
    authUrl.searchParams.append('state', csrfState);

    setAuthorizationUrl(authUrl.toString());
  };

  const handleConnectClick = () => {
    if (!accountName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an account name.",
        variant: "destructive"
      });
      return;
    }

    generateAuthorizationUrl();
  };

  const handleOAuthRedirect = () => {
    if (authorizationUrl) {
      window.location.href = authorizationUrl;
    }
  };

  const handleClose = () => {
    setAccountName('');
    setAuthorizationUrl('');
    onClose();
  };

  if (checkingConfig) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="ri-tiktok-line text-2xl"></i>
              Connect TikTok Account
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!platformConfigured) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="ri-tiktok-line text-2xl"></i>
              Connect TikTok Account
            </DialogTitle>
            <DialogDescription>
              TikTok platform configuration required
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Platform Not Configured</strong>
              <p className="mt-2">
                TikTok Business Messaging API integration has not been configured by your system administrator.
                Please contact your administrator to set up the TikTok platform configuration first.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-gray-600">
            <p className="font-medium">Required Setup:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Super admin must configure TikTok platform credentials</li>
              <li>TikTok App Client Key and Client Secret required</li>
              <li>TikTok Messaging Partner approval required</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="ri-tiktok-line text-2xl"></i>
            Connect TikTok Account
          </DialogTitle>
          <DialogDescription>
            Connect your TikTok Business account to receive and send messages
          </DialogDescription>
        </DialogHeader>

        {!authorizationUrl ? (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>TikTok Business Account Required</strong>
                <p className="mt-2">
                  You need a TikTok Business account to use messaging features. Personal TikTok accounts are not supported.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountName"
                  name="accountName"
                  placeholder="e.g., My TikTok Business"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  A friendly name to identify this TikTok connection
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <i className="ri-information-line"></i>
                  What happens next?
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>You'll be redirected to TikTok to authorize access</li>
                  <li>Log in with your TikTok Business account</li>
                  <li>Grant permissions for messaging</li>
                  <li>You'll be redirected back to complete setup</li>
                </ol>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Required Permissions:</strong> User profile, messaging access
                  <br />
                  <strong>Note:</strong> TikTok Business Messaging API requires partner approval
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleConnectClick}
                disabled={loading || !accountName.trim()}
                className="btn-brand-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Continue with TikTok
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Ready to Connect</strong>
                <p className="mt-2">
                  Click the button below to authorize PowerChat to access your TikTok Business account.
                </p>
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 bg-blue-50 space-y-2">
              <p className="text-sm font-medium text-blue-900">
                <i className="ri-shield-check-line mr-2"></i>
                Secure OAuth 2.0 Authentication
              </p>
              <p className="text-xs text-blue-700">
                Your credentials are never stored. We only receive a secure access token from TikTok.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleOAuthRedirect}
                className="btn-brand-primary"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Authorize with TikTok
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

