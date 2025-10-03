import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

import { UserRole } from '../../auth/entities/user.entity';
import { PaginationDto } from '../../../common/dto';

export type AllUserRoles = UserRole.OWNER | UserRole.ADMIN | UserRole.MODERATOR;

export class GetUsersQueryDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be a positive integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be a positive integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit: number = 20;

  @ApiProperty({
    description: 'Filter by user role',
    enum: [UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR],
    required: false,
  })
  @IsOptional()
  @IsEnum([UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR], {
    message: 'Role must be owner, admin, or moderator',
  })
  role?: AllUserRoles;
}

export class UserSummaryDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'admin@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Administrator',
  })
  name: string;

  @ApiProperty({
    description: 'Role of the user',
    enum: [UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR],
    example: UserRole.ADMIN,
  })
  role: AllUserRoles;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp of last login, null if never logged in',
    example: '2025-09-14T09:15:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  lastLoginAt: string | null;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2025-09-10T14:20:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}

export class GetUsersResponseDto {
  @ApiProperty({
    description: 'Array of user summaries',
    type: [UserSummaryDto],
  })
  users: UserSummaryDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
