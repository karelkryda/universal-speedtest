import { DistanceUnits, SpeedUnits, STResult, USOptions } from "./interfaces/index.js";
import { convertSpeedUnit } from "./utils/index.js";
import { Speedtest } from "./tests/index.js";

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
            multiTest: true,
            serversToFetch: 10,
            measureDownload: true,
            measureUpload: false,
            distanceUnit: DistanceUnits.mi,
            downloadUnit: SpeedUnits.Mbps,
            uploadUnit: SpeedUnits.Mbps,
            ...options
        };
    }

    /**
     * Performs measurements using speedtest.net
     * @returns {Promise<STResult>} Ookla Speedtest test result.
     */
    public performTest(): Promise<STResult> {
        const speedTest = new Speedtest(this.options);
        return speedTest.run();
    }
}

export {
    DistanceUnits,
    SpeedUnits,
    convertSpeedUnit
};
