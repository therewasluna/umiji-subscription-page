import {
    ActionIcon,
    Badge,
    Card,
    CopyButton,
    Group,
    Stack,
    Text,
    ThemeIcon,
    Title
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconBrandTelegram, IconCheck, IconCopy, IconKey, IconQrcode } from '@tabler/icons-react'

import { useTranslation } from '@shared/hooks'
import { QrPlateShared } from '@shared/ui'
import { vibrate } from '@shared/utils/vibrate'

import { useSubscription } from '@entities/subscription-info-store'

import classes from './raw-keys.module.css'

interface ParsedLink {
    fullLink: string
    name: string
}

const parseLinks = (links: string[]): ParsedLink[] => {
    return links.map((link) => {
        // Telegram links carry their name in a parameter, because # would break them.
        if (link.startsWith('tg://')) {
            return {
                name: new URLSearchParams(link.split('?')[1]).get('remark') || 'Telegram',
                fullLink: link
            }
        }

        const hashIndex = link.lastIndexOf('#')
        let name = 'Unknown'

        if (hashIndex !== -1) {
            const encodedName = link.substring(hashIndex + 1)
            try {
                name = decodeURIComponent(encodedName)
            } catch {
                name = encodedName
            }
        }

        return {
            name,
            fullLink: link
        }
    })
}

export const RawKeysWidget = () => {
    const { t, baseTranslations } = useTranslation()
    const subscription = useSubscription()

    if (subscription.links.length === 0) return null

    const parsedLinks = parseLinks(subscription.links)

    const handleShowQr = (link: ParsedLink) => {
        modals.open({
            title: link.name,
            children: (
                <Stack align="center" gap="lg">
                    <QrPlateShared value={link.fullLink} />
                    <Text c="dimmed" size="sm" ta="center">
                        {t(baseTranslations.scanToImport)}
                    </Text>
                </Stack>
            )
        })
    }

    return (
        <section>
            <Group gap="sm" mb="md">
                <Title c="white" fw={600} fz={20} order={2}>
                    {t(baseTranslations.connectionKeysHeader)}
                </Title>
                {parsedLinks.length > 1 && (
                    <Badge color="gray" size="lg" variant="soft">
                        {parsedLinks.length}
                    </Badge>
                )}
            </Group>

            <Card padding={0}>
                <div className={classes.keys}>
                    {parsedLinks.map((link, index) => {
                        const isTelegram = link.fullLink.startsWith('tg://')
                        const Icon = isTelegram ? IconBrandTelegram : IconKey

                        return (
                            <div className={classes.key} key={index}>
                                <ThemeIcon
                                    radius="md"
                                    size={40}
                                    style={{
                                        color: 'var(--mantine-primary-color-4)',
                                        flexShrink: 0
                                    }}
                                    variant="soft"
                                >
                                    <Icon size={20} />
                                </ThemeIcon>
                                <Text
                                    c="white"
                                    className={classes.keyName}
                                    fw={500}
                                    size="sm"
                                    truncate
                                >
                                    {link.name}
                                </Text>

                                <Group gap={6} wrap="nowrap">
                                    {isTelegram && (
                                        <ActionIcon
                                            aria-label="Open in Telegram"
                                            component="a"
                                            href={link.fullLink}
                                            onClick={() => vibrate('tap')}
                                            size="lg"
                                            variant="light"
                                        >
                                            <IconBrandTelegram size={18} />
                                        </ActionIcon>
                                    )}
                                    <CopyButton value={link.fullLink}>
                                        {({ copied, copy }) => (
                                            <ActionIcon
                                                aria-label={t(baseTranslations.copyLink)}
                                                color={copied ? 'teal' : 'gray'}
                                                onClick={() => {
                                                    vibrate('drop')
                                                    copy()
                                                }}
                                                size="lg"
                                            >
                                                {copied ? (
                                                    <IconCheck size={18} />
                                                ) : (
                                                    <IconCopy size={18} />
                                                )}
                                            </ActionIcon>
                                        )}
                                    </CopyButton>
                                    <ActionIcon
                                        aria-label={t(baseTranslations.scanToImport)}
                                        onClick={() => {
                                            vibrate('tap')
                                            handleShowQr(link)
                                        }}
                                        size="lg"
                                    >
                                        <IconQrcode size={18} />
                                    </ActionIcon>
                                </Group>
                            </div>
                        )
                    })}
                </div>
            </Card>
        </section>
    )
}
