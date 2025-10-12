import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTelegramGroupsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: '9b8026d1-6e85-45e5-8d82-292dde377e8e',
  })
  @IsOptional()
  @IsUUID('4')
  project_id?: string;
}