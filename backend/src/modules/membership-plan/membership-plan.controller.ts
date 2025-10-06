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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MembershipPlanService } from './services/membership-plan.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { MembershipPlan } from './entities/membership-plan.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant-id.decorator';

@ApiTags('Membership Plans')
@Controller('membership-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembershipPlanController {
  constructor(private readonly membershipPlanService: MembershipPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new membership plan' })
  @ApiResponse({
    status: 201,
    description: 'Membership plan created successfully',
    type: MembershipPlan,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Bot configuration not found' })
  async create(
    @TenantId() tenantId: string,
    @Body() createDto: CreateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    return this.membershipPlanService.create(tenantId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all membership plans for tenant' })
  @ApiQuery({
    name: 'bot_configuration_id',
    required: false,
    description: 'Filter by bot configuration ID',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of membership plans',
    type: [MembershipPlan],
  })
  async findAll(
    @TenantId() tenantId: string,
    @Query('bot_configuration_id') botConfigurationId?: string,
    @Query('is_active', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ): Promise<MembershipPlan[]> {
    return this.membershipPlanService.findAll(tenantId, {
      bot_configuration_id: botConfigurationId,
      is_active: isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get membership plan by ID' })
  @ApiParam({ name: 'id', description: 'Membership plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Membership plan details',
    type: MembershipPlan,
  })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MembershipPlan> {
    return this.membershipPlanService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update membership plan' })
  @ApiParam({ name: 'id', description: 'Membership plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Membership plan updated successfully',
    type: MembershipPlan,
  })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    return this.membershipPlanService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete membership plan' })
  @ApiParam({ name: 'id', description: 'Membership plan UUID' })
  @ApiResponse({ status: 204, description: 'Membership plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete plan with active members',
  })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.membershipPlanService.delete(tenantId, id);
  }
}
