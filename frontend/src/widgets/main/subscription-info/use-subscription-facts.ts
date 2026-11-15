import dayjs from 'dayjs'

import { useTranslation } from '@shared/hooks'
import { formatDate, getExpirationTextUtil } from '@shared/utils/config-parser'

import { useSubscription } from '@entities/subscription-info-store'

export type TSubscriptionTone = 'off' | 'ok' | 'warn'

const getTone = (isActive: boolean, daysLeft: number): TSubscriptionTone => {
    if (!isActive) return 'off'
    return daysLeft > 3 ? 'ok' : 'warn'
}

/** What every subscription info layout shows, worked out once so the layouts can't disagree. */
export const useSubscriptionFacts = () => {
    const { t, currentLang, baseTranslations } = useTranslation()
    const { user } = useSubscription()

    const isActive = user.userStatus === 'ACTIVE'
    const limitBytes = Number(user.trafficLimitBytes)
    const leftFraction = limitBytes > 0 ? 1 - Number(user.trafficUsedBytes) / limitBytes : 1
    const expiresAt = dayjs(user.expiresAt).locale(currentLang)

    return {
        labels: {
            bandwidth: t(baseTranslations.bandwidth),
            expires: t(baseTranslations.expires),
            name: t(baseTranslations.name),
            status: t(baseTranslations.status)
        },
        username: user.username,
        tone: getTone(isActive, user.daysLeft),
        statusText: isActive ? t(baseTranslations.active) : t(baseTranslations.inactive),
        expiresDate: formatDate(user.expiresAt, currentLang, baseTranslations),
        expiresRelative: getExpirationTextUtil(user.expiresAt, currentLang, baseTranslations),
        // Beside the date and its "Expires" label; a subscription that never ends has nothing to add.
        expiresFromNow: expiresAt.year() === 2099 ? null : expiresAt.fromNow(),
        trafficUsed: user.trafficUsed,
        trafficLimit: limitBytes > 0 ? user.trafficLimit : '∞',
        trafficLeft: Math.min(Math.max(leftFraction, 0), 1)
    }
}
