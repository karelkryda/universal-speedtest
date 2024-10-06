import { DistanceUnits, OAResult, OAServer, SpeedUnits, USOptions } from "./interfaces/index.js";
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
     * Lists Ookla test servers.
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    listOoklaServers(serversToFetch?: number): Promise<OAServer[]>;
    /**
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    searchOoklaServers(searchTerm: string, serversToFetch?: number): Promise<OAServer[]>;
    /**
     * Performs speedtest using Ookla servers.
     * @param server - Test server to be used for measurement
     * @returns {Promise<OAResult>} Ookla test result
     */
    performOoklaTest(server?: OAServer): Promise<OAResult>;
}
export { DistanceUnits, SpeedUnits, convertSpeedUnit };
