import { DistanceUnits, OAMeasurementServer, OAResult, SpeedUnits, USOptions } from "./interfaces/index.js";
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
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAMeasurementServer[]>} Ookla test servers
     */
    searchOoklaServers(searchTerm: string, serversToFetch?: number): Promise<OAMeasurementServer[]>;
    /**
     * Performs speedtest using Ookla servers.
     * @returns {Promise<OAResult>} Ookla test result
     */
    performOoklaTest(): Promise<OAResult>;
}
export { DistanceUnits, SpeedUnits, convertSpeedUnit };
