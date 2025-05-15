import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { OfframpService } from '../src/modules/offramp/offramp.service';

/**
 * Script to test Offramp order creation
 * 
 * Run with: npx ts-node scripts/test-offramp.ts
 * 
 * This script uses hardcoded test values. To use different values,
 * modify the constants below.
 */

// Test configuration
const TEST_CONFIG = {
  userId: 'did:privy:cm94emxt901iyl50l4zr9bg7h',
  chainType: 'ethereum',
  tokenSymbol: 'USDC',
  network: 'MAINET',
  amount: '0.5',
  fiat: 'NGN',
  blockchainNetwork: 'Base',
  recipientDetails: {
    accountIdentifier: '2007878918',
    accountName: 'IDOWU, MICHAEL SEYI',
    institution: 'KUDANGPC', // Optional
    memo: 'seyi is a good boy'         // Optional
  }
};

async function bootstrap() {
  const logger = new Logger('TestOfframp');
  logger.log('Starting Offramp test script...');

  // Create a NestJS app context with AppModule which includes OfframpModule
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the Offramp service
    const offrampService = app.get(OfframpService);
    
    logger.log('Test configuration:');
    logger.log(`User ID: ${TEST_CONFIG.userId}`);
    logger.log(`Chain Type: ${TEST_CONFIG.chainType}`);
    logger.log(`Token: ${TEST_CONFIG.tokenSymbol}`);
    logger.log(`Network: ${TEST_CONFIG.network}`);
    logger.log(`Amount: ${TEST_CONFIG.amount}`);
    logger.log(`Fiat: ${TEST_CONFIG.fiat}`);
    logger.log(`Blockchain Network: ${TEST_CONFIG.blockchainNetwork}`);
    logger.log('Recipient Details:', TEST_CONFIG.recipientDetails);

    // Create the offramp order
    logger.log('\nCreating offramp order...');
    const orderId = await offrampService.createOrder(
      TEST_CONFIG.userId,
      TEST_CONFIG.chainType,
      TEST_CONFIG.tokenSymbol,
      TEST_CONFIG.network,
      TEST_CONFIG.amount,
      TEST_CONFIG.fiat,
      TEST_CONFIG.recipientDetails,
      TEST_CONFIG.blockchainNetwork
    );

    logger.log('✅ Order created successfully!');
    logger.log(`Order ID: ${orderId}`);
    
  } catch (error) {
    logger.error('❌ Error during testing:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      logger.error('Stack trace:', error.stack);
    }
  } finally {
    // Close the application context
    await app.close();
  }
}

// Run the test
bootstrap().catch(err => {
  console.error('Failed to bootstrap the application:', err);
  process.exit(1);
}); 