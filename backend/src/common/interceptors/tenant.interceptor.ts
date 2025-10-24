import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { validate as isValidUUID } from 'uuid';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant_id || request.user?.tenant_id;

    if (tenantId) {
      // Validate UUID to prevent SQL injection
      if (!isValidUUID(tenantId)) {
        throw new BadRequestException('Invalid tenant ID format');
      }

      // Set the tenant context for PostgreSQL RLS
      // SET commands don't support parameterized queries in PostgreSQL
      // We validate the UUID above to ensure it's safe
      await this.dataSource.query(
        `SET LOCAL app.current_tenant = '${tenantId}'`,
      );
    }

    return next.handle();
  }
}
