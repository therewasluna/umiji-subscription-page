import { Card, Text } from '@mantine/core'

import { TideShared } from '@shared/ui'

import classes from './subscription-info.module.css'
import { SubscriptionStatus } from './subscription-status.component'
import { useSubscriptionFacts } from './use-subscription-facts'

// The crest stays in view when the card is full, and a thin line of water never quite runs dry.
const MAX_LEVEL = 0.86
const MIN_LEVEL = 0.07

export const SubscriptionInfoExpandedWidget = () => {
    const facts = useSubscriptionFacts()
    const isOff = facts.tone === 'off'
    const level = isOff ? MIN_LEVEL : MIN_LEVEL + facts.trafficLeft * (MAX_LEVEL - MIN_LEVEL)

    return (
        <Card className={classes.hero} padding={0}>
            <TideShared
                color={isOff ? 'var(--mantine-color-dark-2)' : 'var(--mantine-primary-color-5)'}
                level={level}
                still={isOff}
            />

            <div className={classes.heroBody}>
                <div className={classes.heroTop}>
                    <Text c="white" fw={600} truncate>
                        {facts.username}
                    </Text>
                    <SubscriptionStatus tone={facts.tone}>{facts.statusText}</SubscriptionStatus>
                </div>

                <div className={classes.heroStats}>
                    <div>
                        <Text c="dark.0" size="sm">
                            {facts.labels.bandwidth}
                        </Text>
                        <div className={classes.heroTraffic}>
                            <bdi className={classes.heroUsed}>{facts.trafficUsed}</bdi>
                            <span className={classes.heroLimit}>
                                / <bdi>{facts.trafficLimit}</bdi>
                            </span>
                        </div>
                    </div>

                    <div>
                        <Text c="dark.0" size="sm">
                            {facts.labels.expires}
                        </Text>
                        <div className={classes.heroDate}>{facts.expiresDate}</div>
                        {facts.expiresFromNow && (
                            <Text c="dark.0" size="sm">
                                {facts.expiresFromNow}
                            </Text>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}
