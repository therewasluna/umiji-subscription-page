import { CSSProperties, useId } from 'react'

import classes from './tide.module.css'

// Four swells across twice the card's width: sliding by half that width loops without a seam.
const CREST = 'M0 6Q75 0 150 6T300 6T450 6T600 6T750 6T900 6T1050 6T1200 6'

interface IProps {
    color: string
    /** How full the card is, from 0 to 1. */
    level: number
    still?: boolean
}

/** The logo's waves as a sea that fills its card: the water level is the traffic the user has left. */
export const TideShared = ({ color, level, still }: IProps) => {
    const gradientId = useId()
    const fill = `url(#${gradientId})`

    return (
        <div
            aria-hidden
            className={classes.tide}
            data-still={still || undefined}
            style={{ '--tide-level': level, color } as CSSProperties}
        >
            <div className={classes.sea}>
                <svg
                    className={`${classes.wave} ${classes.back}`}
                    preserveAspectRatio="none"
                    viewBox="0 0 1200 100"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
                            <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
                        </linearGradient>
                    </defs>
                    <path d={`${CREST}V100H0Z`} fill={fill} />
                    <path className={classes.crest} d={CREST} />
                </svg>
                <svg className={classes.wave} preserveAspectRatio="none" viewBox="0 0 1200 100">
                    <path d={`${CREST}V100H0Z`} fill={fill} />
                    <path className={classes.crest} d={CREST} />
                </svg>
            </div>
        </div>
    )
}
