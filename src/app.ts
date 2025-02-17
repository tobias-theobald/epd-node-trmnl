import {jimpImageToEpdImage, showEpdImageOnLocalEpd} from './services/epdImageRenderer';
import {Jimp, JimpInstance} from "jimp";
import {TRMNL_ACCESS_TOKEN, TRMNL_BASE_URL} from "./helpers/constants";
import {delayAsync} from "./utils";

const DEFAULT_REFRESH_RATE_SECONDS = 900;

async function renderImageFromTrmnl() {
    const response = await fetch(new URL('/api/display', TRMNL_BASE_URL).toString(), {
        method: 'GET',
        headers: {
            'access-token': TRMNL_ACCESS_TOKEN,
        },
    });

    if (!response.ok) {
        console.error('Failed to fetch display data', response);
        return;
    }

    const displayData = await response.json();
    console.log('Display data', displayData);
    if (!displayData.image_url) {
        console.error('No image URL in display data', displayData);
        return;
    }
    let nextRefresh = displayData.refresh_rate ?? DEFAULT_REFRESH_RATE_SECONDS;

    const imageResponse = await fetch(displayData.image_url);
    if (!imageResponse.ok) {
        console.error('Failed to fetch image', imageResponse);
        return;
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const image = await Jimp.fromBuffer(imageBuffer);

    const epdImage = jimpImageToEpdImage(image as JimpInstance, true);
    await showEpdImageOnLocalEpd(epdImage);

    return nextRefresh;
}

do {
    let nextRefreshSecs = DEFAULT_REFRESH_RATE_SECONDS;
    try {
        nextRefreshSecs = await renderImageFromTrmnl();
    } catch (e) {
        console.error('Error in main loop', e);
    }
    console.debug(`Waiting for ${nextRefreshSecs} seconds before next refresh`);
    await delayAsync(nextRefreshSecs * 1000);
} while (true);
