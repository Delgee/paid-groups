import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService, DashboardMetrics, RevenueMetrics, MembershipMetrics } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics including MRR, churn rate, and top groups' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
  })
  async getDashboardMetrics(
    @Request() req: any,
  ): Promise<DashboardMetrics> {
    const tenantId = req.user.tenant_id;
    return this.analyticsService.getDashboardMetrics(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue metrics including MRR, ARR, and daily revenue' })
  @ApiResponse({
    status: 200,
    description: 'Revenue metrics retrieved successfully',
  })
  async getRevenueMetrics(
    @Request() req: any,
    @Query('days') days?: string,
  ): Promise<RevenueMetrics> {
    const tenantId = req.user.tenant_id;
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getRevenueMetrics(tenantId, daysNumber);
  }

  @Get('memberships')
  @ApiOperation({ summary: 'Get membership metrics including churn rate and lifetime value' })
  @ApiResponse({
    status: 200,
    description: 'Membership metrics retrieved successfully',
  })
  async getMembershipMetrics(
    @Request() req: any,
  ): Promise<MembershipMetrics> {
    const tenantId = req.user.tenant_id;
    return this.analyticsService.getMembershipMetrics(tenantId);
  }
}
