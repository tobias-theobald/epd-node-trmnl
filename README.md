## Node.js program to render your trmnl screen to your waveshare 7.5" V2 e-ink display on a raspberry pi (zero w 2 in my case)

This will likely work on other devices compatible with the waveshare E-paper display, see the waveshare sample code for more details

I'm using nvm to install node

Had to put this in my `/boot/firmware/config.txt` to get the spi to work on my freshly set up pi zero w 2

```
dtparam=spi=on
dtoverlay=spi0-1cs,cs0_pin=28
```

You may have to `sudo apt install liblgpio-dev` to get the gpio library to compile

Copy .env.example to .env and fill in the values from the TRMNL device page

Then run `npm install` to install the dependencies (this might take some time on a pi zero w) and `npm start` to start the program. Look out for any problems in the console output.

To autostart, 
* modify epd-node.service to suit your needs (paths, username, group, PATH env var, etc)
* copy it to /etc/systemd/system/epd-node.service
* run `sudo systemctl reload-daemon`
* run `sudo systemctl start epd-node.service`
* run `sudo systemctl status epd-node.service` and see if there are any issues

### Note:

A lot of the code in this package and especially in `device.ts` is simply a node rewrite of the control code from the waveshare sample code at https://github.com/waveshareteam/e-Paper 
