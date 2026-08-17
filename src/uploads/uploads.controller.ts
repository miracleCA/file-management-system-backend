import { Controller, Param, Post, Req, UseGuards, Body } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InitUploadDto } from './dto/init-upload-file.dto';


@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  @Post('init')
  init(@Req() req: any, @Body() dto: InitUploadDto) {
    return this.uploadsService.init(req.user.id, dto);
  }

  @Post(':id/complete')
  complete(@Req() req: any, @Param('id') fileId: string) {
    return this.uploadsService.complete(req.user.id, fileId);
  }
}

