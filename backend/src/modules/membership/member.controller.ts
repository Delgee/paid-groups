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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { MemberService, CreateMemberDto, UpdateMemberDto } from './services/member.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

class CreateMemberRequestDto implements CreateMemberDto {
  @IsNumber()
  telegram_user_id: number;

  @IsOptional()
  @IsString()
  telegram_username?: string;

  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

class UpdateMemberRequestDto implements UpdateMemberDto {
  @IsOptional()
  @IsString()
  telegram_username?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

@ApiTags('Members')
@Controller('members')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new member' })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  async create(
    @Request() req,
    @Body(ValidationPipe) createMemberDto: CreateMemberRequestDto,
  ) {
    return this.memberService.create(req.tenant_id, createMemberDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all members for tenant' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async findAll(@Request() req) {
    const members = await this.memberService.findAllByTenant(req.tenant_id);
    return { members };
  }

  @Get('active')
  @ApiOperation({ summary: 'List active members with valid memberships' })
  @ApiResponse({ status: 200, description: 'List of active members' })
  async getActiveMembers(@Request() req) {
    const members = await this.memberService.getActiveMembers(req.tenant_id);
    return { members };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get member statistics' })
  @ApiResponse({ status: 200, description: 'Member statistics' })
  async getStats(@Request() req) {
    return this.memberService.getMemberStats(req.tenant_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member by ID' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.memberService.findById(req.tenant_id, id);
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Get member by Telegram ID' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findByTelegramId(
    @Request() req,
    @Param('telegramId') telegramId: string,
  ) {
    const member = await this.memberService.findByTelegramId(
      req.tenant_id,
      parseInt(telegramId),
    );
    
    if (!member) {
      throw new NotFoundException(`Member with Telegram ID ${telegramId} not found`);
    }
    
    return member;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update member' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateMemberDto: UpdateMemberRequestDto,
  ) {
    return this.memberService.update(req.tenant_id, id, updateMemberDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete member' })
  @ApiResponse({ status: 200, description: 'Member deleted successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async remove(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.memberService.delete(req.tenant_id, id);
    return { success: true };
  }
}