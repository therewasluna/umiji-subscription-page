import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AxiosService } from '@common/axios/axios.service';
import { TypedConfigService } from '@common/config/app-config';
import { sanitizeUsername } from '@common/utils';

type TLegacyToken = { username: string; userId?: number; createdAt: Date; secret: string };

// Same as pasarguardShortUuid in umiji/migrate.mjs: the Short UUID it gave a PasarGuard user.
export const pasarguardShortUuid = (secret: string, id: number): string =>
    createHmac('sha256', secret)
        .update(`umiji-legacy:pasarguard:${id}`)
        .digest('base64url')
        .slice(0, 24);

@Injectable()
export class MarzbanService {
    private readonly logger = new Logger(MarzbanService.name);

    private readonly marzbanSecretKeys: string[];
    private readonly mlDropRevokedSubscriptions: boolean;
    constructor(
        private readonly configService: TypedConfigService,
        private readonly jwtService: JwtService,
        private readonly axiosService: AxiosService,
    ) {
        this.mlDropRevokedSubscriptions = this.configService.getOrThrow(
            'MARZBAN_LEGACY_DROP_REVOKED_SUBSCRIPTIONS',
        );

        const marzbanSecretKeys = this.configService.get('MARZBAN_LEGACY_SECRET_KEY');

        if (marzbanSecretKeys && marzbanSecretKeys.length > 0) {
            this.marzbanSecretKeys = marzbanSecretKeys.split(',').map((key) => key.trim());
        } else {
            this.marzbanSecretKeys = [];
        }
    }

    public async resolveShortUuid(
        marzbanLink: string,
        clientIp: string,
    ): Promise<{
        dropConnection: boolean;
        shortUuid: string | null;
    }> {
        try {
            const username = await this.tryDecodeMarzbanLink(marzbanLink);

            if (username?.userId !== undefined) {
                // PasarGuard links carry the user's id. The migration tool gave that user this Short UUID.
                return {
                    dropConnection: false,
                    shortUuid: pasarguardShortUuid(username.secret, username.userId),
                };
            }

            if (username) {
                // The migration tool keeps names Umiji accepts and sanitizes the rest; older tools
                // sanitized every name, so that's the second try.
                const sanitizedUsername = sanitizeUsername(username.username);
                const candidates = /^[A-Za-z0-9_-]{3,36}$/.test(username.username)
                    ? [username.username, sanitizedUsername]
                    : [sanitizedUsername.slice(0, 36)];

                this.logger.log(
                    `Decoded Marzban username: ${username.username}, looking up: ${candidates.join(', ')}`,
                );

                let userInfo = await this.axiosService.getUserByUsername(clientIp, candidates[0]);
                if ((!userInfo.isOk || !userInfo.response) && candidates[1] !== candidates[0]) {
                    userInfo = await this.axiosService.getUserByUsername(clientIp, candidates[1]);
                }
                if (!userInfo.isOk || !userInfo.response) {
                    this.logger.error(
                        `Decoded Marzban username is not found in Umiji, decoded username: ${username.username}`,
                    );

                    return {
                        dropConnection: true,
                        shortUuid: null,
                    };
                } else if (
                    this.mlDropRevokedSubscriptions &&
                    userInfo.response.response.subRevokedAt !== null
                ) {
                    return {
                        dropConnection: true,
                        shortUuid: null,
                    };
                }

                return {
                    dropConnection: false,
                    shortUuid: userInfo.response.response.shortUuid,
                };
            }

            return {
                dropConnection: false,
                shortUuid: null,
            };
        } catch (error) {
            this.logger.error('Error in resolveShortUuid', error);
            return {
                dropConnection: true,
                shortUuid: null,
            };
        }
    }

    private async tryDecodeMarzbanLink(marzbanLink: string): Promise<TLegacyToken | null> {
        if (!this.marzbanSecretKeys.length) return null;

        const token = marzbanLink;
        this.logger.debug(`Verifying token: ${token}`);

        if (!token || token.length < 10) {
            this.logger.debug(`Token too short: ${token}`);
            return null;
        }

        for (const key of this.marzbanSecretKeys) {
            const result = await this.decodeMarzbanLink(marzbanLink, key);
            if (result) return result;

            this.logger.debug(`Decoding Marzban link failed with key: ${key}`);
        }

        this.logger.debug(`Decoding Marzban link failed with all keys`);

        return null;
    }

    private async decodeMarzbanLink(
        token: string,
        marzbanSecretKey: string,
    ): Promise<TLegacyToken | null> {
        if (token.split('.').length === 3) {
            try {
                const payload = await this.jwtService.verifyAsync(token, {
                    secret: marzbanSecretKey,
                    algorithms: ['HS256'],
                });

                if (payload.access !== 'subscription') {
                    throw new Error('JWT access field is not subscription');
                }

                const jwtCreatedAt = new Date(payload.iat * 1000);

                if (!this.checkSubscriptionValidity(jwtCreatedAt, payload.sub)) {
                    return null;
                }

                this.logger.debug(`JWT verified successfully, ${JSON.stringify(payload)}`);

                return {
                    username: payload.sub,
                    createdAt: jwtCreatedAt,
                    secret: marzbanSecretKey,
                };
            } catch (err) {
                this.logger.debug(`JWT verification failed: ${err}`);
            }
        }

        // PasarGuard: <base64 payload>.<base64 HMAC-SHA256 of it>. A '.' never appears in the older format.
        if (token.includes('.')) {
            const dot = token.lastIndexOf('.');
            const data = token.slice(0, dot);
            const expected = createHmac('sha256', marzbanSecretKey)
                .update(data)
                .digest('base64url');
            const got = Buffer.from(token.slice(dot + 1));
            if (got.length !== expected.length || !timingSafeEqual(got, Buffer.from(expected))) {
                return null;
            }
            return this.parsePayload(Buffer.from(data, 'base64url').toString(), marzbanSecretKey);
        }

        const uToken = token.slice(0, token.length - 10);
        const uSignature = token.slice(token.length - 10);

        this.logger.debug(`Token parts: base: ${uToken}, signature: ${uSignature}`);

        let decoded: string;
        try {
            decoded = Buffer.from(uToken, 'base64url').toString();
        } catch (err) {
            this.logger.debug(`Base64 decode error: ${err}`);
            return null;
        }

        const hash = createHash('sha256');
        hash.update(uToken + marzbanSecretKey);
        const digest = hash.digest();

        const expectedSignature = Buffer.from(digest).toString('base64url').slice(0, 10);

        this.logger.debug(`Expected signature: ${expectedSignature}, actual: ${uSignature}`);

        // PasarGuard also signed with the hex digest.
        if (
            uSignature !== expectedSignature &&
            uSignature !== digest.toString('hex').slice(0, 10)
        ) {
            this.logger.debug('Signature mismatch');
            return null;
        }

        return this.parsePayload(decoded, marzbanSecretKey);
    }

    // "username,created_at" (Marzban) or "v2|v3,user_id,created_at" (PasarGuard).
    private parsePayload(decoded: string, secret: string): TLegacyToken | null {
        const parts = decoded.split(',');
        if (parts.length === 3 && (parts[0] === 'v2' || parts[0] === 'v3')) {
            const userId = parseInt(parts[1], 10);
            const createdAt = new Date(parseInt(parts[2], 10) * 1000);
            if (isNaN(userId) || isNaN(createdAt.getTime())) return null;
            if (!this.checkSubscriptionValidity(createdAt, `id ${userId}`)) return null;
            return { username: '', userId, createdAt, secret };
        }

        if (parts.length < 2) {
            this.logger.debug(`Invalid token format: ${decoded}`);
            return null;
        }

        const username = parts[0];
        const createdAtInt = parseInt(parts[1], 10);

        if (isNaN(createdAtInt)) {
            this.logger.debug(`Invalid created_at timestamp: ${parts[1]}`);
            return null;
        }

        const createdAt = new Date(createdAtInt * 1000);

        if (!this.checkSubscriptionValidity(createdAt, username)) {
            return null;
        }

        this.logger.debug(`Token decoded. Username: ${username}, createdAt: ${createdAt}`);

        return {
            username,
            createdAt,
            secret,
        };
    }

    private checkSubscriptionValidity(createdAt: Date, username: string): boolean {
        const validFrom = this.configService.get('MARZBAN_LEGACY_SUBSCRIPTION_VALID_FROM');

        if (!validFrom) {
            return true;
        }

        const validFromDate = new Date(validFrom);
        if (createdAt < validFromDate) {
            this.logger.debug(
                `createdAt JWT: ${createdAt.toISOString()} is before validFrom: ${validFromDate.toISOString()}`,
            );

            this.logger.warn(
                `${JSON.stringify({ username, createdAt })} – subscription createdAt is before validFrom`,
            );

            return false;
        }

        return true;
    }
}
