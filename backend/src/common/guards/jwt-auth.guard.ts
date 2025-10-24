import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = verify(token, secret) as JwtPayload;

      // Transform JWT payload to match expected user structure
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        tenant_id: payload.tenant_id,
        role: payload.role,
      };

      // Set tenant context for RLS
      if (payload.tenant_id) {
        request['tenant_id'] = payload.tenant_id;
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
