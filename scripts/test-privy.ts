import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrivyService } from '../src/modules/auth/privy.service';

/**
 * Script to test the Privy service functions
 * 
 * Run with: npx ts-node scripts/test-privy.ts <accessToken> <identityToken>
 */
async function bootstrap() {
  const logger = new Logger('TestPrivy');
  logger.log('Starting Privy test script...');

  // Create a NestJS app context to access the services
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the Privy service
    const privyService = app.get(PrivyService);
    
    // Get tokens from command line arguments
    const accessToken = process.argv[2];
    const identityToken = process.argv[3];
    
    if (!accessToken) {
      logger.error('Please provide an access token as the first argument');
      return;
    }
    
    // Test verifyAccessToken
    logger.log('Testing verifyAccessToken...');
    const accessResult = await privyService.verifyAccessToken(accessToken);
    
    if (accessResult.success) {
      logger.log(`✅ Access token verification successful for user: ${accessResult.userId}`);
    } else {
      logger.error('❌ Access token verification failed');
    }
    
    // Test getUserDetails if identity token is provided
    if (identityToken) {
      logger.log('Testing getUserDetails...');
      const userDetails = await privyService.getUserDetails(identityToken);
      
      if (userDetails) {
        logger.log('✅ User details retrieved successfully:');
        logger.log(JSON.stringify(userDetails, null, 2));
      } else {
        logger.error('❌ Failed to retrieve user details');
      }
    } else {
      logger.log('No identity token provided, skipping getUserDetails test');
    }
    
  } catch (error) {
    logger.error('Error during testing:', error);
  } finally {
    // Close the application context
    await app.close();
  }
}

bootstrap().catch(err => {
  console.error('Failed to bootstrap the application', err);
}); 