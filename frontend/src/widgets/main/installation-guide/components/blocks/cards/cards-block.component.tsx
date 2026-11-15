import { IBlockRendererProps } from '../renderer-block.interface'
import { StepRow } from '../step-row/step-row.component'

export const CardsBlockRenderer = ({ blocks, svgLibrary: _, ...rest }: IBlockRendererProps) => (
    <>
        {blocks.map((block, index) => (
            <StepRow block={block} key={index} {...rest} />
        ))}
    </>
)
