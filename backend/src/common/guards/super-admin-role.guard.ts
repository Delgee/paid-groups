import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../modules/auth/entities/user.entity';

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminRoleGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request context');
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has super_admin role
    if (user.role !== UserRole.SUPER_ADMIN) {
      this.logger.warn(
        `User ${user.id} with role ${user.role} attempted to access super admin-only resource`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Insufficient permissions. Super admin role required.',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    this.logger.debug(`Super admin user ${user.id} granted access`);
    return true;
  }
}
