import lg from 'lgpio';
import {readFileSync} from 'node:fs';
import {ImageArrayHeight, ImageArrayWidth} from '../helpers/constants';

const {gpiochipOpen, gpioClaimInput, gpioClaimOutput, gpioRead, gpioWrite, spiOpen, spiWrite} = lg;

let gpioHandle: number;
let spiHandle: number;

export const EPD_RST_PIN = 17;
export const EPD_DC_PIN = 25;
export const EPD_CS_PIN = 8;
export const EPD_BUSY_PIN = 24;
export const EPD_PWR_PIN = 18;

export function gpioDigitalWrite(pin: number, value: 0 | 1): void {
    gpioWrite(gpioHandle, pin, value === 1);
}

export function gpioDigitalRead(pin: number): boolean {
    return gpioRead(gpioHandle, pin);
}

export function spiWriteByte(value: number): void {
    // copy first len bytes of pData into a new Uint8Array
    spiWrite(spiHandle, new Uint8Array([value]));
}

export function spiWriteNBytes(pData: Uint8Array, len: number): void {
    // copy first len bytes of pData into a new Uint8Array
    if (len !== pData.length) {
        throw new Error('length does not match');
    }
    spiWrite(spiHandle, pData);
}

export function gpioMode(pin: number, mode: number): void {
    if (mode === 0 || mode === 512) {
        gpioClaimInput(gpioHandle, pin);
    } else {
        gpioClaimOutput(gpioHandle, pin, undefined, false);
    }
}

export function gpioInit(): void {
    gpioMode(EPD_BUSY_PIN, 0);
    gpioMode(EPD_RST_PIN, 1);
    gpioMode(EPD_DC_PIN, 1);
    gpioMode(EPD_CS_PIN, 1);
    gpioMode(EPD_PWR_PIN, 1);
    gpioDigitalWrite(EPD_CS_PIN, 1);
    gpioDigitalWrite(EPD_PWR_PIN, 1);
}


const waitableBuffer = new Int32Array(new SharedArrayBuffer(4));

export function delaySync(ms: number): void {
    if (typeof Bun !== 'undefined') {
        Bun.sleepSync(ms);
    } else {
        Atomics.wait(waitableBuffer, 0, 0, ms);
    }
}

export function gpioSpiInit(): void {
    // example of reading /proc/cpuinfo
    // ...
    // Model           : Raspberry Pi 3 Model A Plus Rev 1.0
    const procInfo: string = readFileSync('/proc/cpuinfo', 'utf8');
    const modelLine = procInfo.split('\n').filter((line) => line.startsWith('Model'))[0] ?? ':';
    const model = modelLine.split(':')[1].trim();
    const isRaspberryPi = model.startsWith('Raspberry Pi');
    const isRaspberryPi5 = model.startsWith('Raspberry Pi 5');

    if (!isRaspberryPi) {
        throw new Error('This library only supports Raspberry Pi');
    }
    if (isRaspberryPi5) {
        gpioHandle = gpiochipOpen(4);
    } else {
        gpioHandle = gpiochipOpen(0);
    }
    if (gpioHandle < 0) {
        throw new Error('Failed to open GPIO chip');
    }
    spiHandle = spiOpen(0, 0, 10000000, 0);
    gpioInit();
}

// Software reset
function epdReset(): void {
    gpioDigitalWrite(EPD_RST_PIN, 1);
    delaySync(20);
    gpioDigitalWrite(EPD_RST_PIN, 0);
    delaySync(2);
    gpioDigitalWrite(EPD_RST_PIN, 1);
    delaySync(20);
}

function epdSendCommand(reg: number) {
    gpioDigitalWrite(EPD_DC_PIN, 0);
    gpioDigitalWrite(EPD_CS_PIN, 0);
    spiWriteByte(reg);
    gpioDigitalWrite(EPD_CS_PIN, 1);
}

function epdSendDataByte(data: number) {
    gpioDigitalWrite(EPD_DC_PIN, 1);
    gpioDigitalWrite(EPD_CS_PIN, 0);
    spiWriteByte(data);
    gpioDigitalWrite(EPD_CS_PIN, 1);
}

function epdSendDataArray(pData: Uint8Array, len: number) {
    gpioDigitalWrite(EPD_DC_PIN, 1);
    gpioDigitalWrite(EPD_CS_PIN, 0);
    spiWriteNBytes(pData, len);
    gpioDigitalWrite(EPD_CS_PIN, 1);
}

function epdWaitUntilIdle(): void {
    // console.debug('e-Paper busy');
    do {
        delaySync(5);
    } while (!(gpioDigitalRead(EPD_BUSY_PIN)));
    delaySync(5);
    // console.debug('e-Paper busy release');
}

function epdTurnOnDisplay(): void {
    epdSendCommand(0x12);			//DISPLAY REFRESH
    delaySync(100);	        //!!!The delay here is necessary, 200uS at least!!!
    epdWaitUntilIdle();
}

export function epdInit(): void {
    epdReset();
    epdSendCommand(0x01);			//POWER SETTING
    epdSendDataByte(0x07);
    epdSendDataByte(0x07);    //VGH=20V,VGL=-20V
    epdSendDataByte(0x3f);		//VDH=15V
    epdSendDataByte(0x3f);		//VDL=-15V

    //Enhanced display drive(Add 0x06 command)
    epdSendCommand(0x06);			//Booster Soft Start
    epdSendDataByte(0x17);
    epdSendDataByte(0x17);
    epdSendDataByte(0x28);
    epdSendDataByte(0x17);

    epdSendCommand(0x04); //POWER ON
    delaySync(100);
    epdWaitUntilIdle();        //waiting for the electronic paper IC to release the idle signal

    epdSendCommand(0X00);			//PANNEL SETTING
    epdSendDataByte(0x1F);   //KW-3f   KWR-2F	BWROTP 0f	BWOTP 1f

    epdSendCommand(0x61);        	//tres
    epdSendDataByte(0x03);		//source 800
    epdSendDataByte(0x20);
    epdSendDataByte(0x01);		//gate 480
    epdSendDataByte(0xE0);

    epdSendCommand(0X15);
    epdSendDataByte(0x00);

    epdSendCommand(0X50);			//VCOM AND DATA INTERVAL SETTING
    epdSendDataByte(0x10);
    epdSendDataByte(0x07);

    epdSendCommand(0X60);			//TCON SETTING
    epdSendDataByte(0x22);
}

export function epdInitFast() {
    epdReset();
    epdSendCommand(0X00);			//PANEL SETTING
    epdSendDataByte(0x1F);   //KW-3f   KWR-2F	BWROTP 0f	BWOTP 1f

    epdSendCommand(0X50);			//VCOM AND DATA INTERVAL SETTING
    epdSendDataByte(0x10);
    epdSendDataByte(0x07);

    epdSendCommand(0x04); //POWER ON
    delaySync(100);
    epdWaitUntilIdle();        //waiting for the electronic paper IC to release the idle signal

    //Enhanced display drive(Add 0x06 command)
    epdSendCommand(0x06);			//Booster Soft Start
    epdSendDataByte(0x27);
    epdSendDataByte(0x27);
    epdSendDataByte(0x18);
    epdSendDataByte(0x17);

    epdSendCommand(0xE0);
    epdSendDataByte(0x02);
    epdSendCommand(0xE5);
    epdSendDataByte(0x5A);
}

// export function epdInitPart(): void {
//     epdReset();
//
//     epdSendCommand(0X00);			//PANEL SETTING
//     epdSendDataByte(0x1F);   //KW-3f   KWR-2F	BWROTP 0f	BWOTP 1f
//
//     epdSendCommand(0x04); //POWER ON
//     delaySync(100);
//     epdWaitUntilIdle();        //waiting for the electronic paper IC to release the idle signal
//
//     epdSendCommand(0xE0);
//     epdSendDataByte(0x02);
//     epdSendCommand(0xE5);
//     epdSendDataByte(0x6E);
// }

export function epdClear(blackFirst: boolean = false): void {
    const imageWhite = new Uint8Array(ImageArrayWidth).fill(0xFF);
    const imageBlack = new Uint8Array(ImageArrayWidth).fill(0x00);

    epdSendCommand(0x10);
    for (let i = 0; i < ImageArrayHeight; i++) {
        epdSendDataArray(blackFirst ? imageBlack : imageWhite, ImageArrayWidth);
    }

    epdSendCommand(0x13);
    for (let i = 0; i < ImageArrayHeight; i++) {
        epdSendDataArray(blackFirst ? imageWhite : imageBlack, ImageArrayWidth);
    }

    epdTurnOnDisplay();
}

/******************************************************************************
 function :	Sends the image buffer in RAM to e-Paper and displays
 parameter:
 ******************************************************************************/
export function epdShowImageArray(blackimage: Uint8Array): void {
    epdSendCommand(0x10);
    for (let j = 0; j < ImageArrayHeight; j++) {
        const data = blackimage.slice(j * ImageArrayWidth, (j + 1) * ImageArrayWidth);
        // console.log(`sending line`, j, data.bytelength, data);
        epdSendDataArray(data, ImageArrayWidth);
    }

    epdSendCommand(0x13);
    for (let j = 0; j < ImageArrayHeight; j++) {
        for (let i = 0; i < ImageArrayWidth; i++) {
            blackimage[i + j * ImageArrayWidth] = ~blackimage[i + j * ImageArrayWidth];
        }
    }
    for (let j = 0; j < ImageArrayHeight; j++) {
        const data = blackimage.slice(j * ImageArrayWidth, (j + 1) * ImageArrayWidth);
        epdSendDataArray(data, ImageArrayWidth);
    }
    epdTurnOnDisplay();
}

// void EPD_7IN5_V2_Display_Part(UBYTE *blackimage,UDOUBLE x_start, UDOUBLE y_start, UDOUBLE x_end, UDOUBLE y_end)
// {
//     UDOUBLE Width, Height;
//     Width =((x_end - x_start) % 8 == 0)?((x_end - x_start) / 8 ):((x_end - x_start) / 8 + 1);
//     Height = y_end - y_start;
//
//     epdSendCommand(0x50);
//     epdSendDataByte(0xA9);
//     epdSendDataByte(0x07);
//
//     epdSendCommand(0x91);		//This command makes the display enter partial mode
//     epdSendCommand(0x90);		//resolution setting
//     epdSendDataByte (x_start/256);
//     epdSendDataByte (x_start%256);   //x-start
//
//     epdSendDataByte (x_end/256);
//     epdSendDataByte (x_end%256-1);  //x-end
//
//     epdSendDataByte (y_start/256);  //
//     epdSendDataByte (y_start%256);   //y-start
//
//     epdSendDataByte (y_end/256);
//     epdSendDataByte (y_end%256-1);  //y-end
//     epdSendDataByte (0x01);
//
//     epdSendCommand(0x13);
//     for (UDOUBLE j = 0; j < Height; j++) {
//     epdSendDataArray((UBYTE *)(blackimage+j*Width), Width);
// }
//     epdTurnOnDisplay();
// }

/******************************************************************************
 function :	Enter sleep mode
 parameter:
 ******************************************************************************/
export function epdSleep(): void {
    epdSendCommand(0X02);  	//power off
    epdWaitUntilIdle();
    epdSendCommand(0X07);  	//deep sleep
    epdSendDataByte(0xA5);
}
