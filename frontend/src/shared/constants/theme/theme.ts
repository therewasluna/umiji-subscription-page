import { createTheme, DEFAULT_THEME, MantineColorsTuple } from '@mantine/core'
import {
    isSubscriptionPageAccentColor,
    SUBSCRIPTION_PAGE_ACCENT_PALETTES,
    SUBSCRIPTION_PAGE_DEFAULT_ACCENT_COLOR
} from '@umiji/subscription-page-types'

import { variantColorResolver } from './colors-resolver'
import components from './overrides'

const hslToHex = (h: number, s: number, l: number) => {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
    const channel = (n: number) => {
        const k = (n + h / 30) % 12
        const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
        return Math.round(value * 255)
            .toString(16)
            .padStart(2, '0')
    }
    return `#${channel(0)}${channel(8)}${channel(4)}`
}

// Saturation and lightness of the panel's rose-tinted greys. Only the hue changes per main colour, so
// every colour gets the same depth and contrast the panel has.
const DARK_SL = [
    [20, 86.3],
    [15, 75.1],
    [9.1, 59],
    [8.2, 45.3],
    [12.1, 27.6],
    [13.4, 19],
    [16.4, 13.1],
    [20, 8.8],
    [22.6, 6.1],
    [25, 3.1]
]
const GRAY_SL = [
    [28, 95.1],
    [20.8, 89.6],
    [17.4, 82],
    [14.1, 72.2],
    [11, 60.8],
    [8.7, 50.2],
    [9.7, 40.4],
    [10, 31.4],
    [11.1, 22.9],
    [12.8, 15.3]
]

const tinted = (scale: number[][], hue: number) =>
    scale.map(([s, l]) => hslToHex(hue, s, l)) as unknown as MantineColorsTuple

const coral: MantineColorsTuple = [
    '#FFF1EB',
    '#FFDCCD',
    '#FFC1A8',
    '#FFA684',
    '#FF9469',
    '#FF8A5C',
    '#F87C4C',
    '#F0703F',
    '#E8653A',
    '#C9532C'
]

// The server writes the broker's main colour onto <html>, so the first paint is already in it.
const requestedAccent = document.documentElement.dataset.accent
const { hue, shades } =
    SUBSCRIPTION_PAGE_ACCENT_PALETTES[
        isSubscriptionPageAccentColor(requestedAccent)
            ? requestedAccent
            : SUBSCRIPTION_PAGE_DEFAULT_ACCENT_COLOR
    ]

const accent = shades as unknown as MantineColorsTuple
const dark = tinted(DARK_SL, hue)
const gray = tinted(GRAY_SL, hue)

export const QR_MODULE_COLOR = dark[9]

document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark[7])

export const theme = createTheme({
    variantColorResolver,
    components,
    cursorType: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontFamilyMonospace: 'Fira Mono, monospace',
    breakpoints: {
        xs: '30em',
        sm: '40em',
        md: '48em',
        lg: '64em',
        xl: '80em',
        '2xl': '96em',
        '3xl': '120em',
        '4xl': '160em'
    },
    scale: 1,
    fontSmoothing: true,
    focusRing: 'auto',
    white: '#ffffff',
    black: '#24292f',
    colors: {
        dark,
        gray,
        accent,
        // Configs name "cyan" for every default icon: it means the page's main colour.
        cyan: accent,
        lime: gray,
        // No yellow in Umiji: warnings use coral, and green joins teal for success.
        yellow: coral,
        orange: coral,
        green: DEFAULT_THEME.colors.teal
    },
    primaryShade: 8,
    primaryColor: 'accent',
    autoContrast: true,
    luminanceThreshold: 0.3,
    headings: {
        fontWeight: '600'
    },
    defaultRadius: 'md'
})
