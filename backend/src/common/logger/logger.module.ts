import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    {
      provide: LoggerService,
      useFactory: () => {
        const logger = new LoggerService();
        logger.setContext('Application');
        return logger;
      },
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}