import { Card, Collapse, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'

import { vibrate } from '@shared/utils/vibrate'

import classes from './subscription-info.module.css'
import { SubscriptionStatus } from './subscription-status.component'
import { useSubscriptionFacts } from './use-subscription-facts'

export const SubscriptionInfoCollapsedWidget = () => {
    const facts = useSubscriptionFacts()
    const [isExpanded, setIsExpanded] = useState(false)

    const rows = [
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
            <UnstyledButton
                aria-expanded={isExpanded}
                className={classes.summary}
                onClick={() => {
                    vibrate('tap')
                    setIsExpanded(!isExpanded)
                }}
            >
                <span className={classes.dot} data-tone={facts.tone} />
                <div className={classes.summaryText}>
                    <Text c="white" fw={600} truncate>
                        {facts.username}
                    </Text>
                    <Text c="dimmed" size="sm" truncate>
                        {facts.expiresRelative}
                    </Text>
                </div>
                <IconChevronDown
                    className={classes.chevron}
                    data-expanded={isExpanded || undefined}
                    size={18}
                />
            </UnstyledButton>

            <Collapse expanded={isExpanded} keepMounted>
                <div className={classes.rows}>
                    {rows.map((row) => (
                        <div className={classes.row} key={row.label}>
                            <Text c="dimmed" size="sm">
                                {row.label}
                            </Text>
                            <Text c="white" component="div" fw={600} size="sm" truncate>
                                {row.value}
                            </Text>
                        </div>
                    ))}
                </div>
            </Collapse>
        </Card>
    )
}
