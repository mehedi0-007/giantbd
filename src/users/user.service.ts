import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationDTO, UpdateUserDTO } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async registration(dto: RegistrationDTO, file: any) {
    const isExist = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (isExist)
      throw new ConflictException('User already exists with this email');

    const hashPass = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prismaService.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? '',
        password: hashPass,
        roleId: dto.roleId,
        gender: dto.gender,
        image: file.image ?? '',
        signature: file.signature ?? '',
      },
    });

    return {
      msg: 'User Created Successfully',
      data: '',
    };
  }

  async findAll(query: any) {
    const per_page = query.per_page ?? 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * per_page;

    const [total, users] = await Promise.all([
      this.prismaService.user.count(),

      this.prismaService.user.findMany({
        skip,
        take: per_page,
        include: {
          role: true,
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    const responseUser = users.map((user) => {
      this.responseUser(user);
    });

    return {
      data: responseUser,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async updateUser(userId: string, dto: UpdateUserDTO) {
    const isExist = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!isExist) throw new NotFoundException('User not found');

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: { ...dto },
    });

    return {
      msg: 'User updated successfully',
      data: this.responseUser(user),
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('user not found');

    await this.prismaService.user.delete({ where: { id: userId } });

    return {
      msg: 'User deleted successfully',
      data: '',
    };
  }

  private responseUser = (user: any) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      image: user.image,
      signature: user.signature,
      role: {
        id: user.role.id,
        name: user.role.name,
        status: user.role.status,
      },
    };
  };
}
