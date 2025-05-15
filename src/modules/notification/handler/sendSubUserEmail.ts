import { Logger } from '@nestjs/common';
import type { EmailService } from '../email.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Send an email to a new sub-user
 *
 * @param email - Sub-user's email address
 * @param emailService - The email service instance
 * @param templates - The templates loaded by the email service
 * @returns Promise that resolves when the email is sent
 */
export async function sendSubUserEmail(
  email: string,
  emailService: EmailService,
  templates: Record<string, string>,
): Promise<void> {
  const logger = new Logger('SendSubUserEmail');
  try {
    // Get the sub-user addition template
    let htmlContent = templates['addSubUser'];

    // If template doesn't exist, log warning and load directly
    if (!htmlContent) {
      logger.warn(
        'Sub-user addition email template not found, loading directly',
      );
      htmlContent = fs.readFileSync(
        path.join(
          process.cwd(),
          'src/common/notification/templates/addSubUser.html',
        ),
        'utf8',
      );
    }

    // Send the email
    await emailService.sendMail(
      email,
      'Welcome to Zero Card - Sub-User Account',
      {
        html: htmlContent,
      },
      'Zero Card',
    );

    logger.log(`Sub-user addition email sent to ${email}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send sub-user addition email: ${errorMessage}`);
  }
}
