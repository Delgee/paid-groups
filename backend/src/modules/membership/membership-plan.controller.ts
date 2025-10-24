import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { 
  MembershipPlanService, 
  CreateMembershipPlanDto, 
  UpdateMembershipPlanDto 
} from './services/membership-plan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateMembershipPlanRequestDto implements CreateMembershipPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price_mnt: number;

  @IsNumber()
  @Min(1)
  duration_days: number;

  @IsOptional()
  features?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

class UpdateMembershipPlanRequestDto implements UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_mnt?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration_days?: number;

  @IsOptional()
  features?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

@ApiTags('Membership Plans')
@Controller('membership-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembershipPlanController {
  constructor(private readonly membershipPlanService: MembershipPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new membership plan' })
  @ApiResponse({ status: 201, description: 'Membership plan created successfully' })
  async create(
    @Request() req,
    @Body(ValidationPipe) createPlanDto: CreateMembershipPlanRequestDto,
  ) {
    const plan = await this.membershipPlanService.create(req.tenant_id, createPlanDto);
    return this.transformPlanResponse(plan);
  }

  private transformPlanResponse(plan: any) {
    return {
      ...plan,
      price: plan.price_mnt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all membership plans for tenant' })
  @ApiResponse({ status: 200, description: 'List of membership plans' })
  @ApiQuery({ name: 'include_inactive', required: false, description: 'Include inactive plans' })
  async findAll(
    @Request() req,
    @Query('include_inactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    const plans = await this.membershipPlanService.findAllByTenant(req.tenant_id, includeInactive);
    return { plans: plans.map(p => this.transformPlanResponse(p)) };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular membership plans by usage' })
  @ApiResponse({ status: 200, description: 'List of popular membership plans' })
  async getPopularPlans(@Request() req) {
    const plans = await this.membershipPlanService.getPopularPlans(req.tenant_id);
    return { plans: plans.map(p => this.transformPlanResponse(p)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get membership plan by ID' })
  @ApiResponse({ status: 200, description: 'Membership plan found' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const plan = await this.membershipPlanService.findById(req.tenant_id, id);
    return this.transformPlanResponse(plan);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get membership plan statistics' })
  @ApiResponse({ status: 200, description: 'Plan statistics' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async getPlanStats(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipPlanService.getPlanStats(req.tenant_id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update membership plan' })
  @ApiResponse({ status: 200, description: 'Membership plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updatePlanDto: UpdateMembershipPlanRequestDto,
  ) {
    const plan = await this.membershipPlanService.update(req.tenant_id, id, updatePlanDto);
    return this.transformPlanResponse(plan);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate membership plan' })
  @ApiResponse({ status: 200, description: 'Membership plan activated successfully' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async activate(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const plan = await this.membershipPlanService.activate(req.tenant_id, id);
    return this.transformPlanResponse(plan);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate membership plan' })
  @ApiResponse({ status: 200, description: 'Membership plan deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async deactivate(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const plan = await this.membershipPlanService.deactivate(req.tenant_id, id);
    return this.transformPlanResponse(plan);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete membership plan' })
  @ApiResponse({ status: 200, description: 'Membership plan deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete plan with active memberships' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async remove(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.membershipPlanService.delete(req.tenant_id, id);
    return { success: true };
  }
}