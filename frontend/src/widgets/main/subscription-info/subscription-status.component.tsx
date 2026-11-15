import { ReactNode } from 'react'

import classes from './subscription-info.module.css'
import { TSubscriptionTone } from './use-subscription-facts'

export const SubscriptionStatus = ({
    children,
    tone
}: {
    children: ReactNode
    tone: TSubscriptionTone
}) => (
    <span className={classes.status} data-tone={tone}>
        {children}
    </span>
)
