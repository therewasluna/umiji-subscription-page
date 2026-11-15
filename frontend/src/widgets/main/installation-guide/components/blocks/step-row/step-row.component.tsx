import { Text, Title } from '@mantine/core'

import { ThemeIconShared } from '@shared/ui'
import { getLocalizedText } from '@shared/utils/config-parser'

import { IBlockRendererProps } from '../renderer-block.interface'
import classes from './step-row.module.css'

type TBlock = IBlockRendererProps['blocks'][number]

interface IProps extends Omit<IBlockRendererProps, 'blocks' | 'svgLibrary'> {
    block: TBlock
    plain?: boolean
}

/** One step on the guide's grid: every step's icon, text and buttons share the same columns. */
export const StepRow = (props: IProps) => {
    const { block, currentLang, getIconFromLibrary, isMobile, plain, renderBlockButtons } = props

    return (
        <div className={classes.step} data-plain={plain || undefined}>
            {!plain && (
                <div className={classes.icon}>
                    <ThemeIconShared
                        getIconFromLibrary={getIconFromLibrary}
                        isMobile={isMobile}
                        svgIconColor={block.svgIconColor}
                        svgIconKey={block.svgIconKey}
                    />
                </div>
            )}
            <Title
                c="white"
                className={classes.title}
                dangerouslySetInnerHTML={{
                    __html: getLocalizedText(block.title, currentLang)
                }}
                fw={600}
                fz={16}
                lh={1.4}
                order={3}
            />
            <Text
                c="dark.1"
                className={classes.text}
                dangerouslySetInnerHTML={{
                    __html: getLocalizedText(block.description, currentLang)
                }}
                lh={1.65}
                size="sm"
            />
            {block.buttons.length > 0 && (
                <div className={classes.actions}>
                    {renderBlockButtons(block.buttons, plain ? 'subtle' : 'light')}
                </div>
            )}
        </div>
    )
}
