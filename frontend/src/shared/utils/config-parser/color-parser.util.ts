/** A config's icon colour is a theme colour name or a hex value; "cyan" follows the page's main colour. */
export const getIconColor = (color: string) =>
    color.startsWith('#') ? color : `var(--mantine-color-${color}-4)`
