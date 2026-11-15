import { Image } from '@mantine/core'
import { renderSVG } from 'uqr'

import { QR_MODULE_COLOR } from '@shared/constants'

/** Dark modules on white, whatever the page's colour: inverted codes fail on some phone scanners. */
export const QrPlateShared = ({ value }: { value: string }) => {
    const svg = renderSVG(value, { whiteColor: '#FFFFFF', blackColor: QR_MODULE_COLOR })

    return (
        <Image
            alt=""
            maw={320}
            radius="md"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
        />
    )
}
