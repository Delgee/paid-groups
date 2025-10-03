import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { validate as isValidUUID } from 'uuid';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant_id || request.user?.tenant_id;

    if (tenantId) {
      // Set the tenant context for PostgreSQL RLS
      return this.setTenantContext(tenantId).pipe(
        switchMap(() => next.handle()),
      );
    }

    return next.handle();
  }

  private setTenantContext(tenantId: string): Observable<any> {
    return new Observable(observer => {
      // Validate UUID to prevent SQL injection
      if (!isValidUUID(tenantId)) {
        observer.error(new Error('Invalid tenant ID format'));
        return;
      }

      // SET commands don't support parameterized queries in PostgreSQL
      // We validate the UUID above to ensure it's safe
      this.dataSource
        .query(`SET LOCAL app.current_tenant = '${tenantId}'`)
        .then(() => {
          observer.next(null);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }
}