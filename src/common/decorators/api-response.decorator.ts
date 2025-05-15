import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { Response } from '../interceptors/response.interceptor';

/**
 * Custom API response decorator that wraps response in a standard format
 * and properly documents it in Swagger
 */
export const ApiStandardResponse = <TModel extends Type<any>>(
  model: TModel,
  description = 'Successful operation',
) => {
  return applyDecorators(
    ApiExtraModels(Response, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(Response) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
            },
          },
        ],
      },
    }),
  );
};
