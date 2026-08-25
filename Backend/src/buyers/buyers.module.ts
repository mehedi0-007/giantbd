import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BuyersService } from './buyers.service';
import { BuyersController } from './buyers.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BuyersController],
  providers: [BuyersService],
})
export class BuyerModule {}
