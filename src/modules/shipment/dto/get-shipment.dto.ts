import { ApiProperty } from '@nestjs/swagger';
import { getSchemaPath } from '@nestjs/swagger';

/**
 * DTO for the destination address as returned by Sendbox in GetShipment response
 */
export class GetShipmentDestinationAddressDto {
  @ApiProperty({ example: 'John', description: 'Recipient first name' })
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Recipient last name' })
  last_name: string;

  @ApiProperty({ example: '123 Main St', description: 'Recipient street' })
  street: string;

  @ApiProperty({ example: 'New York', description: 'Recipient city' })
  city: string;

  @ApiProperty({ example: 'NY', description: 'Recipient state' })
  state: string;

  @ApiProperty({ example: 'US', description: 'Recipient country code' })
  country: string;

  @ApiProperty({ example: '10001', description: 'Recipient postal code' })
  post_code: string;

  @ApiProperty({ example: '+1234567890', description: 'Recipient phone number' })
  phone: string;
  // Add other fields like email, lng, lat if Sendbox returns them for GET shipment
}

/**
 * DTO for the current status of the shipment as returned by Sendbox
 */
export class GetShipmentCurrentStatusDto {
  @ApiProperty({ description: 'Status code from Sendbox', example: 'in_transit' })
  code: string;

  @ApiProperty({ description: 'Human-readable status name from Sendbox', example: 'In Transit' })
  name: string;
}

/**
 * DTO for the actual data returned when retrieving shipment details.
 * This reflects the structure from getShipment.handler.ts + database_status from service.
 */
export class GetShipmentResponseDataDto {
  @ApiProperty({ description: 'User ID associated with the shipment', example: 'did:privy:user123' })
  user_id: string;

  @ApiProperty({ description: 'Estimated delivery date from Sendbox', example: '2023-12-25' })
  package_delivery_eta: string;

  @ApiProperty({ type: () => GetShipmentDestinationAddressDto, description: "Recipient's address details from Sendbox" })
  destination_address: GetShipmentDestinationAddressDto;

  @ApiProperty({ description: "Recipient's full name or company name from Sendbox", example: 'John Doe' })
  destination_name: string;

  @ApiProperty({ type: () => GetShipmentCurrentStatusDto, description: 'Current status of the shipment from Sendbox' })
  current_status: GetShipmentCurrentStatusDto;

  @ApiProperty({ description: 'Shipment tracking number', example: 'SBX123456789' })
  tracking_number: string;

  @ApiProperty({
    description: 'Card order status from our application database',
    example: 'shipped',
    required: false,
  })
  database_status?: string;
}

/**
 * Success response examples for retrieving shipment details
 */
export class GetShipmentSuccessExamples {
  static responses = [
    {
      status: 200,
      description: 'Shipment details retrieved successfully',
      schema: {
        allOf: [
          { $ref: getSchemaPath('Response') }, // Global wrapper schema
          {
            properties: {
              data: { $ref: getSchemaPath('GetShipmentResponseDataDto') },
            },
          },
        ],
      },
      examples: {
        success: {
          summary: 'Shipment Retrieved',
          value: {
            statusCode: 200,
            success: true,
            data: {
              user_id: 'did:privy:user123',
              package_delivery_eta: '2023-12-25',
              destination_address: {
                first_name: 'John',
                last_name: 'Doe',
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                country: 'US',
                post_code: '10001',
                phone: '+1234567890',
              },
              destination_name: 'John Doe',
              current_status: {
                code: 'in_transit',
                name: 'In Transit',
              },
              tracking_number: 'SBX123456789',
              database_status: 'shipped',
            },
          },
        },
      },
    },
  ];
}

/**
 * Error response examples for retrieving shipment details
 */
export class GetShipmentErrorExamples {
  static responses = [
    {
      status: 400,
      description: 'Bad Request - Invalid user ID or no tracking number found for user',
      examples: {
        invalidUserId: {
          summary: 'Invalid User ID (if applicable before service check)',
          value: { statusCode: 400, success: false, message: 'Invalid user ID provided' },
        },
        noTrackingNumber: {
          summary: 'No Tracking Number for User',
          value: {
            statusCode: 400,
            success: false,
            message: 'No tracking number found for user with ID did:privy:abc123xyz',
          },
        },
      },
    },
    {
      status: 401,
      description: 'Unauthorized - Authentication required',
      examples: {
        unauthorized: {
          summary: 'Unauthorized Access',
          value: { statusCode: 401, success: false, message: 'Unauthorized' },
        },
      },
    },
    {
      status: 403,
      description: 'Forbidden - Cannot retrieve shipment for another user',
      examples: {
        forbidden: {
          summary: 'Forbidden Action',
          value: {
            statusCode: 403,
            success: false,
            message: 'Cannot retrieve shipment for another user',
          },
        },
      },
    },
    {
      status: 404,
      description: 'Not Found - User not found (by service or handler)',
      examples: {
        userNotFound: {
          summary: 'User Not Found for Shipment',
          value: {
            statusCode: 404,
            success: false,
            message: 'User with ID did:privy:abc123xyz not found',
          },
        },
      },
    },
    {
      status: 500,
      description: 'Internal Server Error - Unexpected error during shipment retrieval or Sendbox API error',
      examples: {
        internalError: {
          summary: 'Internal Server Error',
          value: {
            statusCode: 500,
            success: false,
            message: 'Shipment retrieval failed: Unexpected error',
          },
        },
        sendboxApiError: {
          summary: 'Sendbox API Error',
          value: {
            statusCode: 500,
            success: false,
            message: 'Shipment retrieval failed: Error from Sendbox API',
          },
        },
      },
    },
  ];
}
