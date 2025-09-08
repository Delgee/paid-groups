import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DatabaseHelper } from './database.helper';

export class TestSetupHelper {
  static async createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    app.setGlobalPrefix('v1');
    
    await app.init();

    // Initialize database helper
    const dataSource = app.get(DataSource);
    DatabaseHelper.setDataSource(dataSource);

    return app;
  }

  static async cleanupDatabase() {
    try {
      await DatabaseHelper.cleanDatabase();
      await DatabaseHelper.resetSequences();
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  }

  static async closeApp(app: INestApplication) {
    if (app) {
      await app.close();
    }
  }
}