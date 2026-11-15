import { ActionIcon, Button, Stack, Text } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
    IconBrandDiscord,
    IconBrandTelegram,
    IconBrandVk,
    IconCopy,
    IconLink,
    IconMessageChatbot
} from '@tabler/icons-react'

import { useTranslation } from '@shared/hooks'
import { QrPlateShared } from '@shared/ui'
import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'
import { vibrate } from '@shared/utils/vibrate'

import { useSubscription } from '@entities/subscription-info-store'

interface IProps {
    hideGetLink: boolean
    isMobile: boolean
    supportUrl: string
}

const SUPPORT_ICONS = {
    't.me': IconBrandTelegram,
    'discord.com': IconBrandDiscord,
    'vk.com': IconBrandVk
}

export const SubscriptionLinkWidget = ({ supportUrl, hideGetLink, isMobile }: IProps) => {
    const { t, baseTranslations } = useTranslation()
    const subscription = useSubscription()
    const clipboard = useClipboard({ timeout: 10000 })

    const subscriptionUrl = constructSubscriptionUrl(
        window.location.href,
        subscription.user.shortUuid
    )

    const handleCopy = () => {
        notifications.show({
            title: t(baseTranslations.linkCopied),
            message: t(baseTranslations.linkCopiedToClipboard),
            color: 'cyan'
        })
        clipboard.copy(subscriptionUrl)
    }

    const handleGetLink = () => {
        vibrate('tap')

        modals.open({
            title: t(baseTranslations.getLink),
            children: (
                <Stack align="center" gap="lg">
                    <QrPlateShared value={subscriptionUrl} />
                    <Stack gap={4}>
                        <Text c="white" fw={600} ta="center">
                            {t(baseTranslations.scanQrCode)}
                        </Text>
                        <Text c="dimmed" size="sm" ta="center">
                            {t(baseTranslations.scanQrCodeDescription)}
                        </Text>
                    </Stack>
                    <Button
                        fullWidth
                        leftSection={<IconCopy size={18} />}
                        onClick={handleCopy}
                        size="md"
                        variant="filled"
                    >
                        {t(baseTranslations.copyLink)}
                    </Button>
                </Stack>
            )
        })
    }

    const SupportIcon =
        Object.entries(SUPPORT_ICONS).find(([domain]) => supportUrl.includes(domain))?.[1] ??
        IconMessageChatbot

    return (
        <>
            {!hideGetLink &&
                (isMobile ? (
                    <ActionIcon
                        aria-label={t(baseTranslations.getLink)}
                        onClick={handleGetLink}
                        size="xl"
                        variant="outline"
                    >
                        <IconLink size={22} />
                    </ActionIcon>
                ) : (
                    <Button
                        h={44}
                        leftSection={<IconLink size={20} />}
                        onClick={handleGetLink}
                        variant="outline"
                    >
                        {t(baseTranslations.getLink)}
                    </Button>
                ))}

            {supportUrl !== '' && (
                <ActionIcon
                    aria-label="Support"
                    component="a"
                    href={supportUrl}
                    rel="noopener noreferrer"
                    size="xl"
                    target="_blank"
                >
                    <SupportIcon size={22} />
                </ActionIcon>
            )}
        </>
    )
}
