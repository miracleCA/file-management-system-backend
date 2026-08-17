import { Module } from '@nestjs/common';

import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { FileStorageModule } from 'src/file-storage/file-storage.module';
import { FileStorageService } from 'src/file-storage/file-storage.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [FileStorageModule],

  controllers: [SharesController],

  providers: [SharesService, PrismaService, FileStorageService],

  exports: [SharesService],
})
export class SharesModule {}
