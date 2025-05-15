import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Structure of the extracted KYC data
 */
export interface ExtractedKycData {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  photo: string;
  type: 'BVN' | 'NIN';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  otpVerified: boolean;
}

/**
 * Extracts KYC data from the API response based on identity type
 * @param response The raw response from the ZeroKYC API
 * @returns ExtractedKycData object with the relevant information
 * @throws HttpException if data extraction fails
 */
export function extractKycData(response: any): ExtractedKycData {
  try {
    if (!response || !response.data) {
      throw new Error('Invalid response structure: Missing data field');
    }

    const data = response.data;
    const providerResponse = data.providerResponse;

    if (!data.type || !providerResponse) {
      throw new Error('Missing required fields in response data');
    }

    const identityType = data.type as 'BVN' | 'NIN';
    let firstName = '';
    let lastName = '';
    let dob = '';
    let phone = '';
    let photo = '';
    let status = '';
    let otpVerified = false;
    // Conditional logic based on identity type
    if (identityType === 'BVN') {
      firstName = providerResponse.firstName || '';
      lastName = providerResponse.lastName || '';
      dob = providerResponse.dateOfBirth || '';
      phone = providerResponse.phoneNumber1 || providerResponse.phoneNumber2 || '';
      photo = providerResponse.imageBase64 || '';
      status = data.status || '';
      otpVerified = data.otpVerified || false;
    } else if (identityType === 'NIN') {
      // Adjust field names based on NIN response structure if different
      // For now, assuming similar structure; update as needed
      firstName = providerResponse.firstName || '';
      lastName = providerResponse.lastName || '';
      dob = providerResponse.dateOfBirth || '';
      phone = providerResponse.phoneNumber || '';
      photo = providerResponse.imageBase64 || '';
      status = data.status || '';
      otpVerified = data.otpVerified || false;
    } else {
      throw new Error(`Unsupported identity type: ${identityType}`);
    }

    return {
      firstName,
      lastName,
      dob,
      phone,
      photo,
      type: identityType,
      status: status as 'SUCCESS' | 'FAILED' | 'PENDING',
      otpVerified,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to extract KYC data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
