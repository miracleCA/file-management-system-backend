import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShareDto } from './dto/create-share.dto';
import { ShareResponseDto } from './dto/share-response-dto';
import { SharedFileResponseDto } from './dto/share-file-response.dto';



@Controller()
export class SharesController {
  constructor(private readonly sharesService: SharesService) { }


  @UseGuards(JwtAuthGuard)
  @Post('files/:id/share')
  createShare(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: CreateShareDto,
  ): Promise<ShareResponseDto> {
    return this.sharesService.createShare(req.user.id, fileId, dto);
  }

  @Get('share/:token')
  getSharedFile(@Param('token') token: string): Promise<SharedFileResponseDto> {
    return this.sharesService.getSharedFile(token);
  }
}
