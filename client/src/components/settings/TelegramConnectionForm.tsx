import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { TestTube, ExternalLink, AlertCircle, QrCode, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

interface TelegramFormData {
  accountName: string;
  botToken: string;
  apiId: string;
  apiHash: string;
  webhookUrl: string;
  verifyToken: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TelegramConnectionForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast} = useToast();
  const [loading, setLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'checking' | 'authenticated' | 'failed'>('pending');
  const [connectionId, setConnectionId] = useState<number | null>(null);
  

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const qrCacheRef = useRef<Map<string, string>>(new Map());
  const lastQRGenerationRef = useRef<number>(0);
  const QR_GENERATION_COOLDOWN = 5000; // 5 seconds between generations
  
  const [formData, setFormData] = useState<TelegramFormData>({
    accountName: '',
    botToken: '',
    apiId: '',
    apiHash: '',
    webhookUrl: `${window.location.origin}/api/webhooks/telegram`,
    verifyToken: ''
  });


  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, []);


  useEffect(() => {
    if (!isOpen && pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      isPollingRef.current = false;
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateWebhookUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && urlObj.pathname.includes('/api/webhooks/telegram');
    } catch {
      return false;
    }
  };

  const testWebhookConnection = async () => {
    if (!formData.webhookUrl || !formData.verifyToken) {
      toast({
        title: "Validation Error",
        description: "Please fill in webhook URL and verify token first.",
        variant: "destructive"
      });
      return;
    }

    if (!validateWebhookUrl(formData.webhookUrl)) {
      toast({
        title: "Invalid Webhook URL",
        description: "Webhook URL must be HTTPS and point to /api/webhooks/telegram endpoint.",
        variant: "destructive"
      });
      return;
    }

    setTestingWebhook(true);
    try {
      const response = await fetch('/api/telegram/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          verifyToken: formData.verifyToken
        })
      });

      if (response.ok) {
        toast({
          title: "Webhook Test Successful",
          description: "Your webhook configuration is valid and reachable.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Webhook test failed');
      }
    } catch (error: any) {
      toast({
        title: "Webhook Test Failed",
        description: error.message || "Could not validate webhook configuration.",
        variant: "destructive"
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const generateQRCode = async (tempConnectionId: number) => {

    const now = Date.now();
    const timeSinceLastGeneration = now - lastQRGenerationRef.current;
    
    if (timeSinceLastGeneration < QR_GENERATION_COOLDOWN) {
      const remainingTime = Math.ceil((QR_GENERATION_COOLDOWN - timeSinceLastGeneration) / 1000);
      toast({
        title: "Please Wait",
        description: `You can generate a new QR code in ${remainingTime} seconds.`,
        variant: "default"
      });
      return;
    }
    

    setShowQRModal(true);
    setConnectionId(tempConnectionId);
    

    const cacheKey = `telegram-qr-${tempConnectionId}`;
    const cached = qrCacheRef.current.get(cacheKey);
    
    if (cached) {
      setQrCodeDataUrl(cached);
      setAuthStatus('checking');
      pollAuthStatus(tempConnectionId);
      return;
    }

    lastQRGenerationRef.current = now;
    setQrLoading(true);
    try {
      const response = await fetch('/api/telegram/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionId: tempConnectionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        

        const qrDataUrl = await QRCode.toDataURL(data.qrCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        

        qrCacheRef.current.set(cacheKey, qrDataUrl);
        setTimeout(() => qrCacheRef.current.delete(cacheKey), 30000);
        
        setQrCodeDataUrl(qrDataUrl);
        setAuthStatus('checking');
        
        pollAuthStatus(tempConnectionId);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate QR code');
      }
    } catch (error: any) {
      toast({
        title: "QR Generation Failed",
        description: error.message || "Could not generate QR code.",
        variant: "destructive"
      });
      setAuthStatus('failed');
    } finally {
      setQrLoading(false);
    }
  };

  const pollAuthStatus = async (tempConnectionId: number) => {
    const maxAttempts = 40; // Reduced from 60 due to exponential backoff
    let attempts = 0;
    let delay = 5000; // Start at 5 seconds

    const checkStatus = async () => {

      if (document.hidden) {
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
        pollingTimeoutRef.current = setTimeout(checkStatus, delay);
        return;
      }


      if (!isPollingRef.current) {
        return;
      }

      try {
        const response = await fetch(`/api/telegram/check-auth/${tempConnectionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            isPollingRef.current = false;
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
            }
            setAuthStatus('authenticated');
            toast({
              title: "Authentication Successful",
              description: "Your Telegram account has been connected successfully!",
            });
            setTimeout(() => {
              setShowQRModal(false);
              onSuccess();
            }, 2000);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {

          delay = Math.min(delay * 1.2, 20000);
          
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
          }
          pollingTimeoutRef.current = setTimeout(checkStatus, delay);
        } else {
          isPollingRef.current = false;
          setAuthStatus('failed');
          toast({
            title: "Authentication Timeout",
            description: "QR code authentication timed out. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {

          delay = Math.min(delay * 1.5, 20000);
          
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
          }
          pollingTimeoutRef.current = setTimeout(checkStatus, delay);
        } else {
          isPollingRef.current = false;
          setAuthStatus('failed');
        }
      }
    };

    isPollingRef.current = true;
    checkStatus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.accountName || !formData.botToken || !formData.webhookUrl || !formData.verifyToken) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/channel-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelType: 'telegram',
          accountName: formData.accountName,
          connectionData: {
            botToken: formData.botToken,
            apiId: formData.apiId,
            apiHash: formData.apiHash,
            webhookUrl: formData.webhookUrl,
            verifyToken: formData.verifyToken
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionId(data.id);
        

        if (formData.apiId && formData.apiHash) {
          setShowQRModal(true);
          await generateQRCode(data.id);
        } else {

          toast({
            title: "Connection Created",
            description: "Telegram bot connection has been created successfully.",
          });
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create connection');
      }

      setFormData({
        accountName: '',
        botToken: '',
        apiId: '',
        apiHash: '',
        webhookUrl: `${window.location.origin}/api/webhooks/telegram`,
        verifyToken: ''
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to create Telegram connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    isPollingRef.current = false;
    
    setFormData({
      accountName: '',
      botToken: '',
      apiId: '',
      apiHash: '',
      webhookUrl: `${window.location.origin}/api/webhooks/telegram`,
      verifyToken: ''
    });
    setShowQRModal(false);
    setQrCodeDataUrl('');
    setAuthStatus('pending');
    setConnectionId(null);
    onClose();
  };


  const memoizedQRImage = useMemo(() => {
    if (!qrCodeDataUrl) return null;
    
    return (
      <img
        src={qrCodeDataUrl}
        alt="Telegram QR Code"
        className="border rounded-lg"
        loading="eager"
      />
    );
  }, [qrCodeDataUrl]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Telegram</DialogTitle>
            <DialogDescription>
              Connect your Telegram bot to start receiving and sending messages through your unified inbox.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleInputChange}
                placeholder="My Telegram Bot"
                required
              />
              <p className="text-sm text-gray-500">
                A friendly name to identify this Telegram connection
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="botToken">Bot Token *</Label>
              <Input
                id="botToken"
                name="botToken"
                type="password"
                value={formData.botToken}
                onChange={handleInputChange}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                required
              />
              <p className="text-sm text-gray-500">
                Your Telegram bot token from @BotFather
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="apiId">API ID (Optional)</Label>
                <Input
                  id="apiId"
                  name="apiId"
                  value={formData.apiId}
                  onChange={handleInputChange}
                  placeholder="12345678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiHash">API Hash (Optional)</Label>
                <Input
                  id="apiHash"
                  name="apiHash"
                  type="password"
                  value={formData.apiHash}
                  onChange={handleInputChange}
                  placeholder="abcdef1234567890abcdef1234567890"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              API credentials for advanced features and QR code authentication (get from my.telegram.org)
            </p>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Webhook Configuration</h4>

              <div className="grid gap-2">
                <Label htmlFor="webhookUrl">Webhook URL *</Label>
                <Input
                  id="webhookUrl"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleInputChange}
                  placeholder="https://yourdomain.com/api/webhooks/telegram"
                  required
                />
                <p className="text-sm text-gray-500">
                  This URL will receive webhook events from Telegram. Configure this in your bot settings.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="verifyToken">Webhook Verify Token *</Label>
                <Input
                  id="verifyToken"
                  name="verifyToken"
                  value={formData.verifyToken}
                  onChange={handleInputChange}
                  placeholder="Enter a secure verify token"
                  required
                />
                <p className="text-sm text-gray-500">
                  A secure token for webhook verification. Keep this secret and secure.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testWebhookConnection}
                  disabled={testingWebhook || !formData.webhookUrl || !formData.verifyToken}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testingWebhook ? 'Testing...' : 'Test Webhook'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://core.telegram.org/bots/api#setwebhook', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Telegram Docs
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Create a bot with @BotFather on Telegram and get your bot token</li>
                      <li>Optionally get API credentials from my.telegram.org for advanced features</li>
                      <li>Configure the webhook URL in your bot settings</li>
                      <li>Test the webhook connection using the button above</li>
                      <li>If using API credentials, scan the QR code to authenticate</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Connection'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Authentication Modal */}
      <Dialog open={showQRModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Telegram Authentication
            </DialogTitle>
            <DialogDescription>
              Scan the QR code with your Telegram app to authenticate your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4">
            {qrLoading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-gray-500">Generating QR code...</p>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="flex flex-col items-center space-y-2">
                {memoizedQRImage}
                <div className="text-center">
                  {authStatus === 'checking' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Waiting for authentication...</span>
                    </div>
                  )}
                  {authStatus === 'authenticated' && (
                    <div className="text-green-600 text-sm font-medium">
                      ✓ Authentication successful!
                    </div>
                  )}
                  {authStatus === 'failed' && (
                    <div className="text-red-600 text-sm">
                      Authentication failed. Please try again.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="text-center text-sm text-gray-500">
              <p>1. Open Telegram on your phone</p>
              <p>2. Go to Settings → Devices → Link Desktop Device</p>
              <p>3. Scan this QR code</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQRModal(false);
                setAuthStatus('pending');
                setQrCodeDataUrl('');
              }}
            >
              Cancel
            </Button>
            {authStatus === 'failed' && connectionId && (
              <Button onClick={() => generateQRCode(connectionId)}>
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
