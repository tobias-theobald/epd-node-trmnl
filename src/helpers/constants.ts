export const PIXEL_WIDTH = 800;
export const PIXEL_HEIGHT = 480;
export const ImageArrayWidth = PIXEL_WIDTH / 8;
export const ImageArrayHeight = PIXEL_HEIGHT;

export const EPD_DEVICE_LOCAL = 'local';

function readStringEnvironmentVariable(name: string, defaultValue: null): string | null;
function readStringEnvironmentVariable(name: string, defaultValue: string): string;
function readStringEnvironmentVariable(name: string): string;
function readStringEnvironmentVariable(name: string, defaultValue?: string | null): string | null {
    const value = process.env[name];
    if (value === undefined || value === '') {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`${name} is not set`);
    }
    return value;
}

export const TRMNL_BASE_URL = readStringEnvironmentVariable('TRMNL_BASE_URL',  'https://usetrmnl.com');
export const TRMNL_ACCESS_TOKEN = readStringEnvironmentVariable('TRMNL_ACCESS_TOKEN');
