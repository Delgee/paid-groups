import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for QPay token request
 */
export class QPayTokenRequestDto {
  @ApiProperty({
    description: 'Terminal ID provided by QPay',
    example: '95000059',
  })
  @IsString()
  @IsNotEmpty()
  terminal_id: string;
}

/**
 * DTO for QPay token response
 */
export class QPayTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'refresh_token_here',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expires_in: number;
}
