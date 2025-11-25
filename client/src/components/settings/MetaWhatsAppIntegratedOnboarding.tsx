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
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { initFacebookSDK, setupWhatsAppSignupListener, launchWhatsAppSignup } from '@/lib/facebook-sdk';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MetaWhatsAppIntegratedOnboarding({ isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [connectionName, setConnectionName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [partnerConfigured, setPartnerConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [partnerConfig, setPartnerConfig] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      checkPartnerConfiguration();
    }
  }, [isOpen]);

  const checkPartnerConfiguration = async () => {
    try {
      setIsCheckingConfig(true);
      const response = await fetch('/api/partner-configurations/meta/availability');
      
      if (response.ok) {
        const result = await response.json();
        setPartnerConfigured(result.isAvailable);
        
        if (result.isAvailable && result.config) {
          setPartnerConfig(result.config);
          await initializeFacebookSDK(result.config);
        }
      } else {
        setPartnerConfigured(false);
      }
    } catch (error) {
      console.error('Error checking Meta partner configuration:', error);
      setPartnerConfigured(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const initializeFacebookSDK = async (config: any) => {
    try {
      await initFacebookSDK(config.partnerApiKey);
      

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSdkInitialized(true);
      
      setupWhatsAppSignupListener((response: any) => {
        handleSignupResponse(response);
      });
      
    } catch (error) {
      console.error('Error initializing Facebook SDK:', error);
      toast({
        title: "SDK Error",
        description: "Failed to initialize Facebook SDK",
        variant: "destructive"
      });
    }
  };

  const handleSignupResponse = (response: any) => {

    if (response.status === 'connected') {

      processSignupCallback(response).catch((error) => {
        console.error('Error processing signup callback:', error);
        toast({
          title: "Signup Error",
          description: "Failed to process WhatsApp Business account signup",
          variant: "destructive"
        });
      });
    } else {
      console.error('Signup was not completed successfully:', response);
      toast({
        title: "Signup Error",
        description: "WhatsApp signup was not completed successfully",
        variant: "destructive"
      });
    }
  };

  const processSignupCallback = async (signupData: any) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/channel-connections/meta-whatsapp-embedded-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionName,
          signupData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process signup');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `WhatsApp Business account connected successfully. ${result.phoneNumbers?.length || 0} phone number(s) configured.`
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error processing signup callback:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process signup",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOnboarding = async () => {
    if (!connectionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connection name",
        variant: "destructive"
      });
      return;
    }

    if (!sdkInitialized) {
      toast({
        title: "Error",
        description: "Facebook SDK not initialized",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!partnerConfig?.configId) {
        toast({
          title: "Configuration Error",
          description: "WhatsApp Configuration ID is not set in partner configuration",
          variant: "destructive"
        });
        return;
      }


      if (!window.FB) {
        toast({
          title: "SDK Error",
          description: "Facebook SDK is not available. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }
      
      await launchWhatsAppSignup(partnerConfig.configId, handleSignupResponse);
    } catch (error) {
      console.error('Error launching WhatsApp signup:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to launch WhatsApp signup";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (isCheckingConfig) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Checking configuration...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!partnerConfigured) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              Configuration Required
            </DialogTitle>
            <DialogDescription>
              Meta WhatsApp Business API Partner integration is not configured. 
              Please contact your system administrator to set up the Partner API credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meta WhatsApp Business API - Easy Setup</DialogTitle>
          <DialogDescription>
            Connect your WhatsApp Business account in just a few clicks using our integrated onboarding flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="connectionName">Connection Name</Label>
            <Input
              id="connectionName"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              placeholder="e.g., Main WhatsApp Business"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500 mt-1">
              Give this connection a memorable name
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Connect your Meta Business account</li>
              <li>• Select your WhatsApp Business account</li>
              <li>• Choose phone numbers to integrate</li>
              <li>• Automatic configuration and setup</li>
            </ul>
          </div>

          {window.location.protocol !== 'https:' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <div>
                  <h4 className="font-medium text-yellow-900">HTTPS Required</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    WhatsApp signup requires HTTPS. Please access this application over HTTPS (https://) instead of HTTP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!sdkInitialized && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin mr-2" />
                <span className="text-sm text-yellow-800">Initializing Facebook SDK...</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleClose} 
            variant="outline" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStartOnboarding}
            disabled={isSubmitting || !sdkInitialized || !connectionName.trim() || window.location.protocol !== 'https:'}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Start Easy Setup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
