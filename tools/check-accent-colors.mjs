#!/usr/bin/env node
// Checks the rules the page's main colours must keep. Run after changing the palettes:
//   node tools/check-accent-colors.mjs   (uses the types installed in frontend/node_modules)
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const {
    SUBSCRIPTION_PAGE_ACCENT_COLORS_VALUES: names,
    SUBSCRIPTION_PAGE_ACCENT_PALETTES: palettes,
    SubscriptionPageRawConfigSchema: schema
} = require('@umiji/subscription-page-types')

const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

assert.equal(names.length, 8, 'brokers choose from 8 colours')

for (const name of names) {
    const { shades } = palettes[name]
    assert.equal(shades.length, 10, `${name}: a Mantine scale has 10 shades`)
    assert.ok(contrast('#FFFFFF', shades[8]) >= 4.5, `${name}: white text on the filled colour`)
    assert.ok(contrast(shades[4], '#1B1218') >= 4.5, `${name}: coloured text on the dark page`)
}

// The smallest config the schema accepts.
const config = {
    version: '1',
    locales: ['en'],
    brandingSettings: { title: 'x', logoUrl: '', supportUrl: 'https://example.com' },
    uiConfig: { subscriptionInfoBlockType: 'expanded', installationGuidesBlockType: 'cards' },
    baseTranslations: Object.fromEntries(
        Object.keys(schema.shape.baseTranslations.shape).map((key) => [key, { en: 'x' }])
    ),
    svgLibrary: {},
    platforms: {}
}
const withColor = (accentColor) => ({
    ...config,
    brandingSettings: { ...config.brandingSettings, accentColor }
})

assert.equal(schema.parse(withColor(undefined)).brandingSettings.accentColor, 'rose', 'older configs')
assert.equal(schema.parse(withColor('plum')).brandingSettings.accentColor, 'plum')
// The server writes this value into the page's HTML, so anything off the list must be refused.
assert.equal(schema.safeParse(withColor('"><script>')).success, false)
assert.equal(schema.safeParse(withColor('orange')).success, false)

console.log(`ok: ${names.length} colours`)
