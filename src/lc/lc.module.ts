import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LCService } from './lc.service';
import { LCController } from './lc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LCController],
  providers: [LCService],
})
export class LCModule {}
