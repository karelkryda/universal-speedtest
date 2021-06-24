<a href="https://fast.com"><img src="https://fast.com/assets/new-logo-vert-37861c.svg" alt="fast.com logo" height="120px" /></a>
 
<a href="https://www.netmetr.cz/en"><img src="https://www.netmetr.cz/theme/images/netmetr-logo.svg" alt="netmetr.cz logo" height="120px" /></a>
 
<a href="https://www.speedtest.net/"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/Speedtest.net_logo.svg" alt="netmetr.cz logo" height="120px" /></a>

# universal-speedtest
[![Build Status](https://travis-ci.com/karelkryda/universal-speedtest.svg?branch=master)](https://travis-ci.com/github/karelkryda/universal-speedtest)
[![NPM version](https://img.shields.io/npm/v/universal-speedtest.svg?colorB=0a7bbb)](https://www.npmjs.com/package/universal-speedtest)
[![GitHub license](https://img.shields.io/github/license/karelkryda/universal-speedtest.svg?colorB=0a7bbb)](https://github.com/karelkryda/universal-speedtest/blob/master/LICENSE)

Measure the speed of your internet connection with Netflix's Fast.com speed test, cz.nic's Netmetr.cz speed test or Ookla's Speedtest.net speed test.

## Installation
```bash
$ npm install --save universal-speedtest
```

## Example usage
```js
const { UniversalSpeedTest, SpeedUnits } = require('universal-speedtest');

const SpeedTest = new UniversalSpeedTest({
    measureUpload: true,
    downloadUnit: SpeedUnits.MBps,
    timeout: 60000
});

SpeedTest.runTestByFast().then(result => {
    console.log(`Ping: ${result.ping} ${result.pingUnit}`);
    console.log(`Download speed: ${result.downloadSpeed} ${result.downloadUnit}`);
    console.log(`Upload speed: ${result.uploadSpeed} ${result.uploadUnit}`);
}).catch(e => {
    console.error(e.message);
});
```

## Available Test Pages
|Function              | Page          |
| :--------------------| :------       |
|runTestByFast()       | Fast.com      |
|runTestByNetmetr()    | Netmetr.cz    |
|runTestBySpeedtest()  | Speedtest.net |

## Available Options
|Property                         | Type                 | Default    | Description                                                                   |
| :-------------------------------| :------              | :--------- | :---------------------------------------------------------------------------- |
|measureUpload <sup>**F**</sup>   | Boolean              | false      | To wait for the upload speed result                                           |
|uploadUnit                       | SpeedUnits / String  | Mbps       | The resulting unit of upload speed                                            |
|downloadUnit                     | SpeedUnits / String  | Mbps       | The resulting unit of download speed                                          |
|timeout                          | Number               | 40000      | Limit how long the speed test can run                                         |
|executablePath                   | String               | -          | Path to the Chrome startup file. You can use it if Puppeteer failed to start. |

**F** only available for Fast.com  speed test

## Test result
|Property                          | Type     | Description                   |
| :--------------------------------| :------  | :---------------------------- |
|ping*                             | Number   | Network ping                  |
|downloadSpeed                     | Number   | Network download speed        |
|uploadSpeed*                      | Number   | Network upload speed          |
|pingUnit*                         | String   | Network ping unit             |
|downloadUnit                      | String   | Network download speed unit   |
|uploadUnit*                       | String   | Network upload speed unit     |
|servers <sup>**F**</sup>          | String[] | Location(s) of test server(s) |

\* only available when the "measureUpload" property is set to true

**F** only available for Fast.com speed test

## TODO
I want to make this package multifunctional to allow the use of additional speed testing sites and to allow you to choose the best test exactly for you.