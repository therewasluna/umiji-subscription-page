import { Accordion, Group, Stack, Text } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'

import { ThemeIconShared } from '@shared/ui'
import { getLocalizedText } from '@shared/utils/config-parser'
import { vibrate } from '@shared/utils/vibrate'

import { IBlockRendererProps } from '../renderer-block.interface'
import classes from './accordion-block.module.css'

export const AccordionBlockRenderer = ({
    blocks,
    isMobile,
    currentLang,
    renderBlockButtons,
    getIconFromLibrary
}: IBlockRendererProps) => {
    const [openedAccordion, setOpenedAccordion] = useState<null | string>('0')

    return (
        <Accordion
            chevron={<IconChevronDown size={18} />}
            classNames={{
                item: classes.accordionItem,
                control: classes.accordionControl,
                chevron: classes.accordionChevron,
                content: classes.accordionContent,
                label: classes.accordionLabel
            }}
            onChange={(value) => {
                vibrate('tap')
                setOpenedAccordion(value)
            }}
            transitionDuration={200}
            value={openedAccordion}
        >
            {blocks.map((block, index) => (
                <Accordion.Item key={index} value={String(index)}>
                    <Accordion.Control>
                        <Group gap="md" wrap="nowrap">
                            <ThemeIconShared
                                getIconFromLibrary={getIconFromLibrary}
                                isMobile={isMobile}
                                svgIconColor={block.svgIconColor}
                                svgIconKey={block.svgIconKey}
                            />
                            <Text
                                c="white"
                                dangerouslySetInnerHTML={{
                                    __html: getLocalizedText(block.title, currentLang)
                                }}
                                fw={600}
                                style={{ flex: 1, minWidth: 0 }}
                                truncate
                            />
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
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
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion>
    )
}
