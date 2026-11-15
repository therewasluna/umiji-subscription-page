import { Button, ButtonVariant, Card, Group, Menu, Title, UnstyledButton } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconChevronDown, IconStarFilled } from '@tabler/icons-react'
import {
    TSubscriptionPageAppConfig,
    TSubscriptionPageButtonConfig,
    TSubscriptionPagePlatformKey
} from '@umiji/subscription-page-types'
import { useState } from 'react'

import { useTranslation } from '@shared/hooks'
import { getIconFromLibrary } from '@shared/utils/config-parser'
import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'
import { TemplateEngine } from '@shared/utils/template-engine'
import { vibrate } from '@shared/utils/vibrate'

import { useAppConfig } from '@entities/app-config-store'
import { useSubscription } from '@entities/subscription-info-store'

import { IBlockRendererProps } from './components/blocks/renderer-block.interface'
import classes from './installation-guide.module.css'

export type TBlockVariant = 'accordion' | 'cards' | 'minimal' | 'timeline'

interface IProps {
    BlockRenderer: React.ComponentType<IBlockRendererProps>
    hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>
    isMobile: boolean
    platform: TSubscriptionPagePlatformKey | undefined
}

export const InstallationGuideConnector = (props: IProps) => {
    const { isMobile, hasPlatformApps, BlockRenderer, platform } = props

    const { t, currentLang, baseTranslations } = useTranslation()

    const { platforms, svgLibrary } = useAppConfig()
    const { copy } = useClipboard({ timeout: 2_000 })
    const subscription = useSubscription()

    const [selectedAppIndex, setSelectedAppIndex] = useState(0)
    const [selectedPlatform, setSelectedPlatform] = useState<TSubscriptionPagePlatformKey>(() => {
        if (platform && hasPlatformApps[platform]) {
            return platform
        }

        const firstAvailable = (
            Object.keys(hasPlatformApps) as TSubscriptionPagePlatformKey[]
        ).find((key) => hasPlatformApps[key])
        return firstAvailable!
    })

    const platformApps = platforms[selectedPlatform]!.apps
    const selectedApp = platformApps[selectedAppIndex] ?? platformApps[0]

    const availablePlatforms = (
        Object.entries(hasPlatformApps) as [TSubscriptionPagePlatformKey, boolean][]
    )
        .filter(([_, hasApps]) => hasApps)
        .map(([platform]) => {
            const platformConfig = platforms[platform]!
            return {
                value: platform,
                label: t(platformConfig.displayName),
                icon: getIconFromLibrary(platformConfig.svgIconKey, svgLibrary)
            }
        })

    const subscriptionUrl = constructSubscriptionUrl(
        window.location.href,
        subscription.user.shortUuid
    )

    const handleButtonClick = (button: TSubscriptionPageButtonConfig) => {
        let formattedUrl: string | undefined

        if (button.type === 'subscriptionLink' || button.type === 'copyButton') {
            formattedUrl = TemplateEngine.formatWithMetaInfo(button.link, {
                username: subscription.user.username,
                subscriptionUrl
            })
        }

        switch (button.type) {
            case 'copyButton': {
                if (!formattedUrl) return

                copy(formattedUrl)
                notifications.show({
                    title: t(baseTranslations.linkCopied),
                    message: t(baseTranslations.linkCopiedToClipboard),
                    color: 'cyan'
                })
                break
            }
            case 'external': {
                window.open(button.link, '_blank')
                break
            }
            case 'subscriptionLink': {
                if (!formattedUrl) return

                window.open(formattedUrl, '_blank')
                break
            }
            default:
                break
        }
    }

    const renderBlockButtons = (
        buttons: TSubscriptionPageButtonConfig[],
        variant: ButtonVariant
    ) => {
        if (buttons.length === 0) return null

        return (
            <div className={classes.buttons}>
                {buttons.map((button, index) => {
                    // Adding the subscription is what the whole guide leads to: the one filled button.
                    const isPrimary = button.type === 'subscriptionLink'

                    return (
                        <Button
                            classNames={{
                                root: classes.button,
                                inner: classes.buttonInner,
                                label: classes.buttonLabel
                            }}
                            justify={isPrimary ? 'center' : 'flex-start'}
                            key={index}
                            leftSection={
                                <span
                                    className={classes.glyph}
                                    dangerouslySetInnerHTML={{
                                        __html: getIconFromLibrary(button.svgIconKey, svgLibrary)
                                    }}
                                />
                            }
                            onClick={() => handleButtonClick(button)}
                            px={14}
                            size="md"
                            fz="sm"
                            variant={isPrimary ? 'filled' : variant}
                        >
                            {t(button.text)}
                        </Button>
                    )
                })}
            </div>
        )
    }

    const getIcon = (iconKey: string) => getIconFromLibrary(iconKey, svgLibrary)

    const currentPlatform = availablePlatforms.find((opt) => opt.value === selectedPlatform)!

    return (
        <section>
            <Group gap="md" justify="space-between" mb="md" wrap="nowrap">
                <Title c="white" fw={600} fz={20} order={2}>
                    {t(baseTranslations.installationGuideHeader)}
                </Title>

                {availablePlatforms.length > 1 && (
                    <Menu position="bottom-end" width={200} withinPortal>
                        <Menu.Target>
                            <Button
                                c="white"
                                color="gray"
                                h={44}
                                leftSection={
                                    <span
                                        className={classes.glyph}
                                        dangerouslySetInnerHTML={{ __html: currentPlatform.icon }}
                                    />
                                }
                                rightSection={<IconChevronDown size={16} />}
                                style={{ flexShrink: 0 }}
                                variant="soft"
                            >
                                {currentPlatform.label}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {availablePlatforms.map((opt) => (
                                <Menu.Item
                                    key={opt.value}
                                    leftSection={
                                        <span
                                            className={classes.glyph}
                                            dangerouslySetInnerHTML={{ __html: opt.icon }}
                                        />
                                    }
                                    onClick={() => {
                                        vibrate([80])
                                        setSelectedPlatform(opt.value)
                                        setSelectedAppIndex(0)
                                    }}
                                    rightSection={
                                        opt.value === selectedPlatform && (
                                            <IconCheck
                                                color="var(--mantine-primary-color-4)"
                                                size={16}
                                            />
                                        )
                                    }
                                >
                                    {opt.label}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                )}
            </Group>

            {selectedApp && (
                <Card padding={0}>
                    <div className={classes.apps}>
                        {platformApps.map((app: TSubscriptionPageAppConfig, index: number) => (
                            <UnstyledButton
                                aria-pressed={app === selectedApp}
                                className={classes.app}
                                data-active={app === selectedApp || undefined}
                                key={app.name}
                                onClick={() => {
                                    vibrate('toggle')
                                    setSelectedAppIndex(index)
                                }}
                            >
                                {app.svgIconKey && (
                                    <span
                                        className={classes.appIcon}
                                        dangerouslySetInnerHTML={{
                                            __html: getIconFromLibrary(app.svgIconKey, svgLibrary)
                                        }}
                                    />
                                )}
                                <span className={classes.appName}>{app.name}</span>
                                {app.featured && (
                                    <IconStarFilled className={classes.appFeatured} size={10} />
                                )}
                            </UnstyledButton>
                        ))}
                    </div>

                    <BlockRenderer
                        blocks={selectedApp.blocks}
                        currentLang={currentLang}
                        getIconFromLibrary={getIcon}
                        isMobile={isMobile}
                        renderBlockButtons={renderBlockButtons}
                        svgLibrary={svgLibrary}
                    />
                </Card>
            )}
        </section>
    )
}
