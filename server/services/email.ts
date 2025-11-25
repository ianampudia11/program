import * as nodemailer from 'nodemailer';
import mail from '@sendgrid/mail';
import { storage } from '../storage';
import { createDecipheriv } from 'crypto';


const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32';

function getEncryptionKey(): Buffer {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
}

function decryptPassword(encryptedPassword: string): string {
  try {
    const [ivHex, encrypted] = encryptedPassword.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    return encryptedPassword; // Return as-is if decryption fails
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  senderEmail: string;
  senderName: string;
}

let cachedSmtpConfig: SmtpConfig | null = null;

/**
 * Update the SMTP configuration - saves to storage
 */
export async function updateSmtpConfig(config: SmtpConfig): Promise<boolean> {
  try {
    cachedSmtpConfig = config;
    const saved = await storage.saveSmtpConfig(config);
    return saved;
  } catch (error) {
    console.error('Error updating SMTP config:', error);
    return false;
  }
}

/**
 * Get the current SMTP configuration - loads from storage if not cached
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    if (cachedSmtpConfig) {
      return cachedSmtpConfig;
    }


    const adminConfig = await storage.getAppSetting('smtp_config');
    if (adminConfig && adminConfig.value) {
      const config = adminConfig.value as any;


      if (config.enabled && config.host && config.username && config.password) {
        const decryptedPassword = config.password.includes(':') ? decryptPassword(config.password) : config.password;

        cachedSmtpConfig = {
          host: config.host,
          port: config.port || 465,
          secure: config.security === 'ssl',
          auth: {
            user: config.username,
            pass: decryptedPassword
          },
          senderEmail: config.fromEmail || config.username,
          senderName: config.fromName || 'PowerChatPlus'
        };
        return cachedSmtpConfig;
      }
    }


    const config = await storage.getSmtpConfig();
    if (config) {
      cachedSmtpConfig = config as SmtpConfig;
    }
    return cachedSmtpConfig;
  } catch (error) {
    console.error('Error getting SMTP config:', error);
    return null;
  }
}

/**
 * Send an email using the configured SMTP server
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  textContent: string,
  htmlContent?: string,
  customConfig?: SmtpConfig
): Promise<boolean> {
  try {
    const config = customConfig || await getSmtpConfig();
    
    if (!config) {
      console.error('SMTP configuration not found');
      return false;
    }
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
    
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: textContent,
      html: htmlContent || textContent,
    });
    
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Test SMTP configuration by sending a test email
 */
export async function testSmtpConfig(config: SmtpConfig, testEmail: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
    
    await transporter.verify();
    
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: testEmail,
      subject: 'SMTP Configuration Test',
      text: 'This is a test email to verify your SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">SMTP Configuration Test</h2>
          <p>This is a test email to verify your SMTP configuration.</p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
            <p style="margin: 0; font-weight: bold;">Configuration details:</p>
            <ul style="margin-top: 10px;">
              <li>Host: ${config.host}</li>
              <li>Port: ${config.port}</li>
              <li>Secure: ${config.secure ? 'Yes' : 'No'}</li>
              <li>Sender: ${config.senderName} &lt;${config.senderEmail}&gt;</li>
            </ul>
          </div>
          <p style="margin-top: 20px;">If you received this email, your SMTP configuration is working correctly!</p>
        </div>
      `,
    });
    
    
    return true;
  } catch (error) {
    console.error('Error testing SMTP configuration:', error);
    throw error;
  }
}

/**
 * Send an email using SendGrid (alternative method if SMTP is not configured)
 */
export async function sendEmailWithSendGrid(
  to: string | string[],
  subject: string,
  textContent: string,
  htmlContent?: string
): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not found in environment variables');
      return false;
    }
    
    mail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const config = await getSmtpConfig();
    
    const fromEmail = config?.senderEmail || 'noreply@powerchat.app';
    const fromName = config?.senderName || 'PowerChat';
    
    const msg = {
      to: Array.isArray(to) ? to : to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      text: textContent,
      html: htmlContent || textContent,
    };
    
    await mail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    return false;
  }
}

/**
 * Send an email with team invitation
 */
export async function sendTeamInvitation(
  to: string,
  invitedByName: string,
  companyName: string,
  role: string,
  invitationLink: string
): Promise<boolean> {
  const subject = `You've been invited to join ${companyName} on PowerChat`;
  
  const textContent = `
    ${invitedByName} has invited you to join ${companyName} on PowerChat as a ${role}.
    
    Click the link below to accept the invitation:
    ${invitationLink}
    
    This invitation will expire in 7 days.
  `;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">You've Been Invited</h2>
      <p><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on PowerChat as a <strong>${role}</strong>.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
    </div>
  `;
  
  const smtpSuccess = await sendEmail(to, subject, textContent, htmlContent);
  
  if (smtpSuccess) {
    return true;
  }
  
  return await sendEmailWithSendGrid(to, subject, textContent, htmlContent);
}