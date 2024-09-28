import { DistanceUnits, OAResult, SpeedUnits, USOptions } from "./interfaces/index.js";
import { convertSpeedUnit } from "./utils/index.js";
/**
 * UniversalSpeedTest.
 */
export declare class UniversalSpeedTest {
    private readonly options;
    /**
     * Constructor for UniversalSpeedTest.
     * @param options - UniversalSpeedTest options object
     */
    constructor(options?: USOptions);
    /**
     * Performs measurements using speedtest.net
     * @returns {Promise<OAResult>} Ookla Speedtest test result.
     */
    performOoklaTest(): Promise<OAResult>;
}
export { DistanceUnits, SpeedUnits, convertSpeedUnit };
