import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Converts a date string from DD-MM-YYYY format to YYYY/MM/DD format.
 * @param dateStr The date string in DD-MM-YYYY format.
 * @returns The date string in YYYY/MM/DD format.
 * @throws HttpException if the date format is invalid.
 */
export function convertToDatabaseDateFormat(dateStr: string): string {
  try {
    // Handle DD-MM-YYYY format
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new Error('Invalid date format. Expected DD-MM-YYYY');
    }

    // Assuming DD-MM-YYYY format, rearrange to YYYY/MM/DD
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (error) {
    throw new HttpException(
      `Failed to convert date format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
