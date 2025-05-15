import { constants, publicEncrypt } from 'crypto';

/**
 * Encrypts arbitrary data with a public key
 */
export async function publicKeyEncrypt(
  data: any,
  publicKeyPEM: string,
): Promise<string> {
  const cleanKey = publicKeyPEM
    .trim() // remove leading/trailing whitespace
    .replace(/\\n/g, '\n') // convert escaped \n to actual newlines
    .replace(/\r/g, ''); // remove carriage returns if present

  const bufferData = Buffer.from(JSON.stringify(data), 'utf8');

  const encryptedBuffer = publicEncrypt(
    {
      key: cleanKey,
      padding: constants.RSA_PKCS1_PADDING,
    },
    bufferData,
  );

  return encryptedBuffer.toString('base64');
}

/**
 * Fetch public key of aggregator
 */
export async function fetchAggregatorPublicKey(aggregatorUrl: string) {
  try {
    const response = await fetch(`${aggregatorUrl}/pubkey`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching aggregator public key:', error);
    throw error;
  }
}
