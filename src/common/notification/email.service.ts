import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private logger = new Logger(EmailService.name);
  private templates: Record<string, string> = {};

  constructor(private readonly configService: ConfigService) {
    // Configure the email transporter
    this.transporter = createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port', 587),
      auth: {
        user: this.configService.get<string>('email.username'),
        pass: this.configService.get<string>('email.password'),
      },
      secure: false,
    });

    // Load all email templates
    this.loadTemplates();
  }

  /**
   * Load all email templates at startup for better performance
   */
  private loadTemplates(): void {
    try {
      const templatesDir = path.join(
        process.cwd(),
        'src/common/notification/templates',
      );

      // Check if directory exists before reading
      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir);

        files.forEach((file) => {
          if (file.endsWith('.html')) {
            const templateName = file.replace('.html', '');
            const templateContent = fs.readFileSync(
              path.join(templatesDir, file),
              'utf8',
            );
            this.templates[templateName] = templateContent;
            this.logger.log(`Loaded email template: ${templateName}`);
          }
        });
      } else {
        this.logger.warn(
          `Email templates directory not found: ${templatesDir}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load email templates: ${errorMessage}`);
    }
  }

  /**
   * Send a welcome email to a new user
   *
   * @param email - User's email address
   * @param firstName - User's first name
   * @returns Promise that resolves when the email is sent
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      // Get the welcome template
      let htmlContent =
        this.templates['welcome'] || this.templates['createaccount'];

      // If template doesn't exist, log warning and load directly
      if (!htmlContent) {
        this.logger.warn('Welcome email template not found, loading directly');
        htmlContent = fs.readFileSync(
          path.join(
            process.cwd(),
            'src/common/notification/templates/welcome.html',
          ),
          'utf8',
        );
      }

      // Replace placeholders
      htmlContent = htmlContent.replace('{{firstName}}', firstName || 'there');

      // Send the email
      await this.sendMail(
        email,
        'Welcome to Zero Card - No more gbesome!',
        {
          html: htmlContent,
        },
        'Zero Card',
      );

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send welcome email: ${errorMessage}`);
    }
  }

  /**
   * Generic method to send emails
   *
   * @param recipient - Email recipient(s)
   * @param subject - Email subject
   * @param message - Email content and options
   * @param senderName - Optional sender name
   * @returns Promise that resolves with email info or rejects with error
   */
  async sendMail(
    recipient: string | string[],
    subject: string,
    message: {
      cc?: Array<string>;
      html?: string;
      text?: string;
      attachments?: Array<{ filename: string; content: Buffer | string }>;
    },
    senderName?: string,
  ): Promise<any> {
    if (!recipient) return;

    try {
      this.logger.log(`Sending email to ${recipient}...`);

      const mailOptions = {
        from: `${senderName || 'Zero Card'} <${this.configService.get<string>('email.senderEmail')}>`,
        to: recipient,
        subject: subject,
        text: message.text,
        html: message.html,
        cc: message.cc,
        attachments: message?.attachments || [],
      };

      return await new Promise((resolve, reject) => {
        this.transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            this.logger.error(`Error while sending email: ${err.message}`);
            reject(new Error(`Failed to send email: ${err.message}`));
          } else {
            this.logger.log(`Email sent successfully: ${info.response}`);
            resolve(info);
          }
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error in sendMail: ${errorMessage}`);
      throw new Error('Unexpected error while sending email.');
    }
  }
}
