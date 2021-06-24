<a href="https://fast.com"><img src="https://fast.com/assets/new-logo-vert-37861c.svg" alt="fast.com logo" height="120px" /></a>

# fast-api-speedtest
[![Build Status](https://travis-ci.com/karelkryda/fast-api-speedtest.svg?branch=master)](https://travis-ci.com/github/karelkryda/fast-api-speedtest)
[![NPM version](https://img.shields.io/npm/v/fast-api-speedtest.svg?colorB=0a7bbb)](https://www.npmjs.com/package/fast-api-speedtest)
[![GitHub license](https://img.shields.io/github/license/karelkryda/fast-api-speedtest.svg?colorB=0a7bbb)](https://github.com/karelkryda/fast-api-speedtest/blob/master/LICENSE)

Measure the speed of your internet connection with Netflix's Fast.com speed test.

## Installation
```bash
$ npm install --save fast-api-speedtest
```

## Example usage
```js
const { FastAPI, SpeedUnits } = require('fast-api-speedtest');

const FastTest = new FastAPI({
    measureUpload: true,
    downloadUnit: SpeedUnits.MBps,
    timeout: 60000
});

FastTest.runTest().then(result => {
    console.log(`Ping: ${result.ping} ms`);
    console.log(`Download speed: ${result.downloadSpeed} ${result.downloadUnit}`);
    console.log(`Upload speed: ${result.uploadSpeed} ${result.uploadUnit}`);
}).catch(e => {
    console.error(e.message);
});
```

## Available Options
|Property        | Type                 | Default    |                                                                              |
| :--------------| :------              | :--------- | :--------------------------------------------------------------------------- |
|measureUpload   | Boolean              | false      |To wait for the upload speed result                                           |
|uploadUnit      | SpeedUnits / String  | Mbps       |The resulting unit of upload speed                                            |
|downloadUnit    | SpeedUnits / String  | Mbps       |The resulting unit of download speed                                          |
|timeout         | Number               | 40000      |Limit how long the speed test can run                                         |
|executablePath  | String               | -          |Path to the Chrome startup file. You can use it if Puppeteer failed to start. |

## Test result
|Property         | Type     |                              |
| :---------------| :------  | :--------------------------- |
|ping*            | Number   |Network ping                  |
|downloadSpeed    | Number   |Network download speed        |
|uploadSpeed*     | Number   |Network upload speed          |
|pingUnit*        | String   |Network ping unit             |
|downloadUnit     | String   |Network download speed unit   |
|uploadUnit*      | String   |Network upload speed unit     |
|servers          | String[] |Location(s) of test server(s) |

\* only available when the "measureUpload" property is set to true

## TODO
I want to make this package multifunctional to allow the use of additional speed testing sites and to allow you to choose the best test exactly for you.