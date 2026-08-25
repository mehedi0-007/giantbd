import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import { RegistrationDTO, UpdateUserDTO } from './dto/user.dto';
import {
  CurrentUser,
  Public,
  RequirePermissions,
  PermissionsGuard,
  UserFileUploadInterceptor,
} from '../common';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(UserFileUploadInterceptor())
  async register(
    @Body() dto: RegistrationDTO,
    @UploadedFiles()
    files?: { image?: Express.Multer.File[]; signature?: Express.Multer.File[] },
  ) {
    return this.userService.registration(dto, files);
  }

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  @Get()
  @RequirePermissions('users:read')
  async findAll(
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
    @Query('search') search?: string,
  ) {
    return this.userService.findAll({ page, per_page, search });
  }

  @Get(':id')
  @RequirePermissions('users:read')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post(':id/restore')
  @RequirePermissions('users:update')
  async restoreUser(@Param('id') id: string) {
    return this.userService.restoreUser(id);
  }
}
