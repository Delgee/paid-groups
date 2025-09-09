import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { 
  MembershipService, 
  CreateMembershipDto, 
  UpdateMembershipDto 
} from './services/membership.service';
import { MembershipStatus } from './entities/membership.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

class CreateMembershipRequestDto implements CreateMembershipDto {
  @IsString()
  member_id: string;

  @IsString()
  group_id: string;

  @IsString()
  plan_id: string;

  @IsOptional()
  @IsDateString()
  starts_at?: Date;

  @IsOptional()
  @IsDateString()
  expires_at?: Date;

  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;
}

class UpdateMembershipRequestDto implements UpdateMembershipDto {
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @IsDateString()
  expires_at?: Date;

  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;
}

class ExtendMembershipDto {
  @IsNumber()
  additional_days: number;
}

@ApiTags('Memberships')
@Controller('memberships')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new membership' })
  @ApiResponse({ status: 201, description: 'Membership created successfully' })
  @ApiResponse({ status: 400, description: 'Member already has active membership' })
  @ApiResponse({ status: 404, description: 'Member or plan not found' })
  async create(
    @Request() req,
    @Body(ValidationPipe) createMembershipDto: CreateMembershipRequestDto,
  ) {
    return this.membershipService.create(req.tenant_id, createMembershipDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all memberships for tenant' })
  @ApiResponse({ status: 200, description: 'List of memberships' })
  @ApiQuery({ name: 'member_id', required: false, description: 'Filter by member ID' })
  @ApiQuery({ name: 'group_id', required: false, description: 'Filter by group ID' })
  async findAll(
    @Request() req,
    @Query('member_id') memberId?: string,
    @Query('group_id') groupId?: string,
  ) {
    if (memberId) {
      const memberships = await this.membershipService.findByMember(req.tenant_id, memberId);
      return { memberships };
    }

    if (groupId) {
      const memberships = await this.membershipService.findByGroup(req.tenant_id, groupId);
      return { memberships };
    }

    const memberships = await this.membershipService.findAllByTenant(req.tenant_id);
    return { memberships };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get membership statistics' })
  @ApiResponse({ status: 200, description: 'Membership statistics' })
  async getStats(@Request() req) {
    return this.membershipService.getMembershipStats(req.tenant_id);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get memberships expiring soon' })
  @ApiResponse({ status: 200, description: 'List of expiring memberships' })
  @ApiQuery({ name: 'days', required: false, description: 'Days ahead to check (default: 7)' })
  async getExpiringMemberships(
    @Request() req,
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    const memberships = await this.membershipService.getExpiringMemberships(req.tenant_id, days);
    return { memberships };
  }

  @Get('groups/:groupId/active')
  @ApiOperation({ summary: 'Get active memberships for a group' })
  @ApiResponse({ status: 200, description: 'List of active memberships' })
  async getActiveMembershipsByGroup(
    @Request() req,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    const memberships = await this.membershipService.findActiveByGroup(req.tenant_id, groupId);
    return { memberships };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get membership by ID' })
  @ApiResponse({ status: 200, description: 'Membership found' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipService.findById(req.tenant_id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update membership' })
  @ApiResponse({ status: 200, description: 'Membership updated successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateMembershipDto: UpdateMembershipRequestDto,
  ) {
    return this.membershipService.update(req.tenant_id, id, updateMembershipDto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel membership' })
  @ApiResponse({ status: 200, description: 'Membership cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async cancel(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipService.cancel(req.tenant_id, id);
  }

  @Put(':id/suspend')
  @ApiOperation({ summary: 'Suspend membership' })
  @ApiResponse({ status: 200, description: 'Membership suspended successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async suspend(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipService.suspend(req.tenant_id, id);
  }

  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate membership' })
  @ApiResponse({ status: 200, description: 'Membership reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reactivate expired membership' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async reactivate(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipService.reactivate(req.tenant_id, id);
  }

  @Put(':id/extend')
  @ApiOperation({ summary: 'Extend membership duration' })
  @ApiResponse({ status: 200, description: 'Membership extended successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async extend(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) extendDto: ExtendMembershipDto,
  ) {
    return this.membershipService.extend(req.tenant_id, id, extendDto.additional_days);
  }
}