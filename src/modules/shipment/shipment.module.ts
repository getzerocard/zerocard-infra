import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ShipmentController],
  providers: [ShipmentService],
})
export class ShipmentModule {}
