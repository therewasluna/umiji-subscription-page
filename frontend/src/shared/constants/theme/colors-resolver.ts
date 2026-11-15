import {
    defaultVariantColorsResolver,
    parseThemeColor,
    rgba,
    VariantColorsResolver
} from '@mantine/core'

// Same rule as the panel: colour carries meaning. Success, danger and warning keep their hue as an
// outline, and every decorative hue becomes one quiet neutral.
const SEMANTIC = ['teal', 'green', 'red', 'orange', 'yellow']
const TINTED_VARIANTS = ['soft', 'light', 'outline']

const NEUTRAL = {
    background: 'var(--mantine-color-dark-6)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    color: 'var(--mantine-color-dark-1)',
    hover: 'var(--mantine-color-dark-5)'
}

export const variantColorResolver: VariantColorsResolver = (input) => {
    const defaultResolvedColors = defaultVariantColorsResolver(input)

    if (!input.variant || !TINTED_VARIANTS.includes(input.variant)) {
        return defaultResolvedColors
    }

    const parsed = parseThemeColor({
        color: input.color || input.theme.primaryColor,
        theme: input.theme,
        colorScheme: 'dark'
    })
    const shades = input.theme.colors[parsed.color]
    if (!shades) {
        return defaultResolvedColors
    }

    if (SEMANTIC.includes(parsed.color)) {
        if (input.variant === 'outline') return defaultResolvedColors

        return {
            background: 'transparent',
            border: `1px solid ${rgba(shades[4], 0.45)}`,
            color: `var(--mantine-color-${parsed.color}-4)`,
            hover: rgba(shades[4], 0.08)
        }
    }

    // The main colour (cyan is aliased to it) keeps its light tint and outline; soft goes quiet too.
    const isPrimary = parsed.color === input.theme.primaryColor || parsed.color === 'cyan'
    if (isPrimary && input.variant !== 'soft') {
        return defaultResolvedColors
    }

    if (input.variant === 'outline') {
        return {
            ...NEUTRAL,
            background: 'transparent',
            border: '1px solid var(--mantine-color-dark-4)'
        }
    }

    return NEUTRAL
}
