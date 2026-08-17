import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateFileDto } from './dto/update-file.dto';
import { PrismaService } from 'prisma/prisma.service';
import { MoveFileDto } from 'src/uploads/dto/move-file.dto';
import { FileStorageService } from 'src/file-storage/file-storage.service';



@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) { }

  async update(userId: string, fileId: string, dto: UpdateFileDto) {
    await this.getOwnedFile(userId, fileId);
    return this.prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        filename: dto.name,
      },
    });
  }

  async move(userId: string, fileId: string, dto: MoveFileDto) {
    await this.getOwnedFile(userId, fileId);

    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: dto.folderId,
          userId,
          deletedAt: null,
        },
      });

      if (!folder) throw new NotFoundException('Destination folder not found');
    }

    return this.prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        folderId: dto.folderId ?? null,
      },
    });
  }

  async remove(userId: string, fileId: string) {
    await this.getOwnedFile(userId, fileId);

    await this.prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'File deleted successfully',
    };
  }

  async createDownloadUrl(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);

    if (file.status !== 'READY') throw new BadRequestException('File is not ready for download');

    return {
      downloadUrl: await this.fileStorageService.createDownloadUrl(
        file.storageKey,
      ),
    };
  }

  async getActiveShare(userId: string, fileId: string) {
    await this.getOwnedFile(userId, fileId);

    const share = await this.prisma.share.findFirst({
      where: {
        fileId,
        createdById: userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!share) {
      return {
        active: false,
      };
    }

    return {
      active: true,
      expiresAt: share.expiresAt,
    };
  }

  async getOwnedFile(userId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }
}


