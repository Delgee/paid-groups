import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project } from './entities/project.entity';
import { ProjectService } from './services/project.service';
import { ProjectController } from './project.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ConfigModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
