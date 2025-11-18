import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { TenantService, CreateTenantDto, UpdateTenantDto } from './services/tenant.service';
import { SubscriptionTier, SubscriptionStatus } from './entities/tenant.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminRoleGuard } from '../../common/guards/super-admin-role.guard';

class CreateTenantRequestDto implements CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  company_name: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscription_tier?: SubscriptionTier;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscription_status?: SubscriptionStatus;

  @IsOptional()
  @IsNumber()
  max_bots?: number;

  @IsOptional()
  @IsNumber()
  max_groups_per_bot?: number;

  @IsOptional()
  @IsNumber()
  max_members?: number;

  @IsOptional()
  settings?: Record<string, any>;
}

class UpdateTenantRequestDto implements UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscription_tier?: SubscriptionTier;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscription_status?: SubscriptionStatus;

  @IsOptional()
  @IsNumber()
  max_bots?: number;

  @IsOptional()
  @IsNumber()
  max_groups_per_bot?: number;

  @IsOptional()
  @IsNumber()
  max_members?: number;

  @IsOptional()
  settings?: Record<string, any>;
}

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Create new tenant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async create(
    @Body(ValidationPipe) createTenantDto: CreateTenantRequestDto,
  ) {
    return this.tenantService.create(createTenantDto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant info' })
  @ApiResponse({ status: 200, description: 'Current tenant info' })
  async getCurrentTenant(@Request() req) {
    return this.tenantService.findById(req.tenant_id);
  }

  @Get('current/stats')
  @ApiOperation({ summary: 'Get current tenant statistics' })
  @ApiResponse({ status: 200, description: 'Tenant statistics' })
  async getCurrentTenantStats(@Request() req) {
    return this.tenantService.getTenantStats(req.tenant_id);
  }

  @Put('current')
  @ApiOperation({ summary: 'Update current tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  async updateCurrentTenant(
    @Body(ValidationPipe) updateTenantDto: UpdateTenantRequestDto,
    @Request() req,
  ) {
    return this.tenantService.update(req.tenant_id, updateTenantDto);
  }

  @Get()
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Get all tenants (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all tenants' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async findAll(
    @Query('subscription_status') subscriptionStatus?: SubscriptionStatus,
  ) {
    if (subscriptionStatus) {
      return this.tenantService.findBySubscriptionStatus(subscriptionStatus);
    }
    return this.tenantService.findAll();
  }

  @Get(':id')
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Get tenant by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findById(id);
  }

  @Get(':id/stats')
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Get tenant statistics by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant statistics' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async getTenantStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getTenantStats(id);
  }

  @Put(':id')
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Update tenant by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTenantDto: UpdateTenantRequestDto,
  ) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminRoleGuard)
  @ApiOperation({ summary: 'Delete tenant by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.tenantService.delete(id);
    return { success: true };
  }
}