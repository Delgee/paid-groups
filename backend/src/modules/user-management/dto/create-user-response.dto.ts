import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../auth/entities/user.entity';

export class CreateUserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the created user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the created user',
    example: 'admin@example.com',
    format: 'email'
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the created user',
    example: 'John Administrator'
  })
  name: string;

  @ApiProperty({
    description: 'Role assigned to the user',
    enum: UserRole,
    example: UserRole.ADMIN
  })
  role: UserRole;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2025-09-14T10:30:00.000Z',
    format: 'date-time'
  })
  createdAt: string;
}