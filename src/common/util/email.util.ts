/**
 * Normalizes an email address by trimming whitespace and converting it to lowercase.
 * Validates the email format per RFC 5322 standards and throws an error for invalid formats.
 *
 * @param email - The email address to normalize
 * @returns The normalized email address
 * @throws {Error} If the email format is invalid
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error('Email cannot be empty or just whitespace');
  }

  // Basic RFC 5322 compliant regex for email validation
  // Allows for most valid email formats including special characters
  const emailRegex =
    /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i;

  if (!emailRegex.test(trimmedEmail)) {
    throw new Error(`Invalid email format: ${trimmedEmail}`);
  }

  return trimmedEmail.toLowerCase();
}
