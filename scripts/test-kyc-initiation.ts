import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { KycService } from '../src/modules/KYC/kyc.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const kycService = app.get(KycService);

  try {
    // Replace these with real test data
    const identityType = 'NIN';
    const number = '12581568662'; // Replace with a valid test BVN
    const debitAccountNumber = '0110890780'; // Replace with a valid test account number

    console.log('Initiating KYC verification...');
    const response = await kycService.initiateIdentityVerification(
      identityType,
      number,
      debitAccountNumber,
    );
    console.log('KYC Verification Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error during KYC initiation:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
}); 