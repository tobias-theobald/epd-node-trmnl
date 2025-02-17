import {ImageArrayHeight, ImageArrayWidth} from '../helpers/constants';
import {epdInitFast, gpioSpiInit} from '../services/device';
import {epdShowImageArray, epdSleep} from '../services/device';
import {delayAsync} from '../utils';

let i = 0;
console.log('EPD_7IN5_V2_test Demo');
gpioSpiInit();

do {
    console.time('full');

    console.log('e-Paper Init and Clear...');
    epdInitFast();
    // epdClear();

    const blackimage = new Uint8Array(ImageArrayWidth * ImageArrayHeight);
    for (let j = 0; j < ImageArrayHeight; j++) {
        for (let i = 0; i < ImageArrayWidth; i++) {
            blackimage[i + j * ImageArrayWidth] = (i / ImageArrayWidth) < (j / ImageArrayHeight) ? 0x00 : 0xFF;
        }
    }

    console.log('Showing image');
    epdShowImageArray(blackimage);

    console.log('Goto Sleep...');
    epdSleep();

    console.timeEnd('full');

    await delayAsync(5000);
    i++;
} while (i < 5);
