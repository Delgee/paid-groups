import { IsEmail, IsString, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'Valid email address, unique within tenant',
    example: 'admin@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password with minimum 8 characters including uppercase, lowercase, and number',
    example: 'SecurePass123',
    minLength: 8
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
  )
  password: string;

  @ApiProperty({
    description: 'Full name, 2-100 characters',
    example: 'John Administrator',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Matches(
    /^[a-zA-Z0-9\s\-]+$/,
    { message: 'Name can only contain letters, numbers, spaces, and hyphens' }
  )
  name: string;

  @ApiProperty({
    description: 'Role to assign to the new user',
    enum: UserRole,
    example: UserRole.ADMIN
  })
  @IsEnum(UserRole, { message: 'Role must be either admin or moderator' })
  role: UserRole;
}