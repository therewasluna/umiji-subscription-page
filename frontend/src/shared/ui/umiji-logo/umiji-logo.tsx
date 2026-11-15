import { Box, BoxProps, ElementProps } from '@mantine/core'

interface UmijiLogoProps
    extends ElementProps<'svg', keyof BoxProps>, Omit<BoxProps, 'children' | 'ref'> {
    size?: number | string
}

export function UmijiLogo({ size = 32, style, ...props }: UmijiLogoProps) {
    return (
        <Box
            component="svg"
            fill="none"
            style={{ width: size, height: size, ...style }}
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}>
                <path d="M1.75 6.25q1.56-2 3.13 0t3.12 0t3.13 0t3.12 0" />
                <path d="M1.75 10.75q1.56-2 3.13 0t3.12 0t3.13 0t3.12 0" />
            </g>
        </Box>
    )
}
