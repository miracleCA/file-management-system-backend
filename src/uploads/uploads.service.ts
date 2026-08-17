import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "prisma/prisma.service";
import { InitUploadDto } from "./dto/init-upload-file.dto";
import { FileStorageService } from "src/file-storage/file-storage.service";
import { isAllowedFileType } from "src/helpers/allowedType";



@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService
  ) { }

  private async simulateValidation() {
    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          3000,
        );
      },
    );
  }

  private async markUploadFailed(
    fileId: string,
  ) {
    await this.prisma.file.update({
      where: {
        id: fileId,
      },

      data: {
        status: "FAILED",
      },
    });
  }



  async init(userId: string, dto: InitUploadDto) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (dto.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        "File size cannot exceed 10 MB",
      );
    }

    if (!isAllowedFileType(dto.contentType)) {
      throw new BadRequestException(
        "Only PDF, JPEG, PNG, GIF and WebP files are allowed",
      );
    }

    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: dto.folderId,
          userId,
          deletedAt: null,
        },
      });

      if (!folder) {
        throw new NotFoundException(
          "Folder not found",
        );
      }
    }

    const fileId = randomUUID();

    const storageKey =
      `users/${userId}/files/${fileId}`;

    const file =
      await this.prisma.file.create({
        data: {
          id: fileId,
          userId,
          folderId:
            dto.folderId ?? null,
          filename: dto.filename,
          size: BigInt(dto.size),
          contentType: dto.contentType,
          storageKey,
          status: "PENDING",
        },
      });

    try {
      const uploadUrl =
        await this.fileStorageService.createUploadUrl(
          storageKey,
          dto.contentType,
        );

      return {
        uploadId: file.id,
        uploadUrl,
      };
    } catch {
      await this.prisma.file.update({
        where: {
          id: file.id,
        },
        data: {
          status: "FAILED",
        },
      });

      throw new BadRequestException(
        "Unable to initialize file upload",
      );
    }
  }

  async complete(userId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(
        "Uploaded file details not found",
      );
    }

    if (file.status !== "PENDING") {
      throw new BadRequestException(
        `Upload cannot be completed because it is already ${file.status}`,
      );
    }

    const metadata = await this.fileStorageService.getQuarantineObjectMetadata(file.storageKey);

    if (!metadata) {
      throw new BadRequestException(
        "File was not found in storage",
      );
    }

    if (
      metadata.ContentType &&
      metadata.ContentType !== file.contentType
    ) {
      throw new BadRequestException(
        "Uploaded file type does not match the expected file type",
      );
    }


    if (!metadata) {
      await this.markUploadFailed(
        file.id,
      );

      throw new BadRequestException(
        "File was not found in quarantine storage",
      );
    }


    if (metadata.ContentLength !== undefined && BigInt(metadata.ContentLength) !== file.size) {
      await this.markUploadFailed(
        file.id,
      );

      throw new BadRequestException(
        "Uploaded file size does not match the expected size",
      );
    }

    await this.simulateValidation();


    try {

      await this.fileStorageService.promoteToProduction(
        file.storageKey,
      );

      await this.fileStorageService.deleteQuarantineObject(
        file.storageKey,
      );
      const updated = await this.prisma.file.update({
        where: {
          id: file.id,
        },

        data: {
          status: "READY",
        },
      });


      return {
        id: updated.id,
        filename: updated.filename,
        size: updated.size.toString(),
        contentType: updated.contentType,
        status: updated.status,
      };
    } catch (error) {

      await this.markUploadFailed(
        file.id,
      );

      throw new BadRequestException(
        "File validation failed and could not be moved to production storage",
      );
    }
  }

}






