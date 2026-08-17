import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';

import { PrismaService } from 'prisma/prisma.service';
import { FolderTreeResponseDto } from './dto/folder-tree-response.dto';
import { FolderTreeNodeDto } from './dto/folder-tree-node.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) { }

  private async getOwnedFolder(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  private async getDescendantIds(folderId: string): Promise<string[]> {
    const children = await this.prisma.folder.findMany({
      where: {
        parentId: folderId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const result: string[] = [];

    for (const child of children) {
      result.push(child.id);

      const descendants = await this.getDescendantIds(child.id);

      result.push(...descendants);
    }

    return result;
  }

  private buildBreadcrumbs(
    folders: {
      id: string;
      name: string;
      parentId: string | null;
    }[],
    currentFolder: {
      id: string;
      name: string;
      parentId: string | null;
    },
  ) {
    const folderMap = new Map(folders.map((item) => [item.id, item]));

    const breadcrumbs: {
      id: string;
      name: string;
    }[] = [];

    let current:
      | {
        id: string;
        name: string;
        parentId: string | null;
      }
      | undefined = currentFolder;

    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
      });

      if (!current.parentId) {
        break;
      }

      current = folderMap.get(current.parentId);
    }

    return breadcrumbs;
  }



  async create(userId: string, dto: CreateFolderDto) {
    if (dto.parentId) {
      await this.getOwnedFolder(userId, dto.parentId);
    }

    const existing = await this.prisma.folder.findFirst({
      where: {
        userId,
        name: dto.name.trim(),
        parentId: dto.parentId ?? null,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A folder with this name already exists here',
      );
    }

    return this.prisma.folder.create({
      data: {
        name: dto.name.trim(),
        userId,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async getRoot(userId: string) {
    const [folders, files] = await this.prisma.$transaction([
      this.prisma.folder.findMany({
        where: {
          userId,
          parentId: null,
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.file.findMany({
        where: {
          userId,
          folderId: null,
          deletedAt: null,
          status: 'READY',
        },
        orderBy: {
          filename: 'asc',
        },
      }),
    ]);

    return {
      folder: null,
      breadcrumbs: [],
      folders,
      files,
    };
  }

  async getFolder(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);

    const [folders, files, allFolders] = await this.prisma.$transaction([
      this.prisma.folder.findMany({
        where: {
          userId,
          parentId: folderId,
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.file.findMany({
        where: {
          userId,
          folderId,
          deletedAt: null,
          status: 'READY',
        },
        orderBy: {
          filename: 'asc',
        },
      }),

      this.prisma.folder.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      }),
    ]);

    const breadcrumbs = this.buildBreadcrumbs(allFolders, folder);

    return {
      folder,
      breadcrumbs,
      folders,
      files,
    };
  }

  async getTree(userId: string): Promise<FolderTreeResponseDto> {
    const folders = await this.prisma.folder.findMany({
      where: {
        userId,
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        name: 'asc',
      },
    });

    const folderMap = new Map<string, FolderTreeNodeDto>();

    for (const folder of folders) {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        children: [],
      });
    }

    const roots: FolderTreeNodeDto[] = [];

    for (const folder of folderMap.values()) {
      if (!folder.parentId) {
        roots.push(folder);
        continue;
      }

      const parent = folderMap.get(folder.parentId);

      if (parent) {
        parent.children.push(folder);
      }
    }

    return {
      folders: roots,
    };
  }

  async update(userId: string, folderId: string, dto: UpdateFolderDto) {
    const folder = await this.getOwnedFolder(userId, folderId);

    const existing = await this.prisma.folder.findFirst({
      where: {
        userId,
        name: dto.name.trim(),
        parentId: folder.parentId,
        deletedAt: null,
        id: {
          not: folderId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A folder with this name already exists here',
      );
    }

    return this.prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        name: dto.name.trim(),
      },
    });
  }

  async move(userId: string, folderId: string, dto: MoveFolderDto) {
    const folder = await this.getOwnedFolder(userId, folderId);

    const destinationId = dto.parentId ?? null;

    if (destinationId === folder.id) {
      throw new BadRequestException('A folder cannot be moved inside itself');
    }

    if (destinationId) {
      const destination = await this.getOwnedFolder(userId, destinationId);

      const descendants = await this.getDescendantIds(folder.id);

      if (descendants.includes(destination.id)) {
        throw new BadRequestException(
          'A folder cannot be moved inside one of its descendants',
        );
      }
    }

    if (folder.parentId === destinationId) {
      return folder;
    }

    return this.prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        parentId: destinationId,
      },
    });
  }

  async remove(userId: string, folderId: string) {
    await this.getOwnedFolder(userId, folderId);

    const descendantIds = await this.getDescendantIds(folderId);

    const folderIds = [folderId, ...descendantIds];

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: {
          id: {
            in: folderIds,
          },
          userId,
        },
        data: {
          deletedAt: now,
        },
      }),

      this.prisma.file.updateMany({
        where: {
          folderId: {
            in: folderIds,
          },
          userId,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
        },
      }),
    ]);

    return {
      message: 'Folder deleted successfully',
    };
  }
}
