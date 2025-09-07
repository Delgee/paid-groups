import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const TENANT_KEY = 'tenant';
export const TenantId = () => {
  return (target: any, key: string) => {
    Reflect.defineMetadata(TENANT_KEY, true, target, key);
  };
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'];

    if (!user || !user.tenant_id) {
      throw new ForbiddenException('Tenant context is required');
    }

    // Set tenant context for the request
    request['tenant_id'] = user.tenant_id;
    
    return true;
  }
}