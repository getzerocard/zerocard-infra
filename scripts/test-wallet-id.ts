import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrivyService } from '../src/modules/auth/privy.service';

/**
 * Script to test Privy wallet IDs for different chains
 * 
 * Run with: npx ts-node scripts/test-wallet-id.ts <userId> [chainType]
 * 
 * Parameters:
 * - userId: The Privy user ID (DID format: did:privy:XXXXX)
 * - chainType: Optional. Specify 'ethereum' or 'solana' to test specific chain (tests both if not specified)
 * 
 * Examples: 
 * - Test all chains: 
 *   npx ts-node scripts/test-wallet-id.ts did:privy:abc123
 * 
 * - Test specific chain:
 *   npx ts-node scripts/test-wallet-id.ts did:privy:abc123 ethereum
 *   npx ts-node scripts/test-wallet-id.ts did:privy:abc123 solana
 */
async function bootstrap() {
  const logger = new Logger('TestPrivyWallets');
  logger.log('Starting Privy wallet test script...');

  // Create a NestJS app context to access the services
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the Privy service
    const privyService = app.get(PrivyService);
    
    // Get userId and optional chain type from command line arguments
    const userId = process.argv[2];
    const specificChain = process.argv[3] as 'ethereum' | 'solana' | undefined;
    
    if (!userId) {
      logger.error('Please provide a userId (DID) as the first argument');
      logger.log('Usage: npx ts-node scripts/test-wallet-id.ts <userId> [chainType]');
      logger.log('Example: npx ts-node scripts/test-wallet-id.ts did:privy:abc123');
      return;
    }

    // Validate userId format
    if (!userId.startsWith('did:privy:')) {
      logger.warn('Warning: userId should be in DID format (did:privy:XXXXX)');
    }

    // Define which chains to test
    const chainsToTest = specificChain 
      ? [specificChain]
      : ['ethereum', 'solana'] as const;

    // Test each chain type
    for (const chainType of chainsToTest) {
      logger.log(`\nTesting ${chainType.toUpperCase()} wallets...`);
      
      try {
        const wallets = await privyService.getWalletId(userId, chainType);
        
        if (wallets.length > 0) {
          logger.log(`✅ Found ${wallets.length} ${chainType} wallet(s):`);
          wallets.forEach((wallet, index) => {
            logger.log(`\nWallet #${index + 1}:`);
            logger.log(`ID: ${wallet.id}`);
            logger.log(`Address: ${wallet.address}`);
          });
        } else {
          logger.warn(`⚠️ No ${chainType} wallets found for this user`);
        }
      } catch (error) {
        logger.error(`❌ Error fetching ${chainType} wallets:`, error);
      }
    }
    
  } catch (error) {
    logger.error('Error during testing:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
    }
  } finally {
    // Close the application context
    await app.close();
  }
}

bootstrap().catch(err => {
  console.error('Failed to bootstrap the application:', err);
  process.exit(1);
}); 