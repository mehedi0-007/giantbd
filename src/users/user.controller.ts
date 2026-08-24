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
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegistrationDTO, UpdateUserDTO } from './dto/user.dto';
import { UserFileUploadInterceptor } from '../common/Interceptors/upload_file.interceptor';
import { CurrentUser } from '../common/Decorators/current-user.decorator';
import { Public } from '../common/Decorators/public.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @Public()
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
  async findAll(
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
    @Query('search') search?: string,
  ) {
    return this.userService.findAll({ page, per_page, search });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
