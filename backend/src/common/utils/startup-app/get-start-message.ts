import { getBorderCharacters, table } from 'table';

export async function getStartMessage() {
    return table([['Docs → https://github.com/therewasluna/umiji']], {
        header: {
            content: `Umiji Subscription Page v${__UMIJI_SUBPAGE_VERSION__}`,
            alignment: 'center',
        },
        columnDefault: {
            width: 60,
        },
        columns: {
            0: { alignment: 'center' },
            1: { alignment: 'center' },
        },
        drawVerticalLine: () => false,
        border: getBorderCharacters('ramac'),
    });
}
