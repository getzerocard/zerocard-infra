import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { ConfigService } from '@nestjs/config';
import { User } from '../modules/user/entity/user.entity';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('db.url'),
  ssl: true,
  entities: [User],
  synchronize: false, // Set to false in production
  logging: configService.get<string>('env') === 'development',
});
