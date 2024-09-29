import { randomUUID } from "node:crypto";
import { clearInterval } from "node:timers";
import { DistanceUnits, SpeedUnits } from "../interfaces/index.js";
import { average, convertMilesToKilometers, convertSpeedUnit, createGetRequest, createPostRequest, createSocketClient, parseXML } from "../utils/index.js";
/**
 * Ookla Speedtest test.
 */
export class Ookla {
    options;
    /**
     * Constructor for Ookla Speedtest.
     * @param {USOptions} options - UniversalSpeedTest options object
     */
    constructor(options) {
        this.options = options;
    }
    /**
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAMeasurementServer[]>} Ookla test servers
     */
    async searchServers(searchTerm, serversToFetch) {
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&search=${searchTerm}&limit=${serversToFetch || 100}&https_functional=true`;
        try {
            const response = await createGetRequest(serversUrl);
            const body = await response.text();
            const servers = JSON.parse(body);
            servers.forEach(server => {
                // Convert info to correct types
                server.id = Number(server.id);
                server.lat = Number(server.lat);
                server.lon = Number(server.lon);
                if (this.options.units.distanceUnit === DistanceUnits.km) {
                    server.distance = convertMilesToKilometers(server.distance);
                }
            });
            return servers;
        }
        catch {
            throw new Error("An error occurred while retrieving the server list from speedtest.net.");
        }
    }
    /**
     * Performs the Ookla Speedtest measurement.
     * @returns {Promise<OAResult>} Results of the Ookla test
     */
    async run() {
        const testUUID = randomUUID();
        const testStartTime = Date.now();
        // Get and parse test config
        const testConfig = await this.getConfig();
        if (this.options.debug) {
            console.debug("speedtest.net config was obtained");
            console.debug(`Your ISP is '${testConfig.client.isp}' (${testConfig.client.ip})`);
        }
        // Get available servers and the fastest server(s)
        const servers = await this.getServersList(this.options.units.distanceUnit);
        const bestServers = await this.getBestServers(servers);
        const bestServer = bestServers.at(0);
        if (this.options.debug) {
            if (this.options.ooklaOptions.multiTest) {
                console.debug("Selected servers are:");
                bestServers.forEach(server => console.debug(`  - ${server.sponsor} (${server.distance} ${this.options.units.distanceUnit}, ${server.latency} ms)`));
            }
            else {
                console.debug(`Selected server is '${bestServer.sponsor}' (${bestServer.distance} ${this.options.units.distanceUnit}, ${bestServer.latency} ms)`);
            }
        }
        // Test latency and jitter against the fastest server
        const socketClient = createSocketClient(bestServer.host);
        const pingResult = await this.measurePing(socketClient, testUUID, 10, 20, true);
        if (this.options.debug) {
            console.debug(`Your latency is ${pingResult.latency} ms and jitter is ${pingResult.jitter} ms`);
        }
        // Test download speed
        let downloadResult;
        if (this.options.tests.measureDownload) {
            downloadResult = await this.measureDownloadSpeed(bestServers, bestServer, testUUID);
            if (this.options.debug) {
                console.debug(`Download speed is ${downloadResult.speed} ${this.options.units.downloadUnit}`);
            }
        }
        // Test upload speed
        let uploadResult;
        if (this.options.tests.measureUpload) {
            uploadResult = await this.measureUploadSpeed(bestServer, testUUID);
            if (this.options.debug) {
                console.debug(`Upload speed is ${uploadResult.speed} ${this.options.units.uploadUnit}`);
            }
        }
        const testEndTime = Date.now();
        const elapsedTime = Number(((testEndTime - testStartTime) / 1000).toFixed(1));
        if (this.options.debug) {
            console.debug(`Test was performed in ${elapsedTime} seconds`);
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
     * @returns {Promise<OAConfig>} Configuration for the current test
     */
    async getConfig() {
        try {
            const response = await createGetRequest("https://www.speedtest.net/speedtest-config.php");
            const body = await response.text();
            return (await parseXML(body)).settings;
        }
        catch {
            throw new Error("An error occurred while retrieving test configuration from speedtest.net.");
        }
    }
    /**
     * Returns a list of the ten nearest speedtest.net servers with their latency.
     * @param {DistanceUnits} distanceUnit - Preferred unit of distance value
     * @private
     * @returns {Promise<OAMeasurementServer[]>} List of available servers
     */
    async getServersList(distanceUnit) {
        let testsInProgress = 0;
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&limit=${this.options.ooklaOptions.serversToFetch}&https_functional=true`;
        try {
            const response = await createGetRequest(serversUrl);
            const body = await response.text();
            const servers = JSON.parse(body);
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
                    // Measure server latency in parallel
                    testsInProgress++;
                    const socketClient = createSocketClient(server.host);
                    this.measurePing(socketClient, null, 5, 15, false).then(({ latency }) => {
                        server.latency = latency;
                        testsInProgress--;
                        if (testsInProgress === 0) {
                            resolve(servers);
                        }
                    });
                });
            });
        }
        catch {
            throw new Error("An error occurred while retrieving the server list from speedtest.net.");
        }
    }
    /**
     * Returns four servers with the lowest latency.
     * @param {OAMeasurementServer[]} servers - List of available servers
     * @private
     * @returns {Promise<OAMeasurementServer>} The four fastest servers
     */
    async getBestServers(servers) {
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
     * @returns {Promise<OAPingResult>} Latency and jitter of the server
     */
    measurePing(ws, uuid, requests, timeout, calculateJitter) {
        const latencies = [];
        const jitters = [];
        let testNumber = 0;
        let requestStartTime;
        let autoClose;
        return new Promise((resolve, reject) => {
            ws.on("error", (error) => reject(error));
            ws.on("open", () => {
                ws.send(`HI${(uuid ? ` ${uuid}` : "")}`);
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
                    }
                    else {
                        const currentTime = Date.now();
                        ws.send(`PING ${currentTime}`);
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
     * @param {OAMeasurementServer[]} servers - All available measurement servers
     * @param {OAMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {Promise<OADownloadResult>} Download speed measurement result
     */
    async measureDownloadSpeed(servers, bestServer, testUUID) {
        let sampleBytes = 0;
        // Handler for interrupting active connections
        const abortController = new AbortController();
        const abortSignal = abortController.signal;
        // Handler for current number of active connections
        let activeConnections = 0;
        const increaseConnections = (server) => {
            activeConnections++;
            server.activeConnections++;
        };
        const decreaseConnections = (server) => {
            activeConnections--;
            server.activeConnections--;
        };
        // Handler for opening new connections
        const openServerConnection = (server) => {
            if (activeConnections >= 24) {
                return;
            }
            increaseConnections(server);
            const downloadUrl = `https://${server.host}/download?nocache=${Math.random()}&size=25000000&guid=${testUUID}`;
            createGetRequest(downloadUrl, abortSignal).then(response => {
                if (response.ok) {
                    // Handler for capturing downloaded bytes
                    const readChunk = ({ done, value }) => {
                        if (!done) {
                            sampleBytes += value.length;
                            reader.read().then(readChunk).catch(() => decreaseConnections(server));
                        }
                        else {
                            decreaseConnections(server);
                        }
                    };
                    // Handle first chunk
                    const reader = response.body.getReader();
                    reader.read().then(readChunk).catch(() => decreaseConnections(server));
                }
                else {
                    decreaseConnections(server);
                }
            }).catch(() => decreaseConnections(server));
        };
        // Perform download speed measurement
        return new Promise((resolve) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples = [];
            let lastSampleTime = now;
            let transferredBytes = 0;
            // Open initial connection to all available servers
            servers.forEach(openServerConnection);
            // Start load latency test
            const socketClient = createSocketClient(bestServer.host);
            const pingTest = this.measurePing(socketClient, testUUID, -1, 15, true);
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
                }
                else if (progressPercentage === 100) {
                    clearInterval(checkInterval);
                    // Abort all active connections
                    socketClient.close();
                    abortController.abort();
                    // Calculate final download speed
                    const { latency, jitter } = await pingTest;
                    const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                    const convertedSpeed = convertSpeedUnit(SpeedUnits.Bps, this.options.units.downloadUnit, finalSpeed);
                    resolve({
                        transferredBytes: transferredBytes,
                        latency: latency,
                        jitter: jitter,
                        speed: Number(convertedSpeed.toFixed(2)),
                        totalTime: Number((elapsedTotalTime / 1000).toFixed(1))
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
    createStream(chunkSize, controllerCreated) {
        const generateChunk = (size) => {
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
    startUploadStatsListener(ws, uuid, timeout, bytesReceived) {
        let previousTotalBytesReceived = 0;
        let autoClose;
        return new Promise((resolve, reject) => {
            ws.on("error", (error) => reject(error));
            ws.on("open", () => {
                ws.send(`HI ${uuid}`);
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
                    }
                    else if (totalBytesReceived) {
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
     * @param {OAMeasurementServer} bestServer - The best measurement server
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {Promise<OAUploadResult>} Upload speed measurement result
     */
    async measureUploadSpeed(bestServer, testUUID) {
        let sampleBytes = 0;
        // Handler for interrupting active connections
        const abortController = new AbortController();
        const abortSignal = abortController.signal;
        const streamControllers = [];
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
            const uploadUrl = `https://${bestServer.host}/upload?nocache=${Math.random()}&guid=${testUUID}`;
            createPostRequest(uploadUrl, dataStream, abortSignal).catch(decreaseConnections);
        };
        // Perform upload speed measurement
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples = [];
            let lastSampleTime = now;
            let transferredBytes = 0;
            // Start upload stats gathering
            const statsSocketClient = createSocketClient(bestServer.host);
            this.startUploadStatsListener(statsSocketClient, testUUID, 20, (deliveredBytes) => sampleBytes += deliveredBytes).then(() => {
                // Open initial connections to the best server
                for (let connections = 0; connections < 4; connections++) {
                    openServerConnection();
                }
                // Start load latency test
                const latencySocketClient = createSocketClient(bestServer.host);
                const pingTest = this.measurePing(latencySocketClient, testUUID, -1, 15, true);
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
                    }
                    else if (progressPercentage === 100) {
                        clearInterval(checkInterval);
                        // Abort all active connections
                        latencySocketClient.close();
                        streamControllers.forEach(streamController => streamController.close());
                        abortController.abort();
                        statsSocketClient.close();
                        // Calculate final upload speed
                        const { latency, jitter } = await pingTest;
                        const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                        const convertedSpeed = convertSpeedUnit(SpeedUnits.Bps, this.options.units.uploadUnit, finalSpeed);
                        resolve({
                            transferredBytes: transferredBytes,
                            latency: latency,
                            jitter: jitter,
                            speed: Number(convertedSpeed.toFixed(2)),
                            totalTime: Number((elapsedTotalTime / 1000).toFixed(1))
                        });
                    }
                }, 750);
            }).catch(reject);
        });
    }
    /**
     * Returns final speed in bytes per second from all provided samples.
     * @param {number[]} samples - All retrieved bandwidth sample
     * @private
     * @returns {number} Final speed in bytes per second
     */
    calculateSpeedFromSamples(samples) {
        const samplesBySize = samples.sort((sampleA, sampleB) => sampleB - sampleA);
        const samplesWithoutTwoHighest = samplesBySize.slice(2);
        const topTwoThirdsIndex = Math.floor(samplesWithoutTwoHighest.length * 2 / 3);
        return samplesWithoutTwoHighest.slice(0, topTwoThirdsIndex).reduce((acc, val) => acc + val, 0) / topTwoThirdsIndex;
    }
}
