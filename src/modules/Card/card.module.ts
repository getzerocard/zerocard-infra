import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';
import { PlatformDebit } from './entity/Platformfees.entity';
import { OrderCardService } from './services/orderCard.service';
import { MapCardService } from './services/mapCard.service';
import { UserModule } from '../user/user.module';
import { CardController } from './controllers/Card.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([User, PlatformDebit]),
    UserModule,
  ],
  providers: [OrderCardService, MapCardService],
  exports: [OrderCardService, MapCardService],
  controllers: [CardController],
})
export class CardModule { }
