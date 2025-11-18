import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminRoleGuard } from '../../common/guards/super-admin-role.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminRoleGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide statistics (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'System statistics retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (default: 30)',
  })
  async getRevenueStats(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.adminService.getRevenueStats(days);
  }

  @Get('tenant-activity')
  @ApiOperation({ summary: 'Get tenant activity (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant activity retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of tenants to return (default: 10)',
  })
  async getTenantActivity(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getTenantActivity(limit);
  }
}
