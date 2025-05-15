import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import type { ApiResponseOptions } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { getSchemaPath } from '@nestjs/swagger';

/**
 * DTO for the destination address in a shipment request
 */
export class DestinationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'First name of the recipient', example: 'John' })
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Last name of the recipient', example: 'Doe' })
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Street address of the recipient',
    example: '123 Main St',
  })
  street: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'City of the recipient', example: 'New York' })
  city: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'State of the recipient', example: 'NY' })
  state: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Country of the recipient', example: 'US' })
  country: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Postal code of the recipient',
    example: '10001',
  })
  post_code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Phone number of the recipient',
    example: '+1234567890',
  })
  phone: string;

  @IsNumber()
  @ApiProperty({
    description: 'Longitude of the destination',
    example: -74.006,
  })
  lng: number;

  @IsNumber()
  @ApiProperty({ description: 'Latitude of the destination', example: 40.7128 })
  lat: number;
}

/**
 * DTO for creating a shipment
 */
export class CreateShipmentDto {
  @ApiProperty({
    description: 'Destination address for the shipment',
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Recipient name',
        example: 'John Doe',
      },
      phone: {
        type: 'string',
        description: 'Recipient phone number',
        example: '+2341234567890',
      },
      street: {
        type: 'string',
        description: 'Street address',
        example: '123 Main St',
      },
      city: { type: 'string', description: 'City', example: 'Lagos' },
      state: { type: 'string', description: 'State', example: 'Lagos' },
      country: { type: 'string', description: 'Country', example: 'Nigeria' },
      postalCode: {
        type: 'string',
        description: 'Postal code',
        example: '100001',
      },
    },
  })
  destination: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @ApiProperty({
    description: 'Preferred pickup date for the shipment',
    type: 'string',
    format: 'date',
    example: '2023-12-01',
    required: false,
  })
  pickupDate?: string;

  @ApiProperty({
    description: 'Callback URL for shipment updates',
    type: 'string',
    example: 'https://your-api-endpoint.com/shipment-callback',
    required: false,
  })
  callbackUrl?: string;
}

/**
 * DTO for the status object in shipment responses
 */
export class ShipmentStatusDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The status code of the shipment from Sendbox API. Possible values: drafted (Book on Hold - shipment not paid for), pending (waiting for pickup), pickup_started (pickup process started), pickup_completed (shipment picked up and marked as shipped), in_delivery (delivery process started), in_transit (delivery in transit with real-time updates), delivered (shipment delivered successfully)',
    example: 'drafted',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'Human-readable name of the status corresponding to the code from Sendbox API.',
    example: 'Book On Hold',
  })
  name: string;
}

/**
 * DTO for the actual data returned when creating a shipment.
 * This reflects the structure from the createShipment.handler.ts
 */
export class CreateShipmentResponseDataDto {
  @ApiProperty({
    description: 'Shipment tracking number from Sendbox',
    example: 'SBX123456789',
  })
  tracking_number: string;

  @ApiProperty({
    description: 'Current status of the shipment from Sendbox',
    example: 'drafted',
  })
  status: string;

  @ApiProperty({
    description: 'Message from Sendbox API regarding shipment creation',
    example: 'Shipment created successfully',
  })
  message: string; // This is the message from Sendbox, not the wrapper

  @ApiProperty({
    description: 'Timestamp of when the shipment was created on Sendbox',
    example: '2023-12-01T10:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Timestamp of when the shipment was last updated on Sendbox',
    example: '2023-12-01T10:05:00.000Z',
  })
  updated_at: string;
}

/**
 * Success response examples for creating a shipment
 */
export class CreateShipmentSuccessExamples {
  static responses = [
    {
      status: 201, // Assuming 201 for successful creation
      description: 'Shipment created successfully',
      schema: {
        allOf: [
          { $ref: getSchemaPath('Response') }, // Assuming 'Response' is the name of your global wrapper schema
          {
            properties: {
              data: { $ref: getSchemaPath('CreateShipmentResponseDataDto') },
            },
          },
        ],
      },
          examples: {
            success: {
              summary: 'Shipment Created',
              value: {
                statusCode: 201,
            success: true,
                data: {
              tracking_number: 'SBX123456789',
                  status: 'drafted',
              message: 'Shipment booking successful', // Example Sendbox message
              created_at: '2023-12-01T10:00:00.000Z',
              updated_at: '2023-12-01T10:05:00.000Z',
              },
            },
          },
        },
      },
    ];
  }

/**
 * Error response examples for creating a shipment
 */
export class CreateShipmentErrorExamples {
  static responses = [
  {
    status: 400,
      description: 'Bad Request - Invalid input data or user not found initially by handler (though service might catch earlier)',
        examples: {
        badRequestInput: {
            summary: 'Invalid Input Data',
            value: {
              statusCode: 400,
            success: false,
              message: 'Invalid input data provided for shipment creation',
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
    description: 'Forbidden - Cannot create shipment for another user',
        examples: {
          forbidden: {
            summary: 'Forbidden Action',
            value: {
              statusCode: 403,
            success: false,
              message: 'Cannot create shipment for another user',
        },
      },
    },
  },
  {
      status: 404, // This might be more for the service if user is not found before calling handler
    description: 'Not Found - User not found',
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
      description: 'Internal Server Error - Unexpected error during shipment creation or Sendbox API error',
        examples: {
          internalError: {
            summary: 'Internal Server Error',
            value: {
              statusCode: 500,
            success: false,
              message: 'Shipment creation failed: Unexpected error',
            },
          },
        sendboxApiError: {
            summary: 'Sendbox API Error',
            value: {
              statusCode: 500,
            success: false,
            message: 'Shipment creation failed: Error from Sendbox API',
        },
      },
    },
  },
];
}
