import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TransformInterceptor } from './index';

const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
  getRequest: jest.fn().mockResolvedValue({
    method: 'GET',
    ip: '::1',
    url: '/api/v1/users',
  }),
}));

const mockArgumentsHost = {
  getClass: jest.fn(),
  getHandler: jest.fn(),
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
};

const mockPipe = jest.fn();
const mockNext = {
  handle: jest.fn().mockImplementation(() => ({
    pipe: mockPipe,
  })),
};

describe('Bad Request Exception Filter', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor],
    }).compile();

    interceptor = module.get(TransformInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should catch bad request exception', () => {
    interceptor.intercept(mockArgumentsHost, mockNext);
    expect(mockNext.handle).toBeCalled();
    expect(mockPipe).toBeCalledWith(expect.any(Function), expect.any(Function));
  });
});
