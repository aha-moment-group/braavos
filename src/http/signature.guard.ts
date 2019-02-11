import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SignatureGuard extends AuthGuard('signature') {
  public canActivate(context: ExecutionContext): Promise<boolean> {
    // TODO check if date and digest were signatured
    // const headers = context.switchToHttp().getRequest().headers;
    // if (!headers['content-md5']) {
    //   throw new UnauthorizedException('content-md5 header is required');
    // }
    return super.canActivate(context) as Promise<boolean>;
  }

  public handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
