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

  async registration(
    dto: RegistrationDTO,
    files?: {
      image?: Express.Multer.File[];
      signature?: Express.Multer.File[];
    },
  ) {
    const isEmailExist = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (isEmailExist) {
      throw new ConflictException('User already exists with this email');
    }

    if (dto.phone) {
      const isPhoneExist = await this.prismaService.user.findUnique({
        where: { phone: dto.phone },
      });
      if (isPhoneExist) {
        throw new ConflictException(
          'User already exists with this phone number',
        );
      }
    }

    const hashPass = await bcrypt.hash(dto.password, 10);

    const imagePath = files?.image?.[0]?.path
      ? files.image[0].path.replace(/\\/g, '/')
      : (dto.image ?? null);
    const signaturePath = files?.signature?.[0]?.path
      ? files.signature[0].path.replace(/\\/g, '/')
      : (dto.signature ?? null);

    const newUser = await this.prismaService.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        password: hashPass,
        roleId: dto.roleId,
        gender: dto.gender,
        image: imagePath,
        signature: signaturePath,
      },
      include: {
        role: true,
      },
    });

    return {
      message: 'User created successfully',
      data: this.responseUser(newUser),
    };
  }

  async findAll(query: { page?: number; per_page?: number; search?: string }) {
    const per_page = Number(query.per_page) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        skip,
        take: per_page,
        include: {
          role: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const responseUsers = users.map((user) => this.responseUser(user));

    return {
      data: responseUsers,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      data: this.responseUser(user),
    };
  }

  async updateUser(userId: string, dto: UpdateUserDTO) {
    const isExist = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!isExist) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate: any = { ...dto };
    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.phone !== undefined) {
      dataToUpdate.phone = dto.phone || null;
    }

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        role: true,
      },
    });

    return {
      message: 'User updated successfully',
      data: this.responseUser(user),
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  private responseUser = (user: any) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      status: user.status,
      image: user.image,
      signature: user.signature,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            status: user.role.status,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };
}
