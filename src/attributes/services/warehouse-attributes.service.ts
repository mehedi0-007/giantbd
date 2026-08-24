import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRackDTO,
  CreateSubZoneDTO,
  CreateWarehouseDTO,
  CreateZoneDTO,
  QueryLocationDTO,
  UpdateRackDTO,
  UpdateSubZoneDTO,
  UpdateWarehouseDTO,
  UpdateZoneDTO,
} from '../dto/warehouse-attribute.dto';
import { PaginationQueryDTO } from '../../common';

@Injectable()
export class WarehouseAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWarehouse(dto: CreateWarehouseDTO) {
    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.warehouse.findUnique({
      where: { code: cleanCode },
    });

    if (isExist) {
      throw new ConflictException(`Warehouse with code '${cleanCode}' already exists`);
    }

    return this.prisma.warehouse.create({
      data: {
        name: dto.name.trim(),
        code: cleanCode,
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async findAllWarehouses(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, warehouses] = await Promise.all([
      this.prisma.warehouse.count({ where }),
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: per_page,
        include: {
          zones: {
            include: {
              subZones: {
                include: {
                  racks: true,
                },
              },
            },
          },
          _count: {
            select: {
              zones: true,
              locations: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: warehouses,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findWarehouseById(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        zones: {
          include: {
            subZones: {
              include: {
                racks: true,
              },
            },
          },
        },
        locations: {
          include: {
            _count: { select: { batchItems: true } },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return { data: warehouse };
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDTO) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (dto.code && dto.code.trim().toUpperCase() !== warehouse.code) {
      const isExist = await this.prisma.warehouse.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (isExist) {
        throw new ConflictException(`Warehouse code '${dto.code}' is already taken`);
      }
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deleteWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            _count: { select: { batchItems: true } },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const hasStock = warehouse.locations.some((loc) => loc._count.batchItems > 0);
    if (hasStock) {
      throw new BadRequestException(
        `Cannot delete warehouse '${warehouse.name}'. It contains active inventory in its storage locations.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.deleteMany({ where: { warehouseId: id } }),
      this.prisma.warehouse.delete({ where: { id } }),
    ]);

    return { message: `Warehouse '${warehouse.name}' deleted successfully` };
  }

  async createZone(dto: CreateZoneDTO) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.zone.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: dto.warehouseId,
          code: cleanCode,
        },
      },
    });

    if (isExist) {
      throw new ConflictException(
        `Zone with code '${cleanCode}' already exists in warehouse '${warehouse.name}'`,
      );
    }

    return this.prisma.zone.create({
      data: {
        name: dto.name.trim(),
        code: cleanCode,
        warehouseId: dto.warehouseId,
        description: dto.description?.trim() ?? null,
      },
      include: {
        warehouse: true,
      },
    });
  }

  async findAllZones(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, zones] = await Promise.all([
      this.prisma.zone.count({ where }),
      this.prisma.zone.findMany({
        where,
        skip,
        take: per_page,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          subZones: true,
          _count: {
            select: { subZones: true, locations: true },
          },
        },
        orderBy: [{ warehouseId: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      data: zones,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findZoneById(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        warehouse: true,
        subZones: {
          include: { racks: true },
        },
        locations: true,
      },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    return { data: zone };
  }

  async updateZone(id: string, dto: UpdateZoneDTO) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.warehouseId && { warehouseId: dto.warehouseId }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        warehouse: true,
      },
    });
  }

  async deleteZone(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            _count: { select: { batchItems: true } },
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const hasStock = zone.locations.some((loc) => loc._count.batchItems > 0);
    if (hasStock) {
      throw new BadRequestException(
        `Cannot delete zone '${zone.name}'. It contains active inventory in its storage locations.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.deleteMany({ where: { zoneId: id } }),
      this.prisma.zone.delete({ where: { id } }),
    ]);

    return { message: `Zone '${zone.name}' deleted successfully` };
  }

  async createSubZone(dto: CreateSubZoneDTO) {
    const zone = await this.prisma.zone.findUnique({
      where: { id: dto.zoneId },
      include: { warehouse: true },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.subZone.findUnique({
      where: {
        zoneId_code: {
          zoneId: dto.zoneId,
          code: cleanCode,
        },
      },
    });

    if (isExist) {
      throw new ConflictException(
        `SubZone with code '${cleanCode}' already exists in zone '${zone.name}'`,
      );
    }

    return this.prisma.subZone.create({
      data: {
        name: dto.name.trim(),
        code: cleanCode,
        zoneId: dto.zoneId,
        description: dto.description?.trim() ?? null,
      },
      include: {
        zone: { include: { warehouse: true } },
      },
    });
  }

  async findAllSubZones(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, subZones] = await Promise.all([
      this.prisma.subZone.count({ where }),
      this.prisma.subZone.findMany({
        where,
        skip,
        take: per_page,
        include: {
          zone: {
            include: { warehouse: { select: { id: true, name: true, code: true } } },
          },
          racks: true,
          _count: {
            select: { racks: true, locations: true },
          },
        },
        orderBy: [{ zoneId: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      data: subZones,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findSubZoneById(id: string) {
    const subZone = await this.prisma.subZone.findUnique({
      where: { id },
      include: {
        zone: { include: { warehouse: true } },
        racks: true,
        locations: true,
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    return { data: subZone };
  }

  async updateSubZone(id: string, dto: UpdateSubZoneDTO) {
    const subZone = await this.prisma.subZone.findUnique({
      where: { id },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    return this.prisma.subZone.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.zoneId && { zoneId: dto.zoneId }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        zone: true,
      },
    });
  }

  async deleteSubZone(id: string) {
    const subZone = await this.prisma.subZone.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            _count: { select: { batchItems: true } },
          },
        },
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    const hasStock = subZone.locations.some((loc) => loc._count.batchItems > 0);
    if (hasStock) {
      throw new BadRequestException(
        `Cannot delete subzone '${subZone.name}'. It contains active inventory in its storage locations.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.deleteMany({ where: { subZoneId: id } }),
      this.prisma.subZone.delete({ where: { id } }),
    ]);

    return { message: `SubZone '${subZone.name}' deleted successfully` };
  }

  async createRack(dto: CreateRackDTO) {
    const subZone = await this.prisma.subZone.findUnique({
      where: { id: dto.subZoneId },
      include: {
        zone: { include: { warehouse: true } },
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.rack.findUnique({
      where: {
        subZoneId_code: {
          subZoneId: dto.subZoneId,
          code: cleanCode,
        },
      },
    });

    if (isExist) {
      throw new ConflictException(
        `Rack with code '${cleanCode}' already exists in subzone '${subZone.name}'`,
      );
    }

    const locationBarcode = `${subZone.zone.warehouse.code}-${subZone.zone.code}-${subZone.code}-${cleanCode}`;
    const locationName = `${subZone.zone.warehouse.name} > ${subZone.zone.name} > ${subZone.name} > ${dto.name.trim()}`;

    return this.prisma.$transaction(async (tx) => {
      const rack = await tx.rack.create({
        data: {
          name: dto.name.trim(),
          code: cleanCode,
          subZoneId: dto.subZoneId,
          description: dto.description?.trim() ?? null,
        },
        include: {
          subZone: {
            include: { zone: { include: { warehouse: true } } },
          },
        },
      });

      // Auto-create unified StorageLocation
      await tx.storageLocation.upsert({
        where: { code: locationBarcode },
        update: {
          name: locationName,
          warehouseId: subZone.zone.warehouse.id,
          zoneId: subZone.zone.id,
          subZoneId: subZone.id,
          rackId: rack.id,
        },
        create: {
          code: locationBarcode,
          name: locationName,
          warehouseId: subZone.zone.warehouse.id,
          zoneId: subZone.zone.id,
          subZoneId: subZone.id,
          rackId: rack.id,
        },
      });

      return rack;
    });
  }

  async findAllRacks(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, racks] = await Promise.all([
      this.prisma.rack.count({ where }),
      this.prisma.rack.findMany({
        where,
        skip,
        take: per_page,
        include: {
          subZone: {
            include: {
              zone: {
                include: { warehouse: { select: { id: true, name: true, code: true } } },
              },
            },
          },
          locations: true,
        },
        orderBy: [{ subZoneId: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      data: racks,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findRackById(id: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id },
      include: {
        subZone: {
          include: {
            zone: { include: { warehouse: true } },
          },
        },
        locations: {
          include: {
            batchItems: {
              include: {
                product: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    return { data: rack };
  }

  async updateRack(id: string, dto: UpdateRackDTO) {
    const rack = await this.prisma.rack.findUnique({
      where: { id },
      include: {
        subZone: {
          include: { zone: { include: { warehouse: true } } },
        },
      },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    return this.prisma.rack.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.subZoneId && { subZoneId: dto.subZoneId }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        subZone: {
          include: { zone: { include: { warehouse: true } } },
        },
        locations: true,
      },
    });
  }

  async deleteRack(id: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            _count: { select: { batchItems: true } },
          },
        },
      },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    const hasStock = rack.locations.some((loc) => loc._count.batchItems > 0);
    if (hasStock) {
      throw new BadRequestException(
        `Cannot delete rack '${rack.name}'. It contains active inventory in its storage locations.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.deleteMany({ where: { rackId: id } }),
      this.prisma.rack.delete({ where: { id } }),
    ]);

    return { message: `Rack '${rack.name}' deleted successfully` };
  }

  async findAllLocations(query: QueryLocationDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.subZoneId) where.subZoneId = query.subZoneId;
    if (query.rackId) where.rackId = query.rackId;
    if (query.status) where.status = query.status;

    const [total, locations] = await Promise.all([
      this.prisma.storageLocation.count({ where }),
      this.prisma.storageLocation.findMany({
        where,
        skip,
        take: per_page,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          subZone: { select: { id: true, name: true, code: true } },
          rack: { select: { id: true, name: true, code: true } },
          _count: {
            select: { batchItems: true },
          },
        },
        orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
      }),
    ]);

    return {
      data: locations,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findLocationByBarcode(code: string) {
    const location = await this.prisma.storageLocation.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        warehouse: true,
        zone: true,
        subZone: true,
        rack: true,
        batchItems: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Storage location with barcode '${code}' not found`);
    }

    return { data: location };
  }

  async findLocationById(id: string) {
    const location = await this.prisma.storageLocation.findUnique({
      where: { id },
      include: {
        warehouse: true,
        zone: true,
        subZone: true,
        rack: true,
        batchItems: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Storage location not found');
    }

    return { data: location };
  }
}
