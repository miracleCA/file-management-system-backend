import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { FileStorageModule } from 'src/file-storage/file-storage.module';


@Module({
  imports: [FileStorageModule],
  controllers: [UploadsController],
  providers: [UploadsService]
})
export class UploadsModule { }
