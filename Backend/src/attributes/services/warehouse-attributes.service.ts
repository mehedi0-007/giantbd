import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBulkRacksDTO,
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

    const isExist = await this.prisma.warehouse.findFirst({
      where: { code: cleanCode, status: { not: 'DELETED' } },
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

    const where: any = {
      status: { not: 'DELETED' },
    };

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
            where: { status: { not: 'DELETED' } },
            include: {
              subZones: {
                where: { status: { not: 'DELETED' } },
                include: {
                  racks: {
                    where: { status: { not: 'DELETED' } },
                  },
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
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        zones: {
          where: { status: { not: 'DELETED' } },
          include: {
            subZones: {
              where: { status: { not: 'DELETED' } },
              include: {
                racks: {
                  where: { status: { not: 'DELETED' } },
                },
              },
            },
          },
        },
        locations: {
          where: { status: { not: 'DELETED' } },
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
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (dto.code && dto.code.trim().toUpperCase() !== warehouse.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const isExist = await this.prisma.warehouse.findFirst({
        where: {
          code: cleanCode,
          id: { not: id },
          status: { not: 'DELETED' },
        },
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
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.updateMany({
        where: { warehouseId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.zone.updateMany({
        where: { warehouseId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.warehouse.update({
        where: { id },
        data: { status: 'DELETED' },
      }),
    ]);

    return { message: `Warehouse '${warehouse.name}' soft-deleted successfully` };
  }

  async createZone(dto: CreateZoneDTO) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, status: { not: 'DELETED' } },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.zone.findFirst({
      where: {
        warehouseId: dto.warehouseId,
        code: cleanCode,
        status: { not: 'DELETED' },
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

    const where: any = {
      status: { not: 'DELETED' },
    };

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
          subZones: {
            where: { status: { not: 'DELETED' } },
          },
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
    const zone = await this.prisma.zone.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        warehouse: true,
        subZones: {
          where: { status: { not: 'DELETED' } },
          include: {
            racks: { where: { status: { not: 'DELETED' } } },
          },
        },
        locations: { where: { status: { not: 'DELETED' } } },
      },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    return { data: zone };
  }

  async updateZone(id: string, dto: UpdateZoneDTO) {
    const zone = await this.prisma.zone.findFirst({
      where: { id, status: { not: 'DELETED' } },
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
    const zone = await this.prisma.zone.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.updateMany({
        where: { zoneId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.subZone.updateMany({
        where: { zoneId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.zone.update({
        where: { id },
        data: { status: 'DELETED' },
      }),
    ]);

    return { message: `Zone '${zone.name}' soft-deleted successfully` };
  }

  async createSubZone(dto: CreateSubZoneDTO) {
    const zone = await this.prisma.zone.findFirst({
      where: { id: dto.zoneId, status: { not: 'DELETED' } },
      include: { warehouse: true },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.subZone.findFirst({
      where: {
        zoneId: dto.zoneId,
        code: cleanCode,
        status: { not: 'DELETED' },
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

    const where: any = {
      status: { not: 'DELETED' },
    };

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
          racks: { where: { status: { not: 'DELETED' } } },
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
    const subZone = await this.prisma.subZone.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        zone: { include: { warehouse: true } },
        racks: { where: { status: { not: 'DELETED' } } },
        locations: { where: { status: { not: 'DELETED' } } },
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    return { data: subZone };
  }

  async updateSubZone(id: string, dto: UpdateSubZoneDTO) {
    const subZone = await this.prisma.subZone.findFirst({
      where: { id, status: { not: 'DELETED' } },
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
    const subZone = await this.prisma.subZone.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.updateMany({
        where: { subZoneId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.rack.updateMany({
        where: { subZoneId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.subZone.update({
        where: { id },
        data: { status: 'DELETED' },
      }),
    ]);

    return { message: `SubZone '${subZone.name}' soft-deleted successfully` };
  }

  async createRack(dto: CreateRackDTO) {
    const subZone = await this.prisma.subZone.findFirst({
      where: { id: dto.subZoneId, status: { not: 'DELETED' } },
      include: {
        zone: { include: { warehouse: true } },
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.rack.findFirst({
      where: {
        subZoneId: dto.subZoneId,
        code: cleanCode,
        status: { not: 'DELETED' },
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
          status: 'ACTIVE',
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

  async createBulkRacks(dto: CreateBulkRacksDTO) {
    const subZone = await this.prisma.subZone.findFirst({
      where: { id: dto.subZoneId, status: { not: 'DELETED' } },
      include: {
        zone: { include: { warehouse: true } },
      },
    });

    if (!subZone) {
      throw new NotFoundException('SubZone not found');
    }

    const count = Number(dto.count);
    if (!count || count < 1 || count > 100) {
      throw new BadRequestException('Count must be between 1 and 100');
    }

    const startIndex = Number(dto.startIndex) || 1;
    const namePrefix = (dto.prefix || 'Rack').trim();
    const codePrefix = (dto.codePrefix || 'R').trim().toUpperCase();

    // Check existing racks in this subzone
    const existingRacks = await this.prisma.rack.findMany({
      where: {
        subZoneId: dto.subZoneId,
        status: { not: 'DELETED' },
      },
      select: { code: true },
    });
    const existingCodeSet = new Set(existingRacks.map((r) => r.code.toUpperCase()));

    const racksToCreate: Array<{ name: string; code: string; locationBarcode: string; locationName: string }> = [];

    for (let i = 0; i < count; i++) {
      const num = startIndex + i;
      const paddedNum = num < 10 ? `0${num}` : `${num}`;
      const rackName = `${namePrefix} ${paddedNum}`;
      const rackCode = `${codePrefix}${paddedNum}`;

      if (existingCodeSet.has(rackCode)) {
        throw new ConflictException(
          `Rack with code '${rackCode}' already exists in subzone '${subZone.name}'`,
        );
      }

      const locationBarcode = `${subZone.zone.warehouse.code}-${subZone.zone.code}-${subZone.code}-${rackCode}`;
      const locationName = `${subZone.zone.warehouse.name} > ${subZone.zone.name} > ${subZone.name} > ${rackName}`;

      racksToCreate.push({
        name: rackName,
        code: rackCode,
        locationBarcode,
        locationName,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const createdRacks = [];

      for (const item of racksToCreate) {
        const rack = await tx.rack.create({
          data: {
            name: item.name,
            code: item.code,
            subZoneId: dto.subZoneId,
          },
          include: {
            subZone: {
              include: { zone: { include: { warehouse: true } } },
            },
          },
        });

        await tx.storageLocation.upsert({
          where: { code: item.locationBarcode },
          update: {
            name: item.locationName,
            warehouseId: subZone.zone.warehouse.id,
            zoneId: subZone.zone.id,
            subZoneId: subZone.id,
            rackId: rack.id,
            status: 'ACTIVE',
          },
          create: {
            code: item.locationBarcode,
            name: item.locationName,
            warehouseId: subZone.zone.warehouse.id,
            zoneId: subZone.zone.id,
            subZoneId: subZone.id,
            rackId: rack.id,
          },
        });

        createdRacks.push(rack);
      }

      return {
        message: `Successfully created ${createdRacks.length} racks with storage bin locations`,
        count: createdRacks.length,
        data: createdRacks,
      };
    });
  }

  async findAllRacks(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

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
          locations: { where: { status: { not: 'DELETED' } } },
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
    const rack = await this.prisma.rack.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        subZone: {
          include: {
            zone: { include: { warehouse: true } },
          },
        },
        locations: {
          where: { status: { not: 'DELETED' } },
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
    const rack = await this.prisma.rack.findFirst({
      where: { id, status: { not: 'DELETED' } },
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
    const rack = await this.prisma.rack.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    await this.prisma.$transaction([
      this.prisma.storageLocation.updateMany({
        where: { rackId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.rack.update({
        where: { id },
        data: { status: 'DELETED' },
      }),
    ]);

    return { message: `Rack '${rack.name}' soft-deleted successfully` };
  }

  async findAllLocations(query: QueryLocationDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

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
    const location = await this.prisma.storageLocation.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        status: { not: 'DELETED' },
      },
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
    const location = await this.prisma.storageLocation.findFirst({
      where: { id, status: { not: 'DELETED' } },
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
