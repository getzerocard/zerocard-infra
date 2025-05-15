import { getTokenBalance } from '../src/common/util/getTokenBalance';
import { Logger } from '@nestjs/common';

// Configure logger
const logger = new Logger('TestBalanceScript');

// Test configuration
const USER_ADDRESS = '0x11dbF181dD5c075C2abD92Cb9579c4809406b5Be'; // Replace with a test Ethereum address
const SYMBOLS = 'USDC,USDT'; // Tokens to check
const CHAIN_TYPE = 'ethereum'; // Blockchain type
const NETWORKS = ['Base', 'Arbitrum', 'Polygon', 'BNB Smart Chain']; // Networks to check
const NETWORK_TYPE = 'MAINET'; // Network environment

async function testBalance() {
  logger.log('Starting balance test script...');
  logger.log(`Checking balances for address: ${USER_ADDRESS}`);
  logger.log(`Tokens: ${SYMBOLS}`);
  logger.log(`Networks: ${NETWORKS.join(', ')}`);
  logger.log(`Chain Type: ${CHAIN_TYPE}`);
  logger.log(`Network Type: ${NETWORK_TYPE}`);

  try {
    const balances = await getTokenBalance(
      SYMBOLS,
      USER_ADDRESS,
      CHAIN_TYPE,
      NETWORKS,
      NETWORK_TYPE
    );

    logger.log('Balance Results:');
    Object.entries(balances).forEach(([symbol, networkBalances]) => {
      logger.log(`  ${symbol}:`);
      Object.entries(networkBalances).forEach(([network, balance]) => {
        logger.log(`    ${network}: ${balance}`);
      });
    });
  } catch (error) {
    logger.error(`Error during balance test: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    logger.log('Balance test script completed.');
  }
}

// Run the test
testBalance().catch((error) => {
  logger.error(`Unhandled error in test script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
}); 