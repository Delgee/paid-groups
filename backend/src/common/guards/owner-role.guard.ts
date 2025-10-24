import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class OwnerRoleGuard implements CanActivate {
  private readonly logger = new Logger(OwnerRoleGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request context');
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has owner role
    if (user.role !== 'owner') {
      this.logger.warn(
        `User ${user.id} with role ${user.role} attempted to access owner-only resource`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Insufficient permissions. Owner role required.',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    this.logger.debug(`Owner user ${user.id} granted access`);
    return true;
  }
}
