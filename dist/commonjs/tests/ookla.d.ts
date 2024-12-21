import { OAResult, OAServer, USOptions } from "../interfaces/index.js";
/**
 * Ookla Speedtest test.
 */
export declare class Ookla {
    private readonly options;
    /**
     * Constructor for Ookla Speedtest.
     * @param {USOptions} options - UniversalSpeedTest options object
     */
    constructor(options: USOptions);
    /**
     * Lists Ookla test servers.
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    listServers(serversToFetch?: number): Promise<OAServer[]>;
    /**
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    searchServers(searchTerm: string, serversToFetch?: number): Promise<OAServer[]>;
    /**
     * Returns a list of Ookla test servers.
     * @param serversUrl - URL to fetch servers from
     * @private
     * @returns {Promise<OAServer[]>} List of available servers
     */
    private getServersList;
    /**
     * Performs the Ookla Speedtest measurement.
     * @param server - Test server to be used for measurement
     * @returns {Promise<OAResult>} Results of the Ookla test
     */
    runTest(server?: OAServer): Promise<OAResult>;
    /**
     * Retrieves the configuration for speedtest.net test.
     * @private
     * @returns {Promise<OAConfig>} Configuration for the current test
     */
    private getConfig;
    /**
     * Returns a list of the ten nearest speedtest.net servers with their latency.
     * @param servers List of available test servers
     * @private
     * @returns {Promise<OAMeasurementServer[]>} List of available servers
     */
    private prepareTestServers;
    /**
     * Returns four servers with the lowest latency.
     * @param {OAMeasurementServer[]} servers - List of available servers
     * @private
     * @returns {Promise<OAMeasurementServer>} The four fastest servers
     */
    private getBestServers;
    /**
     * Measures latency and jitter of the given server.
     * @param {WebSocket} ws - WebSocket connection
     * @param {string|null} uuid - Test UUID
     * @param {number} requests - Number of ping calls
     * @param {number} timeout - Maximum time that can be elapsed
     * @param {boolean} calculateJitter - Whether to calculate jitter or not
     * @private
     * @returns {Promise<OAPingResult>} Latency and jitter of the server
     */
    private measurePing;
    /**
     * Performs download speed measurement and returns the result.
     * @param {OAMeasurementServer[]} servers - All available measurement servers
     * @param {OAMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @param {boolean} multiConnectionTest - Whether measurement should use single multiple servers
     * @private
     * @returns {Promise<OADownloadResult>} Download speed measurement result
     */
    private measureDownloadSpeed;
    /**
     * Reads upload test statistics and continuously reports number of transferred bytes.
     * @param {WebSocket} ws - WebSocket connection
     * @param {string} uuid - Test UUID
     * @param {number} timeout - Maximum time that can be elapsed
     * @param {function} bytesReceived - callback returning number bytes received by test server
     * @private
     * @returns {Promise<void>} Resolved when upload stats listener is ready
     */
    private startUploadStatsListener;
    /**
     * Performs upload speed measurement and returns the result.
     * @param {OAMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {Promise<OAUploadResult>} Upload speed measurement result
     */
    private measureUploadSpeed;
    /**
     * Returns final speed in bytes per second from all provided samples.
     * @param {number[]} samples - All retrieved bandwidth sample
     * @private
     * @returns {number} Final speed in bytes per second
     */
    private calculateSpeedFromSamples;
}