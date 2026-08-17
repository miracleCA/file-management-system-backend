import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { FileStorageService } from 'src/file-storage/file-storage.service';
import { randomBytes, createHash } from 'crypto';
import { CreateShareDto } from './dto/create-share.dto';
import { ShareResponseDto } from './dto/share-response-dto';
import { SharedFileResponseDto } from './dto/share-file-response.dto';


@Injectable()
export class SharesService {
  private readonly defaultExpiryMinutes = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) { }



  async createShare(userId: string, fileId: string, dto: CreateShareDto): Promise<ShareResponseDto> {
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

    if (file.status !== 'READY') {
      throw new BadRequestException('Only completed files can be shared');
    }

    const expiresInMinutes = dto.expiresInMinutes ?? this.defaultExpiryMinutes;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.prisma.share.deleteMany({
      where: {
        fileId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    await this.prisma.share.create({
      data: {
        fileId,
        createdById: userId,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = process.env.APP_URL ?? 'http://localhost:3001';

    return {
      token,
      expiresAt,
      shareUrl: `${frontendUrl}/share/${token}`,
    };
  }

  async getSharedFile(token: string): Promise<SharedFileResponseDto> {
    const tokenHash = this.hashToken(token);
    const share = await this.prisma.share.findFirst({
      where: {
        tokenHash,

        expiresAt: {
          gt: new Date(),
        },

        file: {
          deletedAt: null,
          status: 'READY',
        },
      },

      include: {
        file: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share link is invalid or expired');
    }

    const downloadUrl = await this.fileStorageService.createDownloadUrl(
      share.file.storageKey,
    );

    return {
      downloadUrl,
      filename: share.file.filename,
      expiresAt: share.expiresAt,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

