import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenant_id) {
      throw new Error('Tenant ID not found in request. Ensure JWT token includes tenant_id claim.');
    }

    return user.tenant_id;
  },
);
