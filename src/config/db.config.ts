import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import config from './env.config';

// Configuration for NestJS TypeOrmModule
export const databaseConfig = (): TypeOrmModuleOptions => {
  // If DATABASE_URL is provided, use it; otherwise fall back to individual parameters
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // ❌ Disable this in production
      migrationsRun: false, // ✅ Automatically run migrations on startup
      migrations: [__dirname + '/../migrations/*{.ts,.js}'], // Migration path
      logging: true,
      extra: {
        ssl: process.env.DATABASE_URL.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : undefined,
      },
    };
  }

  console.log('Using individual DB parameters:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    database: process.env.DB_NAME,
  });
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    synchronize: false, // ❌ Disable this in production
    migrationsRun: false, // ✅ Automatically run migrations on startup
    migrations: [__dirname + '/../migrations/*{.ts,.js}'], // Migration path
    logging: true,
  };
};

// Configuration for TypeORM CLI (migrations)
const dataSource = new DataSource({
  type: 'postgres',
  url:
    config.db.url ||
    `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false, // Use migrations instead
});

console.log(
  'CLI DataSource URL:',
  config.db.url ||
    `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`,
);

// Add listeners for connection events
dataSource
  .initialize()
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch((error) => {
    console.error(
      'Error connecting to database. Possible network issue:',
      error.message,
    );
  });

// Export only this DataSource for CLI usage
export default dataSource;
