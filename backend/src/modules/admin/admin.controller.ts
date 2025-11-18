import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminRoleGuard } from '../../common/guards/super-admin-role.guard';
import { AdminService } from './admin.service';

// Validation constants
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminRoleGuard)
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get system-wide statistics (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'System statistics retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('revenue')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get revenue statistics (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid days parameter (must be between 1-365)',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (1-365, default: 30)',
  })
  async getRevenueStats(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    // Validate input
    if (days < MIN_DAYS || days > MAX_DAYS) {
      throw new Error(`Days must be between ${MIN_DAYS} and ${MAX_DAYS}`);
    }
    return this.adminService.getRevenueStats(days);
  }

  @Get('tenant-activity')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120000) // Cache for 2 minutes
  @ApiOperation({ summary: 'Get tenant activity (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant activity retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid limit parameter (must be between 1-100)',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of tenants to return (1-100, default: 10)',
  })
  async getTenantActivity(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Validate input
    if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
      throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
    }
    return this.adminService.getTenantActivity(limit);
  }
}
