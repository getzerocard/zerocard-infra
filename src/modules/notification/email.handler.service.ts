import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailHandlerService {
  private logger = new Logger(EmailHandlerService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send an email to a new sub-user
   *
   * @param email - Sub-user's email address
   * @param templates - The templates loaded by the email service
   * @returns Promise that resolves when the email is sent
   */
  async sendSubUserEmail(
    email: string,
    templates: Record<string, string> = {},
  ): Promise<void> {
    try {
      // Get the sub-user addition template
      let htmlContent = templates['addSubUser'];

      // If template doesn't exist, log warning and load directly
      if (!htmlContent) {
        this.logger.warn(
          'Sub-user addition email template not found, loading directly',
        );
        htmlContent = fs.readFileSync(
          path.join(
            process.cwd(),
            'src/modules/notification/templates/addSubUser.html',
          ),
          'utf8',
        );
      }

      // Send the email
      await this.emailService.sendMail(
        email,
        'Welcome to Zero Card - Sub-User Account',
        {
          html: htmlContent,
        },
        'Zero Card',
      );

      this.logger.log(`Sub-user addition email sent to ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send sub-user addition email: ${errorMessage}`,
      );
    }
  }

  /**
   * Send a welcome email to a new user
   *
   * @param email - User's email address
   * @param firstName - User's first name
   * @param templates - The templates loaded by the email service
   * @returns Promise that resolves when the email is sent
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    templates: Record<string, string> = {},
  ): Promise<void> {
    try {
      // Get the welcome template
      let htmlContent = templates['welcome'] || templates['createaccount'];

      // If template doesn't exist, log warning and load directly
      if (!htmlContent) {
        this.logger.warn('Welcome email template not found, loading directly');
        htmlContent = fs.readFileSync(
          path.join(
            process.cwd(),
            'src/modules/notification/templates/welcome.html',
          ),
          'utf8',
        );
      }

      // Replace placeholders
      htmlContent = htmlContent.replace('{{firstName}}', firstName || 'there');

      // Send the email
      await this.emailService.sendMail(
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
}
