import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';



@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) { }


  @Post()
  create(@Req() req: any, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(req.user.id, dto);
  }


  @Get()
  getRoot(@Req() req: any) {
    return this.foldersService.getRoot(req.user.id);
  }


  @Get('tree')
  getTree(@Req() req: any) {
    return this.foldersService.getTree(req.user.id);
  }


  @Get(':id')
  getFolder(@Req() req: any, @Param('id') folderId: string) {
    return this.foldersService.getFolder(req.user.id, folderId);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(req.user.id, folderId, dto);
  }


  @Patch(':id/move')
  move(
    @Req() req: any,
    @Param('id') folderId: string,
    @Body() dto: MoveFolderDto,
  ) {
    return this.foldersService.move(req.user.id, folderId, dto);
  }


  @Delete(':id')
  remove(@Req() req: any, @Param('id') folderId: string) {
    return this.foldersService.remove(req.user.id, folderId);
  }
}

