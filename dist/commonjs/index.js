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
                serversToFetch: 10,
                connections: "multi",
                technology: "http",
                ...options?.ooklaOptions
            }
        };
    }
    /**
     * Lists Ookla test servers.
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    listOoklaServers(serversToFetch) {
        const ooklaTest = new index_js_3.Ookla(this.options);
        return ooklaTest.listServers(serversToFetch);
    }
    /**
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    searchOoklaServers(searchTerm, serversToFetch) {
        const ooklaTest = new index_js_3.Ookla(this.options);
        return ooklaTest.searchServers(searchTerm, serversToFetch);
    }
    /**
     * Performs speedtest using Ookla servers.
     * @param server - Test server to be used for measurement
     * @returns {Promise<OAResult>} Ookla test result
     */
    performOoklaTest(server) {
        const ooklaTest = new index_js_3.Ookla(this.options);
        return ooklaTest.runTest(server);
    }
}
exports.UniversalSpeedTest = UniversalSpeedTest;
