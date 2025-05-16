import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity/user.entity';
import { Constraint } from './entity/authorisedUserConstraint.entity';
import { AuthModule } from '../auth/auth.module';
import { FundsLock } from '../Card/entity/fundsLock.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Constraint, FundsLock]),
    forwardRef(() => AuthModule),
    NotificationModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule.forFeature([User])],
})
export class UserModule { }
