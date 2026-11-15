import { Stack, Text, Timeline } from '@mantine/core'

import { ThemeIconShared } from '@shared/ui'
import { getLocalizedText } from '@shared/utils/config-parser'

import { IBlockRendererProps } from '../renderer-block.interface'
import classes from './timeline-block.module.css'

export const TimelineBlockRenderer = ({
    blocks,
    isMobile,
    currentLang,
    renderBlockButtons,
    getIconFromLibrary
}: IBlockRendererProps) => {
    return (
        <div className={classes.timeline}>
            <Timeline
                active={-1}
                bulletSize={isMobile ? 36 : 40}
                classNames={{
                    item: classes.timelineItem,
                    itemBullet: classes.timelineItemBullet,
                    itemTitle: classes.timelineTitle
                }}
                lineWidth={1}
            >
                {blocks.map((block, index) => (
                    <Timeline.Item
                        bullet={
                            <ThemeIconShared
                                getIconFromLibrary={getIconFromLibrary}
                                isMobile={isMobile}
                                svgIconColor={block.svgIconColor}
                                svgIconKey={block.svgIconKey}
                            />
                        }
                        key={index}
                        title={
                            <Text
                                c="white"
                                dangerouslySetInnerHTML={{
                                    __html: getLocalizedText(block.title, currentLang)
                                }}
                                fw={600}
                            />
                        }
                    >
                        <Stack gap="sm">
                            <Text
                                c="dark.1"
                                dangerouslySetInnerHTML={{
                                    __html: getLocalizedText(block.description, currentLang)
                                }}
                                lh={1.65}
                                size="sm"
                                style={{ whiteSpace: 'pre-line' }}
                            />
                            {renderBlockButtons(block.buttons, 'light')}
                        </Stack>
                    </Timeline.Item>
                ))}
            </Timeline>
        </div>
    )
}
