import {intToRGBA, JimpInstance, ResizeStrategy} from 'jimp';
import {
    ImageArrayHeight,
    ImageArrayWidth,
    PIXEL_HEIGHT,
    PIXEL_WIDTH
} from '../helpers/constants';
import {delayAsync} from '../utils';

export const jimpImageToEpdImage = (jimpImage: JimpInstance, resizeInsteadOfCrop: boolean): Uint8Array => {
    const jimpImageWorkingCopy = jimpImage.clone();
    if (jimpImageWorkingCopy.width !== PIXEL_WIDTH || jimpImageWorkingCopy.height !== PIXEL_HEIGHT) {
        if (resizeInsteadOfCrop) {
            jimpImageWorkingCopy.resize({w: PIXEL_WIDTH, h: PIXEL_HEIGHT, mode: ResizeStrategy.NEAREST_NEIGHBOR});
        } else {
            jimpImageWorkingCopy.crop({w: PIXEL_WIDTH, h: PIXEL_HEIGHT, x: 0, y: 0});
        }
    }
    jimpImageWorkingCopy.greyscale();

    const image = new Uint8Array(ImageArrayWidth * ImageArrayHeight);
    for (let j = 0; j < ImageArrayHeight; j++) { // row
        for (let i = 0; i < ImageArrayWidth; i++) { // 8-bit block of pixels inside a row
            let value = 0;
            for (let k = 0; k < 8; k++) { // bit inside an 8-bit block
                const pixel = jimpImageWorkingCopy.getPixelColor(i * 8 + k, j);
                // Since the image is greyscale, r, g, and b are all the same
                const {r} = intToRGBA(pixel);
                if (r > 128) {
                    value |= 1 << (7 - k);
                }
            }
            image[i + j * ImageArrayWidth] = value;
            // throw new Error('stop');
        }
    }
    return image;
};

let gpioInitialized = false;

export async function showEpdImageOnLocalEpd(epdImage: Uint8Array): Promise<void> {
    console.debug('Showing image on local EPD');
    const {epdInitFast, epdShowImageArray, epdSleep, gpioSpiInit} = await import('./device');
    if (!gpioInitialized) {
        gpioSpiInit();
        gpioInitialized = true;
    }
    // With all of the sync waiting happening here, this might improve interactivity, but it might not
    await delayAsync(1);
    // console.log('Showing image');
    epdInitFast();
    epdShowImageArray(epdImage);
    epdSleep();
}
