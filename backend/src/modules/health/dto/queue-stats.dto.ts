import { ApiProperty } from '@nestjs/swagger';

export class QueueStatsDto {
  @ApiProperty({
    description: 'Number of jobs waiting to be processed',
    example: 5,
  })
  waiting: number;

  @ApiProperty({
    description: 'Number of jobs currently being processed',
    example: 2,
  })
  active: number;

  @ApiProperty({
    description: 'Number of completed jobs',
    example: 150,
  })
  completed: number;

  @ApiProperty({
    description: 'Number of failed jobs',
    example: 3,
  })
  failed: number;

  @ApiProperty({
    description: 'Number of delayed jobs',
    example: 0,
  })
  delayed: number;
}

export class QueueStatusDto {
  @ApiProperty({
    description: 'Queue name',
    example: 'payment-processing',
  })
  name: string;

  @ApiProperty({
    description: 'Queue statistics',
    type: QueueStatsDto,
  })
  stats: QueueStatsDto;

  @ApiProperty({
    description: 'Whether the queue is healthy',
    example: true,
  })
  is_healthy: boolean;

  @ApiProperty({
    description: 'Health message',
    example: 'Queue is operating normally',
  })
  message: string;
}
