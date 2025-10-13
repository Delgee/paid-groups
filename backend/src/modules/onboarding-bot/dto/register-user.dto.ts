import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ description: 'Telegram user ID', example: 987654321 })
  @IsNumber()
  @IsNotEmpty()
  telegram_user_id: number;

  @ApiProperty({ description: 'Telegram chat ID', example: 987654321 })
  @IsNumber()
  @IsNotEmpty()
  telegram_chat_id: number;

  @ApiProperty({ description: 'Telegram username', example: 'testuser', required: false })
  @IsString()
  @IsOptional()
  telegram_username?: string;

  @ApiProperty({ description: 'Telegram first name', example: 'Test', required: false })
  @IsString()
  @IsOptional()
  telegram_first_name?: string;

  @ApiProperty({ description: 'Telegram last name', example: 'User', required: false })
  @IsString()
  @IsOptional()
  telegram_last_name?: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Company or project name', example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({ description: 'Correlation ID for tracing' })
  @IsString()
  @IsNotEmpty()
  correlation_id: string;
}
