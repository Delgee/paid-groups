import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { QueueStatusDto } from './dto/queue-stats.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check overall application health' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis health' })
  @ApiResponse({ status: 200, description: 'Redis is healthy' })
  @ApiResponse({ status: 503, description: 'Redis is unhealthy' })
  async getRedisHealth() {
    return this.healthService.getRedisHealth();
  }

  @Get('qpay')
  @ApiOperation({ summary: 'Check QPay integration health' })
  @ApiResponse({ status: 200, description: 'QPay integration is healthy' })
  @ApiResponse({ status: 503, description: 'QPay integration is unhealthy' })
  async getQPayHealth() {
    return this.healthService.getQPayHealth();
  }

  @Get('telegram')
  @ApiOperation({ summary: 'Check Telegram bot connectivity' })
  @ApiResponse({ status: 200, description: 'Telegram connectivity is healthy' })
  @ApiResponse({ status: 503, description: 'Telegram connectivity is unhealthy' })
  async getTelegramHealth() {
    return this.healthService.getTelegramHealth();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get worker queue status and statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
    type: QueueStatusDto,
  })
  async getQueueStatus(): Promise<QueueStatusDto> {
    return this.healthService.getQueueStatus();
  }
}