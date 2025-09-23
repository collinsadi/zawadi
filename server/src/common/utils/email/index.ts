import nodemailer from 'nodemailer';
import { ENVIRONMENT } from '../../config/environment';
import { DeviceInfo } from '../deviceDetection';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface LoginAlertData {
  userEmail: string;
  userName: string;
  deviceInfo: DeviceInfo;
  loginTime: Date;
  isUnusualDevice: boolean;
}

export interface EmailVerificationData {
  userEmail: string;
  userName: string;
  verificationToken: string;
  verificationUrl: string;
}

export interface PasswordResetData {
  userEmail: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
}

/**
 * Create email transporter
 * @returns nodemailer.Transporter
 */
const createTransporter = (): nodemailer.Transporter => {
  const config: EmailConfig = {
    host: ENVIRONMENT.EMAIL.HOST,
    port: ENVIRONMENT.EMAIL.PORT,
    secure: ENVIRONMENT.EMAIL.SECURE,
    auth: {
      user: ENVIRONMENT.EMAIL.USER,
      pass: ENVIRONMENT.EMAIL.PASS
    },
    // Add timeout and connection settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 10000,     // 10 seconds
    // Add TLS options for better compatibility
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransport(config);
};

/**
 * Send email
 * @param options - Email options
 * @returns Promise<boolean> - Success status
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Check if email credentials are configured
  if (!ENVIRONMENT.EMAIL.USER || !ENVIRONMENT.EMAIL.PASS) {
    console.log('📧 EMAIL (Development Mode):', {
      to: options.to,
      subject: options.subject,
      html: options.html.substring(0, 200) + '...'
    });
    return true; // Return true to simulate success
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = createTransporter();
      
      // Verify connection before sending
      await transporter.verify();
      
      const mailOptions = {
        from: `"${ENVIRONMENT.APP.NAME}" <${ENVIRONMENT.EMAIL.USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.html.replace(/<[^>]*>/g, '')
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      lastError = error as Error;
      console.error(`Email sending attempt ${attempt} failed:`, error);
      
      // If it's the last attempt, don't wait
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('All email sending attempts failed. Last error:', lastError);
  return false;
};


  