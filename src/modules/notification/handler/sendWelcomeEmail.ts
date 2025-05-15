import { Logger } from '@nestjs/common';
import type { EmailService } from '../email.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Send a welcome email to a new user
 *
 * @param email - User's email address
 * @param firstName - User's first name
 * @param emailService - The email service instance
 * @returns Promise that resolves when the email is sent
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  emailService: EmailService,
  templates: Record<string, string>,
): Promise<void> {
  const logger = new Logger('SendWelcomeEmail');
  try {
    // Get the welcome template
    let htmlContent = templates['welcome'] || templates['createaccount'];

    // If template doesn't exist, log warning and load directly
    if (!htmlContent) {
      logger.warn('Welcome email template not found, loading directly');
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
    await emailService.sendMail(
      email,
      'Welcome to Zero Card - No more gbesome!',
      {
        html: htmlContent,
      },
      'Zero Card',
    );

    logger.log(`Welcome email sent to ${email}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send welcome email: ${errorMessage}`);
  }
}
