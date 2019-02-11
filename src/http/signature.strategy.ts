import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-signature';
import { Client } from '../entities/client.entity';

@Injectable()
export class SignatureStrategy extends PassportStrategy(Strategy, 'signature') {
  public async validate(
    keyId: string,
    done: (_: null, client: Client, publicKey: string) => void,
  ) {
    const { name } = (await new Promise((resolve, reject) => {
      keyId.replace(
        /^\/(\w+)\/keys\/([0-9a-f:]+)$/,
        (_: string, n: string, f: string): string => {
          resolve({ name: n, fingerprint: f });
          return '';
        },
      );
      reject(new UnauthorizedException('Bad keyId Format'));
    })) as { name: string; fingerprint: string };
    const client = await Client.findOne({ name });
    if (!client) {
      throw new UnauthorizedException('Client Name Not Found');
    }
    done(null, client, client.publicKey);
    return client;
  }
}
