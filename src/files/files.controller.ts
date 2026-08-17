import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateFileDto } from './dto/update-file.dto';
import { MoveFileDto } from 'src/uploads/dto/move-file.dto';



@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.update(req.user.id, fileId, dto);
  }

  @Patch(':id/move')
  move(@Req() req: any, @Param('id') fileId: string, @Body() dto: MoveFileDto) {
    return this.filesService.move(req.user.id, fileId, dto);
  }

  @Get(':id/download')
  download(@Req() req: any, @Param('id') fileId: string) {
    return this.filesService.createDownloadUrl(req.user.id, fileId);
  }

  @Get(':id/share')
  getShare(@Req() req: any, @Param('id') fileId: string) {
    return this.filesService.getActiveShare(req.user.id, fileId);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') fileId: string) {
    return this.filesService.remove(req.user.id, fileId);
  }
}
