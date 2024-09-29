import { DistanceUnits, OAMeasurementServer, OAResult, SpeedUnits, USOptions } from "./interfaces/index.js";
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
                ...options?.tests
            },
            units: {
                distanceUnit: DistanceUnits.mi,
                downloadUnit: SpeedUnits.Mbps,
                uploadUnit: SpeedUnits.Mbps,
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
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAMeasurementServer[]>} Ookla test servers
     */
    public searchOoklaServers(searchTerm: string, serversToFetch?: number): Promise<OAMeasurementServer[]> {
        const ooklaTest = new Ookla(this.options);
        return ooklaTest.searchServers(searchTerm, serversToFetch);
    }

    /**
     * Performs speedtest using Ookla servers.
     * @returns {Promise<OAResult>} Ookla test result
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
