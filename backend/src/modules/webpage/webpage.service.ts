import ejs from 'ejs';
import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';

import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
    SubscriptionPageRawConfigSchema,
    TSubscriptionPageAccentColor,
    TSubscriptionPageRawConfig,
    SUBPAGE_DEFAULT_CONFIG_UUID,
    SUBSCRIPTION_PAGE_DEFAULT_ACCENT_COLOR,
} from '@umiji/subscription-page-types';

import { AxiosService } from '@common/axios';
import { TypedConfigService } from '@common/config/app-config';
import { getAssetsPath, isDevelopment } from '@common/utils';
import { decryptUuid, encryptUuid } from '@common/utils/crypt-utils';

// Configs are re-read from the panel this often, so edits show up on the next page load
// without restarting the container.
const CONFIG_TTL_MS = 2_000;

interface ICachedConfig {
    config: TSubscriptionPageRawConfig;
    fetchedAt: number;
}

@Injectable()
export class WebpageService implements OnApplicationBootstrap {
    private readonly logger = new Logger(WebpageService.name);
    private readonly internalJwtSecret: string;
    private readonly subpageConfigUuid: string;
    private readonly subpageConfigMap: Map<string, ICachedConfig> = new Map();
    private readonly pendingConfigs: Map<string, Promise<TSubscriptionPageRawConfig | undefined>> =
        new Map();
    private indexTemplate: ejs.TemplateFunction;

    constructor(
        private readonly configService: TypedConfigService,
        private readonly axiosService: AxiosService,
        private readonly jwtService: JwtService,
    ) {
        this.internalJwtSecret = this.configService.getOrThrow('INTERNAL_JWT_SECRET');
        this.subpageConfigUuid = this.configService.getOrThrow('SUBPAGE_CONFIG_UUID');
    }

    public async onApplicationBootstrap(): Promise<void> {
        this.indexTemplate = ejs.compile(
            readFileSync(path.join(getAssetsPath(), 'index.html'), 'utf8'),
        );

        const subscriptionPageConfigList = await this.fetchSubscriptionPageConfigList();

        if (subscriptionPageConfigList.length === 0) {
            this.logger.error('[FATAL] Subscription page config list is empty, exiting...');

            exit(1);
        }

        this.logger.log(`Found ${subscriptionPageConfigList.length} subscription page configs.`);

        for (const config of subscriptionPageConfigList) {
            const subscriptionPageConfig =
                await this.axiosService.getSubscriptionPageConfigByUuid(config);

            if (!subscriptionPageConfig.isOk || !subscriptionPageConfig.response) {
                this.logger.error(
                    `[FATAL] Error while fetching one of subpage config: ${config}, exiting...`,
                );

                exit(1);
            }

            const parsedConfig = await SubscriptionPageRawConfigSchema.safeParseAsync(
                subscriptionPageConfig.response.config,
            );

            if (!parsedConfig.success) {
                this.logger.error(
                    `[FATAL] ${config} is not valid: ${JSON.stringify(parsedConfig.error)}`,
                );

                exit(1);
            }

            this.logger.log(`[OK] ${config}`);
            this.subpageConfigMap.set(config, { config: parsedConfig.data, fetchedAt: Date.now() });
        }

        if (this.subpageConfigMap.size === 0) {
            this.logger.error('[FAILED] At least one SubPage config must be valid!');
            exit(1);
        }

        this.logger.log('[OK] Subpage configs are loaded successfully.');
    }

    public async getSubscriptionPageConfig(
        encryptedSubpageConfigUuid: string,
    ): Promise<object | void> {
        const decryptedSubpageConfigUuid = decryptUuid(
            encryptedSubpageConfigUuid,
            this.internalJwtSecret,
        );

        if (!decryptedSubpageConfigUuid) {
            this.logger.error(`[FATAL] SubPage config ${encryptedSubpageConfigUuid} is not valid`);
            throw new NotFoundException();
        }

        const subpageConfig = await this.getConfig(decryptedSubpageConfigUuid);

        if (!subpageConfig) {
            this.logger.error(`[FATAL] SubPage config ${decryptedSubpageConfigUuid} not found`);
            throw new NotFoundException();
        }

        return subpageConfig;
    }

    private async fetchSubscriptionPageConfigList(): Promise<string[]> {
        const subscriptionPageConfigList = await this.axiosService.getSubscriptionPageConfigList();
        if (!subscriptionPageConfigList.isOk || !subscriptionPageConfigList.response) {
            this.logger.error('Subscription page config list cannot be fetched');
            return [];
        }

        return subscriptionPageConfigList.response.configs.map((config) => config.uuid);
    }

    public getEncryptedSubpageConfigUuid(subpageConfigUuidFromUmiji: string | null): string {
        return encryptUuid(
            this.getFinalSubpageConfigUuid(subpageConfigUuidFromUmiji),
            this.internalJwtSecret,
        );
    }

    public async getBaseSettings(
        subpageConfigUuid: string | null,
    ): Promise<TSubscriptionPageRawConfig['baseSettings']> {
        const subpageConfig = await this.getConfig(
            this.getFinalSubpageConfigUuid(subpageConfigUuid),
        );

        if (!subpageConfig) {
            return {
                metaTitle: 'Subscription Page',
                metaDescription: 'Subscription Page',
                showConnectionKeys: false,
                hideGetLinkButton: false,
            };
        }

        return {
            metaTitle: subpageConfig.baseSettings.metaTitle,
            metaDescription: subpageConfig.baseSettings.metaDescription,
            showConnectionKeys: subpageConfig.baseSettings.showConnectionKeys,
            hideGetLinkButton: subpageConfig.baseSettings.hideGetLinkButton,
        };
    }

    public async getAccentColor(
        subpageConfigUuid: string | null,
    ): Promise<TSubscriptionPageAccentColor> {
        const subpageConfig = await this.getConfig(
            this.getFinalSubpageConfigUuid(subpageConfigUuid),
        );

        return (
            subpageConfig?.brandingSettings.accentColor ?? SUBSCRIPTION_PAGE_DEFAULT_ACCENT_COLOR
        );
    }

    /**
     * Returns the config, re-reading it from the panel once it is older than CONFIG_TTL_MS. Configs
     * created after startup are fetched on first use. If the panel can't be reached or returns an
     * invalid config, the last good one keeps being served.
     */
    private async getConfig(uuid: string): Promise<TSubscriptionPageRawConfig | undefined> {
        const cached = this.subpageConfigMap.get(uuid);

        if (cached && Date.now() - cached.fetchedAt < CONFIG_TTL_MS) {
            return cached.config;
        }

        let pending = this.pendingConfigs.get(uuid);

        if (!pending) {
            pending = this.fetchConfig(uuid).finally(() => this.pendingConfigs.delete(uuid));
            this.pendingConfigs.set(uuid, pending);
        }

        // Read the map again: a config deleted in the panel has just been evicted.
        return (await pending) ?? this.subpageConfigMap.get(uuid)?.config;
    }

    private async fetchConfig(uuid: string): Promise<TSubscriptionPageRawConfig | undefined> {
        const response = await this.axiosService.getSubscriptionPageConfigByUuid(uuid);

        if (response.code === 'NOT_FOUND') {
            this.logger.error(`SubPage config ${uuid} was deleted in the panel`);
            this.subpageConfigMap.delete(uuid);
            return undefined;
        }

        if (!response.isOk || !response.response) {
            this.logger.error(`SubPage config ${uuid} could not be fetched`);
            this.keepServingCached(uuid);
            return undefined;
        }

        const parsedConfig = await SubscriptionPageRawConfigSchema.safeParseAsync(
            response.response.config,
        );

        if (!parsedConfig.success) {
            this.logger.error(`SubPage config ${uuid} is not valid, keeping the previous one`);
            this.keepServingCached(uuid);
            return undefined;
        }

        this.subpageConfigMap.set(uuid, { config: parsedConfig.data, fetchedAt: Date.now() });

        return parsedConfig.data;
    }

    /** After a failed refresh, the last good config is served for another TTL before retrying. */
    private keepServingCached(uuid: string): void {
        const cached = this.subpageConfigMap.get(uuid);
        if (cached) cached.fetchedAt = Date.now();
    }

    private getFinalSubpageConfigUuid(subpageConfigUuid: string | null): string {
        let finalSubpageConfigUuid: string;

        const isDefaultUuid = this.subpageConfigUuid === SUBPAGE_DEFAULT_CONFIG_UUID;

        if (isDefaultUuid && subpageConfigUuid) {
            finalSubpageConfigUuid = subpageConfigUuid;
        } else {
            finalSubpageConfigUuid = this.subpageConfigUuid;
        }

        return finalSubpageConfigUuid;
    }

    private generateJwtForCookie(uuid: string | null): string {
        return this.jwtService.sign(
            {
                sessionId: nanoid(32),
                su: this.getEncryptedSubpageConfigUuid(uuid),
            },
            {
                expiresIn: '33m',
            },
        );
    }

    public async serveWebpage(
        clientIp: string,
        req: Request,
        res: Response,
        shortUuid: string,
    ): Promise<void> {
        try {
            const subscriptionDataResponse = await this.axiosService.getSubscriptionInfo(
                clientIp,
                shortUuid,
            );

            if (!subscriptionDataResponse.isOk || !subscriptionDataResponse.response) {
                res.socket?.destroy();
                return;
            }

            const subpageConfigResponse = await this.axiosService.getSubpageConfig(
                shortUuid,
                req.headers,
            );

            if (!subpageConfigResponse.isOk || !subpageConfigResponse.response) {
                res.socket?.destroy();
                return;
            }

            const subpageConfig = subpageConfigResponse.response;

            if (subpageConfig.webpageAllowed === false) {
                this.logger.log(`Webpage access is not allowed by Umiji's SRR.`);
                res.socket?.destroy();
                return;
            }

            const baseSettings = await this.getBaseSettings(subpageConfig.subpageConfigUuid);

            const subscriptionData = subscriptionDataResponse.response;

            if (!baseSettings.showConnectionKeys) {
                // Telegram links stay: this page is the only place users get them.
                subscriptionData.response.links = subscriptionData.response.links.filter((link) =>
                    link.startsWith('tg://'),
                );
                subscriptionData.response.ssConfLinks = {};
            }

            res.cookie('session', this.generateJwtForCookie(subpageConfig.subpageConfigUuid), {
                httpOnly: true,
                secure: !isDevelopment(),
                maxAge: 1_800_000, // 30 minutes
            });

            res.type('html').send(
                this.indexTemplate({
                    metaTitle: baseSettings.metaTitle,
                    metaDescription: baseSettings.metaDescription,
                    accentColor: await this.getAccentColor(subpageConfig.subpageConfigUuid),
                    panelData: Buffer.from(JSON.stringify(subscriptionData)).toString('base64'),
                }),
            );
        } catch (error) {
            this.logger.error(`Error in returnWebpage: ${error}`);

            res.socket?.destroy();
            return;
        }
    }
}
