import { Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) { }

  async search(userId: string, query: string) {
    const q = query.trim();

    if (!q) return { files: [] };

    const files = await this.prisma.file.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'READY',
        filename: {
          contains: q,
          mode: 'insensitive',
        },
      },

      orderBy: {
        filename: 'asc',
      },
    });


    return {
      files: files.map((file) => ({
        id: file.id,
        filename: file.filename,
        size: Number(file.size),
        folderId: file.folderId,
        contentType: file.contentType,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
    };
  }
}
