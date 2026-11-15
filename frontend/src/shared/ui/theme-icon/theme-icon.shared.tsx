import { ThemeIcon } from '@mantine/core'

import { getIconColor } from '@shared/utils/config-parser'

import classes from './theme-icon.module.css'

interface IProps {
    getIconFromLibrary: (iconKey: string) => string
    isMobile: boolean
    svgIconColor: string
    svgIconKey: string
}

/** The panel's icon tile: a quiet neutral square, with colour only in the glyph. */
export const ThemeIconShared = (props: IProps) => {
    const { isMobile, svgIconColor, svgIconKey, getIconFromLibrary } = props

    return (
        <ThemeIcon
            radius="md"
            size={isMobile ? 36 : 40}
            style={{ color: getIconColor(svgIconColor), flexShrink: 0 }}
            variant="soft"
        >
            <span
                className={classes.glyph}
                dangerouslySetInnerHTML={{
                    __html: getIconFromLibrary(svgIconKey)
                }}
            />
        </ThemeIcon>
    )
}
