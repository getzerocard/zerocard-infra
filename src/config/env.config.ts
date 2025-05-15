import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'dev',
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    url: process.env.DATABASE_URL,
  },
  privy: {
    appId: process.env.PRIVY_APP_ID,
    appSecret: process.env.PRIVY_APP_SECRET,
    verificationKey: process.env.PRIVY_APP_VERIFICATION_KEY,
    PRIVY_AUTHORIZATION_KEY: process.env.PRIVY_AUTHORIZATION_KEY,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  moralis: {
    apiKey: process.env.MORALIS_API_KEY,
    streamSecret: process.env.MORALIS_STREAM_SECRET,
  },

  zerocard: {
    apiUrl: process.env.ZEROKYC_API_URL,
    clientId: process.env.ZEROKYC_CLIENT_ID,
    clientAssertion: process.env.ZEROKYC_CLIENT_ASSERTION,
    debitAccountNumber: process.env.ZERO_DEBIT_ACCOUNT_NUMBER,
  },
  offramp: {
    senderFee: process.env.SENDER_FEE,
    senderFeeRecipient: process.env.SENDER_FEE_RECIPIENT,
    network: process.env.NETWORK,
    institution: process.env.OFFRAMP_INSTITUTION,
    fiat: process.env.OFFRAMP_FIAT
  },
  aggregator: {
    url: process.env.AGGREGATOR_URL,
  },
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
    host: process.env.POSTHOG_HOST,
  },
  card: {
    orderFee: process.env.ORDER_FEE,
    settlementWalletAddress: process.env.SETTLEMENT_WALLET_ADDRESS,
    ZEROCARD_API_URL: process.env.ZERO_CARD_API_URL,
    ZEROCARD_API_KEY: process.env.ZERO_CARD_API_KEY,
  },
  shipment: {
    ZEROCARD_SHIPPING_API_URL: process.env.ZEROCARD_SHIPPING_API_URL,
    ZEROCARD_SHIPPING_AUTH_TOKEN: process.env.ZEROCARD_SHIPPING_AUTH_TOKEN,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  email: {
    host: process.env.NOREPLY_HOST,
    port: 587,
    username: process.env.NOREPLY_USERNAME,
    password: process.env.NOREPLY_PASSWORD,
    senderEmail: process.env.NOREPLY_EMAIL,
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
  addressMonitoring: {
    WALLET_API_KEY: process.env.WALLET_API_KEY,
    WALLET_ID: process.env.WALLET_ID,
    ADDRESS_MONITORING_BASE_URL: process.env.ADDRESS_MONITORING_BASE_URL,
  },
  otp: {
    length: parseInt(process.env.OTP_LENGTH, 10) || 4,
    expirationMs: parseInt(process.env.OTP_EXPIRATION_MS, 10) || 300000,
    expirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES, 10) || 5,
  },
};

export default config;
