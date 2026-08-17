import { PartialType } from '@nestjs/mapped-types';
import { SearchDto } from './create-search.dto';

export class UpdateSearchDto extends PartialType(SearchDto) { }
