import type { IncomingHttpHeaders } from 'node:http';

import axios, { AxiosError, AxiosInstance, RawAxiosResponseHeaders } from 'axios';
import { exit } from 'node:process';
import { ProxyAgent } from 'proxy-agent';
import { table } from 'table';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
    GetMetadataCommand,
    GetSubpageConfigByShortUuidCommand,
    GetSubscriptionInfoByShortUuidCommand,
    GetSubpageConfigCommand,
    GetSubpageConfigsCommand,
    GetUserByUsernameCommand,
    UMIJI_REAL_IP_HEADER,
    TRequestTemplateTypeKeys,
} from '@umiji/backend-contract';

import { TypedConfigService } from '@common/config/app-config';
import { IGNORED_HEADERS } from '@common/constants';

import { ICommandResponse } from '../types/command-response.type';

@Injectable()
export class AxiosService implements OnModuleInit {
    private readonly logger = new Logger(AxiosService.name);
    private subpageVersion: string;

    public axiosInstance: AxiosInstance;

    constructor(private readonly configService: TypedConfigService) {
        const panelProxy = this.configService.get('UMIJI_PANEL_PROXY');
        const proxyAgent = panelProxy
            ? new ProxyAgent({ getProxyForUrl: () => panelProxy })
            : undefined;

        this.axiosInstance = axios.create({
            baseURL: this.configService.getOrThrow('UMIJI_PANEL_URL'),
            timeout: 10_000,
            ...(proxyAgent && {
                httpAgent: proxyAgent,
                httpsAgent: proxyAgent,
                // Otherwise axios also applies HTTP(S)_PROXY from the environment on top of the agent.
                proxy: false,
            }),
            headers: {
                'user-agent': 'Umiji Subscription Page',
                'x-subpage-version': this.subpageVersion,
                Authorization: `Bearer ${this.configService.getOrThrow('UMIJI_API_TOKEN')}`,
            },
        });

        const caddyAuthApiToken = this.configService.get('CADDY_AUTH_API_TOKEN');

        const cloudflareZeroTrustClientId = this.configService.get(
            'CLOUDFLARE_ZERO_TRUST_CLIENT_ID',
        );
        const cloudflareZeroTrustClientSecret = this.configService.get(
            'CLOUDFLARE_ZERO_TRUST_CLIENT_SECRET',
        );

        const egamesCookie = this.configService.get('EGAMES_COOKIE');

        if (caddyAuthApiToken) {
            this.axiosInstance.defaults.headers.common['X-Api-Key'] = caddyAuthApiToken;
        }

        if (cloudflareZeroTrustClientId && cloudflareZeroTrustClientSecret) {
            this.axiosInstance.defaults.headers.common['CF-Access-Client-Id'] =
                cloudflareZeroTrustClientId;
            this.axiosInstance.defaults.headers.common['CF-Access-Client-Secret'] =
                cloudflareZeroTrustClientSecret;
        }

        if (this.configService.getOrThrow('UMIJI_PANEL_URL').startsWith('http://')) {
            this.axiosInstance.defaults.headers.common['X-Forwarded-For'] = '127.0.0.1';
            this.axiosInstance.defaults.headers.common['X-Forwarded-Proto'] = 'https';
        }

        if (egamesCookie) {
            this.axiosInstance.defaults.headers.common['Cookie'] = egamesCookie;
        }
    }

    async onModuleInit(): Promise<void> {
        this.subpageVersion = __UMIJI_SUBPAGE_VERSION__;

        this.logger.log(`Umiji API URL: ${this.axiosInstance.defaults.baseURL}`);
        if (this.configService.get('UMIJI_PANEL_PROXY')) {
            this.logger.log('Requests to Umiji Panel go through UMIJI_PANEL_PROXY');
        }

        const umijiMetadata = await this.getUmijiMetadata();
        if (!umijiMetadata.isOk || !umijiMetadata.umijiVersion) {
            this.logger.error(
                '\n' +
                    table([['Is the panel online and reachable from this server?']], {
                        header: {
                            content: `Connection to Umiji Panel failed!`,
                            alignment: 'center',
                        },
                        columnDefault: {
                            width: 70,
                            alignment: 'center',
                            wrapWord: true,
                        },
                        drawVerticalLine: () => false,
                    }) +
                    '\n',
            );
            this.logger.error(umijiMetadata.error);

            exit(1);
        } else {
            this.logger.log(`[OK] Connected to Umiji v${umijiMetadata.umijiVersion}`);
        }
    }

    public async getUmijiMetadata(): Promise<{
        isOk: boolean;
        umijiVersion?: string;
        error?: unknown;
    }> {
        try {
            const response = await this.axiosInstance.request<GetMetadataCommand.Response>({
                method: GetMetadataCommand.endpointDetails.REQUEST_METHOD,
                url: GetMetadataCommand.url,
            });

            await GetMetadataCommand.ResponseSchema.parseAsync(response.data);

            return {
                isOk: true,
                umijiVersion: response.data.response.version,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                return {
                    isOk: false,
                    error: error.message,
                };
            } else {
                return {
                    isOk: false,
                    error: error,
                };
            }
        }
    }

    public async getUserByUsername(
        clientIp: string,
        username: string,
    ): Promise<ICommandResponse<GetUserByUsernameCommand.Response>> {
        try {
            const response = await this.axiosInstance.request<GetUserByUsernameCommand.Response>({
                method: GetUserByUsernameCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserByUsernameCommand.url(encodeURIComponent(username)),
                headers: {
                    [UMIJI_REAL_IP_HEADER]: clientIp,
                },
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Error in Axios GetUserByUsername Request:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Error in GetUserByUsername Request:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    public async getSubscriptionPageConfigByUuid(
        uuid: string,
    ): Promise<ICommandResponse<GetSubpageConfigCommand.Response['response']>> {
        try {
            const response = await this.axiosInstance.request<GetSubpageConfigCommand.Response>({
                method: GetSubpageConfigCommand.endpointDetails.REQUEST_METHOD,
                url: GetSubpageConfigCommand.url(encodeURIComponent(uuid)),
            });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            this.logger.error('Error in GetSubscriptionPageConfigByUuid Request:', error);

            // A 404 means the config was deleted in the panel, not that the panel is unreachable.
            const isNotFound = error instanceof AxiosError && error.response?.status === 404;
            return { isOk: false, ...(isNotFound && { code: 'NOT_FOUND' }) };
        }
    }

    public async getSubscriptionPageConfigList(): Promise<
        ICommandResponse<GetSubpageConfigsCommand.Response['response']>
    > {
        try {
            const response = await this.axiosInstance.request<GetSubpageConfigsCommand.Response>({
                method: GetSubpageConfigsCommand.endpointDetails.REQUEST_METHOD,
                url: GetSubpageConfigsCommand.url,
            });

            const validationResult = await GetSubpageConfigsCommand.ResponseSchema.parseAsync(
                response.data,
            );

            return {
                isOk: true,
                response: validationResult.response,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 404) {
                    this.logger.error('Request failed with 404 status code.');
                    this.logger.error(
                        'This version of Subscription Page requires Umiji Panel version >=2.4.0. Please upgrade Umiji Panel to the latest version or downgrade Subscription Page.',
                    );
                    return { isOk: false };
                }

                this.logger.error(`Subpage Config List Request failed: ${error.message}`);
                return { isOk: false };
            } else {
                this.logger.error(`Subpage Config List Request failed: ${error}`);
                return { isOk: false };
            }
        }
    }

    public async getSubscriptionInfo(
        clientIp: string,
        shortUuid: string,
    ): Promise<ICommandResponse<GetSubscriptionInfoByShortUuidCommand.Response>> {
        try {
            const response =
                await this.axiosInstance.request<GetSubscriptionInfoByShortUuidCommand.Response>({
                    method: GetSubscriptionInfoByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                    url: GetSubscriptionInfoByShortUuidCommand.url(encodeURIComponent(shortUuid)),
                    headers: {
                        [UMIJI_REAL_IP_HEADER]: clientIp,
                    },
                });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Error in GetSubscriptionInfo Request:', error.message);
            } else {
                this.logger.error('Error in GetSubscriptionInfo Request:', error);
            }

            return { isOk: false };
        }
    }

    public async getSubpageConfig(
        shortUuid: string,
        requestHeaders: IncomingHttpHeaders,
    ): Promise<ICommandResponse<GetSubpageConfigByShortUuidCommand.Response['response']>> {
        try {
            const response =
                await this.axiosInstance.request<GetSubpageConfigByShortUuidCommand.Response>({
                    method: GetSubpageConfigByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                    url: GetSubpageConfigByShortUuidCommand.url(encodeURIComponent(shortUuid)),
                    data: {
                        requestHeaders,
                    },
                });

            return {
                isOk: true,
                response: response.data.response,
            };
        } catch (error) {
            this.logger.error('Error in GetSubpageConfig Request:', error);
            return { isOk: false };
        }
    }

    public async getSubscription(
        clientIp: string,
        shortUuid: string,
        headers: NodeJS.Dict<string | string[]>,
        withClientType: boolean = false,
        clientType?: TRequestTemplateTypeKeys,
    ): Promise<{
        subscription: Buffer;
        headers: RawAxiosResponseHeaders;
    } | null> {
        try {
            let basePath = 'api/sub/' + encodeURIComponent(shortUuid);

            if (withClientType && clientType) {
                basePath += '/' + encodeURIComponent(clientType);
            }

            const response = await this.axiosInstance.request<Buffer>({
                method: 'GET',
                url: basePath,
                responseType: 'arraybuffer',
                headers: {
                    ...headers,
                    Accept: '*/*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
                    Pragma: 'no-cache',
                    Expires: '0',
                    [UMIJI_REAL_IP_HEADER]: clientIp,
                    Authorization: undefined,
                },
            });

            return {
                subscription: response.data,
                headers: Object.fromEntries(
                    Object.entries(response.headers).filter(([key]) => !IGNORED_HEADERS.has(key)),
                ),
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response) {
                    if (error.response.status === 404) {
                        return null;
                    }
                }

                this.logger.error(`Error in GetSubscription Request: ${error.message}`);
            } else {
                this.logger.error(`Error in GetSubscription Request: ${error}`);
            }

            return null;
        }
    }
}
