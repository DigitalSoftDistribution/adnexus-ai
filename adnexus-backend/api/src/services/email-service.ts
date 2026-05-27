// ============================================================================
// Email Service
// Handles report delivery via email with file attachments
// ============================================================================

import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { EmailAttachment } from '../types/report';

/** Email service configuration */
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPass?: string;
  fromAddress: string;
  fromName: string;
}

/** Service for sending emails with report attachments */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth:
        config.smtpUser && config.smtpPass
          ? {
              user: config.smtpUser,
              pass: config.smtpPass,
            }
          : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  /**
   * Verify the SMTP connection is working
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Send a report email with attachments
   */
  async sendReportEmail(
    toAddresses: string[],
    subject: string,
    reportName: string,
    attachments: EmailAttachment[],
    options?: {
      htmlBody?: string;
      textBody?: string;
      cc?: string[];
      bcc?: string[];
    }
  ): Promise<void> {
    if (!toAddresses || toAddresses.length === 0) {
      throw new EmailError('No recipient email addresses provided');
    }

    // Validate email addresses
    const validEmails = toAddresses.filter(email => this.isValidEmail(email));
    if (validEmails.length === 0) {
      throw new EmailError('No valid email addresses provided');
    }

    // Build email content
    const htmlBody =
      options?.htmlBody || this.buildDefaultHtmlBody(reportName);
    const textBody =
      options?.textBody || this.buildDefaultTextBody(reportName);

    // Build attachment list for nodemailer
    const mailAttachments: Mail.Attachment[] = attachments.map(att => ({
      filename: att.filename,
      path: att.path,
      contentType: att.contentType,
    }));

    const mailOptions: Mail.Options = {
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: validEmails.join(', '),
      cc: options?.cc?.join(', '),
      bcc: options?.bcc?.join(', '),
      subject,
      text: textBody,
      html: htmlBody,
      attachments: mailAttachments,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        `[EmailService] Email sent successfully: MessageId=${result.messageId}, Recipients=${validEmails.join(', ')}`
      );
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw new EmailError(`Email delivery failed: ${(error as Error).message}`);
    }
  }

  /**
   * Build default HTML email body
   */
  private buildDefaultHtmlBody(reportName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report: ${this.escapeHtml(reportName)}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AdNexus Report</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your report <strong>"${this.escapeHtml(reportName)}"</strong> is now ready.</p>
            <p>Please find the attached report files. The report includes performance data across all connected advertising platforms.</p>
            <p>If you have any questions about this report, please contact your account manager.</p>
            <p>Best regards,<br>The AdNexus Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from AdNexus. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} AdNexus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build default plain text email body
   */
  private buildDefaultTextBody(reportName: string): string {
    return `AdNexus Report

Hello,

Your report "${reportName}" is now ready.

Please find the attached report files. The report includes performance data across all connected advertising platforms.

If you have any questions about this report, please contact your account manager.

Best regards,
The AdNexus Team

---
This is an automated message from AdNexus. Please do not reply to this email.
(c) ${new Date().getFullYear()} AdNexus. All rights reserved.
`;
  }

  /**
   * Validate an email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Close the email transporter
   */
  async close(): Promise<void> {
    this.transporter.close();
  }
}

/** Error thrown when email sending fails */
export class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailError';
  }
}
