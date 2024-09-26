import { randomUUID } from "node:crypto";
import { clearInterval } from "node:timers";
import { WebSocket } from "ws";
import {
    DistanceUnits,
    SpeedUnits,
    STConfig,
    STDownloadResult,
    STLatencyJitter,
    STMeasurementServer,
    STResult,
    STUploadResult,
    USOptions
} from "../interfaces/index.js";
import {
    average,
    convertMilesToKilometers,
    convertSpeedUnit,
    createGetRequest,
    createPostRequest,
    createSocketClient,
    parseXML
} from "../utils/index.js";
import { ReadableStreamController } from "node:stream/web";

/**
 * Ookla Speedtest test.
 */
export class Speedtest {
    private readonly options: USOptions;

    /**
     * Constructor for Ookla Speedtest.
     * @param {USOptions} options - UniversalSpeedTest options object
     */
    constructor(options: USOptions) {
        this.options = options;
    }

    /**
     * Performs the Ookla Speedtest measurement.
     * @returns {Promise<STResult>} Results of the Ookla test
     */
    public async run(): Promise<STResult> {
        const testUUID = randomUUID();
        const testStartTime = Date.now();

        // Get and parse test config
        const testConfig: STConfig = await this.getConfig();
        if (this.options.debug) {
            console.debug("speedtest.net config was obtained");
            console.debug(`Your ISP is '${ testConfig.client.isp }' (${ testConfig.client.ip })`);
        }

        // Get available servers and the fastest server(s)
        const servers: STMeasurementServer[] = await this.getServersList(this.options.distanceUnit);
        const bestServers: STMeasurementServer[] = await this.getBestServers(servers);
        const bestServer: STMeasurementServer = bestServers.at(0);
        if (this.options.debug) {
            if (this.options.multiTest) {
                console.debug("Selected servers are:");
                bestServers.forEach(server => console.debug(`  - ${ server.sponsor } (${ server.distance } ${ this.options.distanceUnit }, ${ server.latency } ms)`));
            } else {
                console.debug(`Selected server is '${ bestServer.sponsor }' (${ bestServer.distance } ${ this.options.distanceUnit }, ${ bestServer.latency } ms)`);
            }
        }

        // Test latency and jitter against the fastest server
        const socketClient = createSocketClient(bestServer.host);
        const pingResult = await this.getLatencyAndJitter(socketClient, testUUID, 10, 20, true);
        if (this.options.debug) {
            console.debug(`Your latency is ${ pingResult.latency } ms and jitter is ${ pingResult.jitter } ms`);
        }

        // Test download speed
        let downloadResult: STDownloadResult;
        if (this.options.measureDownload) {
            downloadResult = await this.measureDownloadSpeed(bestServers, bestServer, testUUID);
            if (this.options.debug) {
                console.debug(`Download speed is ${ downloadResult.speed } ${ this.options.downloadUnit }`);
            }
        }

        // Test upload speed
        let uploadResult: STUploadResult;
        if (this.options.measureUpload) {
            uploadResult = await this.measureUploadSpeed(bestServer, testUUID);
            if (this.options.debug) {
                console.debug(`Upload speed is ${ uploadResult.speed } ${ this.options.uploadUnit }`);
            }
        }

        const testEndTime = Date.now();
        const elapsedTime = Number(((testEndTime - testStartTime) / 1000).toFixed(1));
        if (this.options.debug) {
            console.debug(`Test was performed in ${ elapsedTime } seconds`);
        }

        return {
            client: testConfig.client,
            pingResult: pingResult,
            downloadResult: downloadResult,
            uploadResult: uploadResult,
            servers: bestServers,
            bestServer: bestServer,
            totalTime: elapsedTime
        };
    }

    /**
     * Retrieves the configuration for speedtest.net test.
     * @private
     * @returns {Promise<STConfig>} Configuration for the current test
     */
    private async getConfig(): Promise<STConfig> {
        try {
            const response = await createGetRequest("https://www.speedtest.net/speedtest-config.php");
            const body = await response.text();

            return ((await parseXML(body)).settings as STConfig);
        } catch {
            throw new Error("An error occurred while retrieving test configuration from speedtest.net.");
        }
    }

    /**
     * Returns a list of the ten nearest speedtest.net servers with their latency.
     * @param {DistanceUnits} distanceUnit - Preferred unit of distance value
     * @private
     * @returns {Promise<STMeasurementServer[]>} List of available servers
     */
    private async getServersList(distanceUnit: DistanceUnits): Promise<STMeasurementServer[]> {
        let testsInProgress = 0;
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&limit=${ this.options.serversToFetch }&https_functional=true`;
        try {
            const response = await createGetRequest(serversUrl);
            const body = await response.text();

            const servers: STMeasurementServer[] = JSON.parse(body);
            return new Promise(resolve => {
                servers.forEach(server => {
                    // Convert info to correct types
                    server.id = Number(server.id);
                    server.lat = Number(server.lat);
                    server.lon = Number(server.lon);
                    server.activeConnections = 0;
                    if (distanceUnit === DistanceUnits.km) {
                        server.distance = convertMilesToKilometers(server.distance);
                    }

                    // Measure server latency and jitter in parallel
                    testsInProgress++;
                    const socketClient = createSocketClient(server.host);
                    this.getLatencyAndJitter(socketClient, null, 5, 15, false).then(({ latency }) => {
                        server.latency = latency;
                        testsInProgress--;

                        if (testsInProgress === 0) {
                            resolve(servers);
                        }
                    });
                });
            });
        } catch {
            throw new Error("An error occurred while retrieving the server list from speedtest.net.");
        }
    }

    /**
     * Returns four servers with the lowest latency.
     * @param {STMeasurementServer[]} servers - List of available servers
     * @private
     * @returns {Promise<STMeasurementServer>} The four fastest servers
     */
    private async getBestServers(servers: STMeasurementServer[]): Promise<STMeasurementServer[]> {
        return servers.sort((serverA, serverB) => serverA.latency - serverB.latency).slice(0, 4);
    }

    /**
     * Measures latency and jitter of the given server.
     * @param {WebSocket} ws - WebSocket connection
     * @param {string|null} uuid - Test UUID
     * @param {number} requests - Number of ping calls
     * @param {number} timeout - Maximum time that can be elapsed
     * @param {boolean} calculateJitter - Whether to calculate jitter or not
     * @private
     * @returns {Promise<STLatencyJitter>} Latency and jitter of the server
     */
    private getLatencyAndJitter(ws: WebSocket, uuid: string | null, requests: number, timeout: number, calculateJitter: boolean): Promise<STLatencyJitter> {
        const latencies: number[] = [];
        const jitters: number[] = [];
        let testNumber = 0;
        let requestStartTime: number;
        let autoClose: NodeJS.Timeout;
        return new Promise((resolve, reject) => {
            ws.on("error", (error) => reject(error));

            ws.on("open", () => {
                ws.send(`HI${ (uuid ? ` ${ uuid }` : "") }`);
                ws.send("GETIP");
                ws.send("CAPABILITIES");
                ws.send("PING ");
                autoClose = setTimeout(() => ws.close, timeout * 1000);
            });

            ws.on("message", (data) => {
                const message = data.toString();
                if (message.includes("PONG")) {
                    // Ignore first ping
                    if (testNumber !== 0) {
                        const latency = Date.now() - requestStartTime;
                        latencies.push(latency);

                        // Calculate jitter from second ping
                        if (calculateJitter && testNumber >= 2) {
                            const previousLatency = latencies[testNumber - 2];
                            const jitter = Math.abs(latency - previousLatency);
                            jitters.push(jitter);
                        }
                    }

                    // Close websocket if done
                    if (testNumber === requests) {
                        ws.close();
                    } else {
                        const currentTime = Date.now();
                        ws.send(`PING ${ currentTime }`);
                        requestStartTime = currentTime;
                        testNumber++;
                    }
                }
            });

            ws.on("close", () => {
                clearTimeout(autoClose);
                const serverLatency = average(latencies, 2);
                const serverJitter = calculateJitter ? average(jitters, 2) : null;

                resolve({
                    latency: serverLatency,
                    jitter: serverJitter
                });
            });
        });
    }

    /**
     * Performs download speed measurement and returns the result.
     * @param {STMeasurementServer[]} servers - All available measurement servers
     * @param {STMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {Promise<STDownloadResult>} Download speed measurement result
     */
    private async measureDownloadSpeed(servers: STMeasurementServer[], bestServer: STMeasurementServer, testUUID: string): Promise<STDownloadResult> {
        let sampleBytes = 0;

        // Handler for interrupting active connections
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        // Handler for current number of active connections
        let activeConnections = 0;
        const increaseConnections = (server: STMeasurementServer) => {
            activeConnections++;
            server.activeConnections++;
        };
        const decreaseConnections = (server: STMeasurementServer) => {
            activeConnections--;
            server.activeConnections--;
        };

        // Handler for opening new connections
        const openServerConnection = (server: STMeasurementServer) => {
            if (activeConnections >= 24) {
                return;
            }

            increaseConnections(server);
            const downloadUrl = `https://${ server.host }/download?nocache=${ Math.random() }&size=25000000&guid=${ testUUID }`;
            createGetRequest(downloadUrl, abortSignal).then(response => {
                if (response.ok) {
                    // Handler for capturing downloaded bytes
                    const readChunk = ({ done, value }) => {
                        if (!done) {
                            sampleBytes += value.length;
                            reader.read().then(readChunk).catch(() => decreaseConnections(server));
                        } else {
                            decreaseConnections(server);
                        }
                    };

                    // Handle first chunk
                    const reader = response.body.getReader();
                    reader.read().then(readChunk).catch(() => decreaseConnections(server));
                } else {
                    decreaseConnections(server);
                }
            }).catch(() => decreaseConnections(server));
        };

        // Perform download speed measurement
        return new Promise((resolve) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples: number[] = [];
            let lastSampleTime = now;
            let transferredBytes = 0;

            // Open initial connection to all available servers
            servers.forEach(openServerConnection);

            // Start load latency test
            const socketClient = createSocketClient(bestServer.host);
            const latencyTest = this.getLatencyAndJitter(socketClient, testUUID, -1, 15, true);

            const checkInterval = setInterval(async () => {
                const now = Date.now();
                const sampleBytesNow = sampleBytes;
                const elapsedSampleTime = now - lastSampleTime;
                const bandwidthInBytes = (sampleBytesNow / (elapsedSampleTime / 1_000));

                // Save current bandwidth
                transferredBytes += sampleBytesNow;
                sampleBytes -= sampleBytesNow;
                lastSampleTime = now;
                bandwidthSamples.push(bandwidthInBytes);

                // Calculate current progress in percents
                const elapsedTotalTime = now - startTime;
                const progressPercentage = Math.min(100, Math.floor((elapsedTotalTime / 15_000) * 100));
                if (progressPercentage < 50) {
                    // Check whether additional connections should be opened
                    const recommendedConnections = Math.ceil(bandwidthInBytes / 750_000);
                    const additionalConnections = recommendedConnections - activeConnections;
                    for (let connections = 0; connections < additionalConnections; connections++) {
                        const server = servers
                            .sort((serverA, serverB) => serverA.activeConnections - serverB.activeConnections)
                            .at(0);

                        openServerConnection(server);
                    }
                } else if (progressPercentage === 100) {
                    clearInterval(checkInterval);

                    // Abort all active connections
                    socketClient.close();
                    abortController.abort();

                    // Calculate final download speed
                    const { latency, jitter } = await latencyTest;
                    const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                    const convertedSpeed = convertSpeedUnit(SpeedUnits.Bps, this.options.downloadUnit, finalSpeed);
                    resolve({
                        transferredBytes: transferredBytes,
                        latency: latency,
                        jitter: jitter,
                        speed: Number(convertedSpeed.toFixed(2)),
                        totalTime: elapsedTotalTime
                    });
                }
            }, 750);
        });
    }

    /**
     * Returns data stream for upload test.
     * @param chunkSize - size of each stream chunk
     * @param controllerCreated - callback to return newly created stream controller
     * @private
     * @returns {ReadableStream} Continuous data stream
     */
    private createStream(chunkSize: number, controllerCreated: (controller: ReadableStreamController<any>) => void): ReadableStream {
        const generateChunk = (size: number): Uint8Array => {
            const chunk = new Uint8Array(size);
            for (let i = 0; i < size; i++) {
                chunk[i] = Math.floor(Math.random() * 256);
            }

            return chunk;
        };

        return new ReadableStream({
            start(controller) {
                controllerCreated(controller);
            },

            pull(controller) {
                const chunk = generateChunk(chunkSize);
                controller.enqueue(chunk);
            }
        });
    }

    /**
     * Reads upload test statistics and continuously reports number of transferred bytes.
     * @param {WebSocket} ws - WebSocket connection
     * @param {string} uuid - Test UUID
     * @param {number} timeout - Maximum time that can be elapsed
     * @param {function} bytesReceived - callback returning number bytes received by test server
     * @private
     * @returns {Promise<void>} Resolved when upload stats listener is ready
     */
    private startUploadStatsListener(ws: WebSocket, uuid: string, timeout: number, bytesReceived: (deliveredBytes: number) => void): Promise<void> {
        let previousTotalBytesReceived = 0;
        let autoClose: NodeJS.Timeout;
        return new Promise((resolve, reject) => {
            ws.on("error", (error) => reject(error));

            ws.on("open", () => {
                ws.send(`HI ${ uuid }`);
                ws.send("UPLOAD_STATS 15000 50 0");
                autoClose = setTimeout(() => ws.close, timeout * 1000);
            });

            ws.on("message", (data) => {
                const message = data.toString();
                if (message.startsWith("{")) {
                    const jsonData = JSON.parse(message);
                    const totalBytesReceived = jsonData["b"];
                    if (!totalBytesReceived) {
                        // Upload stats listener has been initiated and test can start
                        resolve();
                    } else if (totalBytesReceived) {
                        const bytesReceivedNow = totalBytesReceived - previousTotalBytesReceived;
                        bytesReceived(bytesReceivedNow);

                        previousTotalBytesReceived = totalBytesReceived;
                    }
                }
            });

            ws.on("close", () => clearTimeout(autoClose));
        });
    }

    /**
     * Performs upload speed measurement and returns the result.
     * @param {STMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {Promise<STUploadResult>} Upload speed measurement result
     */
    private async measureUploadSpeed(bestServer: STMeasurementServer, testUUID: string): Promise<STUploadResult> {
        let sampleBytes = 0;

        // Handler for interrupting active connections
        const abortController = new AbortController();
        const abortSignal = abortController.signal;
        const streamControllers: ReadableStreamController<any>[] = [];

        // Handler for current number of active connections
        let activeConnections = 0;
        const increaseConnections = () => activeConnections++;
        const decreaseConnections = () => activeConnections--;

        // Handler for opening new connections
        const openServerConnection = () => {
            if (activeConnections >= 6) {
                return;
            }

            const dataStream = this.createStream(1_024, (controller) => streamControllers.push(controller));
            increaseConnections();
            const uploadUrl = `https://${ bestServer.host }/upload?nocache=${ Math.random() }&guid=${ testUUID }`;
            createPostRequest(uploadUrl, dataStream, abortSignal).catch(decreaseConnections);
        };

        // Perform upload speed measurement
        return new Promise(async (resolve) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples: number[] = [];
            let lastSampleTime = now;
            let transferredBytes = 0;

            // Start upload stats gathering
            const statsSocketClient = createSocketClient(bestServer.host);
            await this.startUploadStatsListener(statsSocketClient, testUUID, 20, (deliveredBytes) => sampleBytes += deliveredBytes);

            // Open initial connections to the best server
            for (let connections = 0; connections < 4; connections++) {
                openServerConnection();
            }

            // Start load latency test
            const latencySocketClient = createSocketClient(bestServer.host);
            const latencyTest = this.getLatencyAndJitter(latencySocketClient, testUUID, -1, 15, true);

            const checkInterval = setInterval(async () => {
                const now = Date.now();
                const sampleBytesNow = sampleBytes;
                const elapsedSampleTime = now - lastSampleTime;
                const bandwidthInBytes = (sampleBytesNow / (elapsedSampleTime / 1_000));

                // Save current bandwidth
                transferredBytes += sampleBytesNow;
                sampleBytes -= sampleBytesNow;
                lastSampleTime = now;
                bandwidthSamples.push(bandwidthInBytes);

                // Calculate current progress in percents
                const elapsedTotalTime = now - startTime;
                const progressPercentage = Math.min(100, Math.floor((elapsedTotalTime / 15_000) * 100));
                if (progressPercentage < 50) {
                    // Check whether additional connections should be opened
                    const recommendedConnections = Math.ceil(bandwidthInBytes / 750_000);
                    const additionalConnections = recommendedConnections - activeConnections;
                    for (let connections = 0; connections < additionalConnections; connections++) {
                        openServerConnection();
                    }
                } else if (progressPercentage === 100) {
                    clearInterval(checkInterval);

                    // Abort all active connections
                    latencySocketClient.close();
                    streamControllers.forEach(streamController => streamController.close());
                    abortController.abort();
                    statsSocketClient.close();

                    // Calculate final upload speed
                    const { latency, jitter } = await latencyTest;
                    const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                    const convertedSpeed = convertSpeedUnit(SpeedUnits.Bps, this.options.uploadUnit, finalSpeed);
                    resolve({
                        transferredBytes: transferredBytes,
                        latency: latency,
                        jitter: jitter,
                        speed: Number(convertedSpeed.toFixed(2)),
                        totalTime: elapsedTotalTime
                    });
                }
            }, 750);
        });
    }

    /**
     * Returns final speed in bytes per second from all provided samples.
     * @param {number[]} samples - All retrieved bandwidth sample
     * @private
     * @returns {number} Final speed in bytes per second
     */
    private calculateSpeedFromSamples(samples: number[]): number {
        const samplesBySize = samples.sort((sampleA, sampleB) => sampleB - sampleA);
        const samplesWithoutTwoHighest = samplesBySize.slice(2);
        const topTwoThirdsIndex = Math.floor(samplesWithoutTwoHighest.length * 2 / 3);

        return samplesWithoutTwoHighest.slice(0, topTwoThirdsIndex).reduce((acc, val) => acc + val, 0) / topTwoThirdsIndex;
    }
}
