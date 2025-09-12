import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters';
      const payload = verify(token, secret) as { user_id: string; tenant_id?: string };
      request['user'] = payload;
      
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