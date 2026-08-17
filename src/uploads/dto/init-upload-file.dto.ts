import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';


export class InitUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  size: number;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
