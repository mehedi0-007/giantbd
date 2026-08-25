import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { POService } from './po.service';
import { POController } from './po.controller';

@Module({
  imports: [PrismaModule],
  controllers: [POController],
  providers: [POService],
})
export class POModule {}
