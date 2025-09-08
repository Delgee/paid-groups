import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

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
        tap(() => next.handle()),
      );
    }

    return next.handle();
  }

  private setTenantContext(tenantId: string): Observable<any> {
    return new Observable(observer => {
      this.dataSource
        .query(`SET LOCAL app.current_tenant = $1`, [tenantId])
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