import { DistanceUnits, OAResult, SpeedUnits, USOptions } from "./interfaces/index.js";
import { convertSpeedUnit } from "./utils/index.js";
import { Ookla } from "./tests/index.js";

/**
 * UniversalSpeedTest.
 */
export class UniversalSpeedTest {
    private readonly options: USOptions;

    /**
     * Constructor for UniversalSpeedTest.
     * @param options - UniversalSpeedTest options object
     */
    constructor(options?: USOptions) {
        this.options = {
            debug: false,
            ...options,
            tests: {
                measureDownload: true,
                measureUpload: false,
                ...options.tests
            },
            units: {
                distanceUnit: DistanceUnits.mi,
                downloadUnit: SpeedUnits.Mbps,
                uploadUnit: SpeedUnits.Mbps,
                ...options.units
            },
            ooklaOptions: {
                multiTest: true,
                serversToFetch: 10,
                ...options.ooklaOptions
            }
        };
    }

    /**
     * Performs measurements using speedtest.net
     * @returns {Promise<OAResult>} Ookla Speedtest test result.
     */
    public performOoklaTest(): Promise<OAResult> {
        const ooklaTest = new Ookla(this.options);
        return ooklaTest.run();
    }
}

export {
    DistanceUnits,
    SpeedUnits,
    convertSpeedUnit
};
