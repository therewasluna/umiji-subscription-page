import { Card, Text } from '@mantine/core'

import classes from './subscription-info.module.css'
import { SubscriptionStatus } from './subscription-status.component'
import { useSubscriptionFacts } from './use-subscription-facts'

export const SubscriptionInfoCardsWidget = () => {
    const facts = useSubscriptionFacts()

    const cells = [
        { label: facts.labels.name, value: facts.username },
        {
            label: facts.labels.status,
            value: <SubscriptionStatus tone={facts.tone}>{facts.statusText}</SubscriptionStatus>
        },
        { label: facts.labels.expires, value: facts.expiresDate },
        {
            label: facts.labels.bandwidth,
            value: <bdi>{`${facts.trafficUsed} / ${facts.trafficLimit}`}</bdi>
        }
    ]

    return (
        <Card padding={0}>
            <div className={classes.strip}>
                {cells.map((cell) => (
                    <div className={classes.cell} key={cell.label}>
                        <Text c="dimmed" size="sm" truncate>
                            {cell.label}
                        </Text>
                        <Text c="white" component="div" fw={600} mt={4} truncate>
                            {cell.value}
                        </Text>
                    </div>
                ))}
            </div>
        </Card>
    )
}
