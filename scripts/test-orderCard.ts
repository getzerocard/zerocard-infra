import { orderCardHandler } from '../src/modules/Card/handler/orderCard.handler';
import { ConfigService } from '@nestjs/config';
import { getTokenBalance } from '../src/common/util/getTokenBalance';

// Mock user repository for testing purposes
class MockUserRepository {
  async findOne({ where }: { where: { userId: string } }) {
    // Simulate user data - adjust based on test case
    return {
      userId: where.userId,
      isIdentityVerified: true,
      cardOrderStatus: 'not_ordered',
    };
  }

  async save(user: any) {
    // Simulate saving user data
    console.log(`User ${user.userId} card order status updated to ${user.cardOrderStatus}`);
    return user;
  }
}

// Mock ConfigService for testing purposes
class MockConfigService implements Partial<ConfigService> {
  get<T>(key: string, defaultValue?: T): T {
    if (key === 'CARD_ORDER_FEE') {
      return 50 as T; // Set order fee to 50 for testing
    }
    return defaultValue as T;
  }
}

// Mock getTokenBalance function for testing purposes
const mockGetTokenBalance = async (symbols: string | string[], userAddress: string, chainType: 'ethereum' | 'solana', blockchainNetwork: string | string[], networkType: 'MAINET' | 'TESTNET'): Promise<Record<string, Record<string, string>>> => {
  // Simulate balance results for different tokens and networks
  const networkArray = Array.isArray(blockchainNetwork) ? blockchainNetwork : [blockchainNetwork];
  const symbolArray = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim());
  const result: Record<string, Record<string, string>> = {};

  symbolArray.forEach(symbol => {
    result[symbol] = {};
    networkArray.forEach(network => {
      if (symbol === 'USDC' && network === 'Base') {
        result[symbol][network] = '75.25'; // Sufficient balance for USDC on Base
      } else if (symbol === 'USDT' && network === 'BNB Smart Chain') {
        result[symbol][network] = '30.50'; // Insufficient balance for USDT on BNB Smart Chain
      } else {
        result[symbol][network] = 'Unsupported combination';
      }
    });
  });

  return result;
};

// Override the original getTokenBalance function for testing
(getTokenBalance as any) = mockGetTokenBalance;

async function runTests() {
  console.log('Running tests for orderCardHandler...');
  const userRepository = new MockUserRepository();
  const configService = new MockConfigService() as ConfigService;

  // Test Case 1: Sufficient balance for USDC on Base
  console.log('\nTest Case 1: Sufficient balance for USDC on Base');
  try {
    const result = await orderCardHandler(
      'user123',
      'USDC',
      'ethereum',
      ['Base'],
      'MAINET',
      '0xTestAddress',
      userRepository,
      configService
    );
    console.log('Result:', result);
  } catch (error: any) {
    console.error('Error in Test Case 1:', error.message || error.toString());
  }

  // Test Case 2: Insufficient balance for USDT on BNB Smart Chain
  console.log('\nTest Case 2: Insufficient balance for USDT on BNB Smart Chain');
  try {
    const result = await orderCardHandler(
      'user456',
      'USDT',
      'ethereum',
      ['BNB Smart Chain'],
      'MAINET',
      '0xTestAddress',
      userRepository,
      configService
    );
    console.log('Result:', result);
  } catch (error: any) {
    console.error('Error in Test Case 2:', error.message || error.toString());
  }

  // Test Case 3: Multiple tokens and networks, one sufficient balance
  console.log('\nTest Case 3: Multiple tokens and networks, one sufficient balance');
  try {
    const result = await orderCardHandler(
      'user789',
      ['USDT', 'USDC'],
      'ethereum',
      ['Base', 'BNB Smart Chain'],
      'MAINET',
      '0xTestAddress',
      userRepository,
      configService
    );
    console.log('Result:', result);
  } catch (error: any) {
    console.error('Error in Test Case 3:', error.message || error.toString());
  }
}

runTests().catch(console.error); 