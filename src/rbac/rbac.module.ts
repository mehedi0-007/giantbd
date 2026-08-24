import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard, RolesGuard } from '../common';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionsService, PermissionsGuard, RolesGuard],
  exports: [RolesService, PermissionsService, PermissionsGuard, RolesGuard],
})
export class RbacModule {}
