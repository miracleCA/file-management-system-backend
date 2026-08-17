import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { SearchService } from './search.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchDto } from './dto/create-search.dto';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Get()
  search(@Req() req: any, @Query() dto: SearchDto) {
    return this.searchService.search(req.user.id, dto.q);
  }
}
