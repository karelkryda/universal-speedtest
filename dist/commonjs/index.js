"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSpeedUnit = exports.SpeedUnits = exports.DistanceUnits = exports.UniversalSpeedTest = void 0;
const index_js_1 = require("./interfaces/index.js");
Object.defineProperty(exports, "DistanceUnits", { enumerable: true, get: function () { return index_js_1.DistanceUnits; } });
Object.defineProperty(exports, "SpeedUnits", { enumerable: true, get: function () { return index_js_1.SpeedUnits; } });
const index_js_2 = require("./utils/index.js");
Object.defineProperty(exports, "convertSpeedUnit", { enumerable: true, get: function () { return index_js_2.convertSpeedUnit; } });
const index_js_3 = require("./tests/index.js");
/**
 * UniversalSpeedTest.
 */
class UniversalSpeedTest {
    options;
    /**
     * Constructor for UniversalSpeedTest.
     * @param options - UniversalSpeedTest options object
     */
    constructor(options) {
        this.options = {
            debug: false,
            ...options,
            tests: {
                measureDownload: true,
                measureUpload: false,
                ...options?.tests
            },
            units: {
                distanceUnit: index_js_1.DistanceUnits.mi,
                downloadUnit: index_js_1.SpeedUnits.Mbps,
                uploadUnit: index_js_1.SpeedUnits.Mbps,
                ...options?.units
            },
            ooklaOptions: {
                multiTest: true,
                serversToFetch: 10,
                technology: "http",
                ...options?.ooklaOptions
            }
        };
    }
    /**
     * Performs measurements using speedtest.net
     * @returns {Promise<OAResult>} Ookla Speedtest test result.
     */
    performOoklaTest() {
        const ooklaTest = new index_js_3.Ookla(this.options);
        return ooklaTest.run();
    }
}
exports.UniversalSpeedTest = UniversalSpeedTest;
