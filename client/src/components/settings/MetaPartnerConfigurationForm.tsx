import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { MetaWhatsAppIntegratedOnboarding } from './MetaWhatsAppIntegratedOnboarding';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MetaPartnerConfigFormData {
  appId: string;
  appSecret: string;
  businessManagerId: string;
  webhookVerifyToken: string;
  accessToken: string;
  configId: string;
  webhookUrl: string;
  companyName: string;
  logoUrl: string;
}

export function MetaPartnerConfigurationForm({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [showTestOnboarding, setShowTestOnboarding] = useState(false);

  const [formData, setFormData] = useState<MetaPartnerConfigFormData>({
    appId: '',
    appSecret: '',
    businessManagerId: '',
    webhookVerifyToken: '',
    accessToken: '',
    configId: '',
    webhookUrl: '',
    companyName: '',
    logoUrl: ''
  });


  useEffect(() => {
    if (isOpen) {
      loadExistingConfiguration();
    }
  }, [isOpen]);

  const loadExistingConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/partner-configurations/meta');
      
      if (response.ok) {
        const config = await response.json();
        setExistingConfig(config);
        

        setFormData({
          appId: config.partnerApiKey || '', // App ID stored as partnerApiKey
          appSecret: config.partnerSecret || '',
          businessManagerId: config.partnerId || '', // Business Manager ID stored as partnerId
          webhookVerifyToken: config.webhookVerifyToken || '',
          accessToken: config.accessToken || '',
          configId: config.configId || '',
          webhookUrl: config.partnerWebhookUrl || '',
          companyName: config.publicProfile?.companyName || '',
          logoUrl: config.publicProfile?.logoUrl || ''
        });
      } else if (response.status !== 404) {
        throw new Error('Failed to load configuration');
      }
    } catch (error) {
      console.error('Error loading Meta partner configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load existing configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateConfiguration = async () => {
    try {
      setIsValidating(true);
      
      const response = await fetch('/api/admin/partner-configurations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'meta',
          appId: formData.appId,
          appSecret: formData.appSecret,
          businessManagerId: formData.businessManagerId,
          accessToken: formData.accessToken
        })
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        toast({
          title: "Success",
          description: "Meta Partner API credentials are valid! Opening test signup flow...",
        });

        setShowTestOnboarding(true);
        return true;
      } else {
        toast({
          title: "Validation Failed",
          description: result.error || "Invalid Meta Partner API credentials",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error validating Meta partner configuration:', error);
      toast({
        title: "Error",
        description: "Failed to validate configuration",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appId || !formData.appSecret || !formData.businessManagerId) {
      toast({
        title: "Error",
        description: "App ID, App Secret, and Business Manager ID are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const configData = {
        provider: 'meta',
        partnerApiKey: formData.appId, // Store App ID as partnerApiKey
        partnerSecret: formData.appSecret,
        partnerId: formData.businessManagerId, // Store Business Manager ID as partnerId
        webhookVerifyToken: formData.webhookVerifyToken,
        accessToken: formData.accessToken,
        configId: formData.configId,
        partnerWebhookUrl: formData.webhookUrl,
        redirectUrl: `${window.location.origin}/settings/channels/meta/callback`,
        publicProfile: {
          companyName: formData.companyName,
          logoUrl: formData.logoUrl
        },
        isActive: true
      };

      const url = existingConfig 
        ? `/api/admin/partner-configurations/${existingConfig.id}`
        : '/api/admin/partner-configurations';
      
      const method = existingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      toast({
        title: "Success",
        description: existingConfig 
          ? "Meta Partner API configuration updated successfully"
          : "Meta Partner API configuration created successfully"
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error saving Meta partner configuration:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isValidating) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meta WhatsApp Business API Partner Configuration</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading configuration...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tech Provider Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tech Provider Credentials</h3>
              <p className="text-sm text-gray-600">
                Configure your Meta Tech Provider credentials for embedded signup
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appId">App ID *</Label>
                  <Input
                    id="appId"
                    name="appId"
                    value={formData.appId}
                    onChange={handleInputChange}
                    placeholder="Your Meta App ID"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="appSecret">App Secret *</Label>
                  <Input
                    id="appSecret"
                    name="appSecret"
                    type="password"
                    value={formData.appSecret}
                    onChange={handleInputChange}
                    placeholder="Your Meta App Secret"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessManagerId">Business Manager ID *</Label>
                <Input
                  id="businessManagerId"
                  name="businessManagerId"
                  value={formData.businessManagerId}
                  onChange={handleInputChange}
                  placeholder="Your Business Manager ID"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                  <Input
                    id="webhookVerifyToken"
                    name="webhookVerifyToken"
                    value={formData.webhookVerifyToken}
                    onChange={handleInputChange}
                    placeholder="Webhook verification token"
                  />
                </div>

                <div>
                  <Label htmlFor="accessToken">System User Access Token</Label>
                  <Input
                    id="accessToken"
                    name="accessToken"
                    type="password"
                    value={formData.accessToken}
                    onChange={handleInputChange}
                    placeholder="System user access token"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="configId">WhatsApp Configuration ID</Label>
                <Input
                  id="configId"
                  name="configId"
                  value={formData.configId}
                  onChange={handleInputChange}
                  placeholder="WhatsApp Configuration ID for embedded signup"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This is the Configuration ID from your Meta App's WhatsApp Business API settings
                </p>
              </div>

              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleInputChange}
                  placeholder="https://yourdomain.com/api/webhooks/meta-whatsapp"
                />
              </div>
            </div>

            {/* Company Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Company Profile</h3>
              <p className="text-sm text-gray-600">
                This information will be shown to companies during onboarding
              </p>

              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={validateConfiguration}
                disabled={isValidating || isSubmitting || !formData.appId || !formData.appSecret}
                className="flex-1"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Test Configuration
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || isValidating}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {existingConfig ? 'Update Configuration' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>

      {/* Test Onboarding Modal */}
      <MetaWhatsAppIntegratedOnboarding
        isOpen={showTestOnboarding}
        onClose={() => setShowTestOnboarding(false)}
        onSuccess={() => {
          setShowTestOnboarding(false);
          toast({
            title: "Test Successful",
            description: "The embedded signup flow is working correctly!",
          });
        }}
      />
    </Dialog>
  );
}
