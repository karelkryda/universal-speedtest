"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ookla = void 0;
const node_crypto_1 = require("node:crypto");
const node_timers_1 = require("node:timers");
const index_js_1 = require("../interfaces/index.js");
const ookla_js_1 = require("../constants/ookla.js");
const index_js_2 = require("../utils/index.js");
/**
 * Ookla Speedtest test.
 */
class Ookla {
    options;
    /**
     * Constructor for Ookla Speedtest.
     * @param {USOptions} options - UniversalSpeedTest options object
     */
    constructor(options) {
        this.options = options;
    }
    /**
     * Lists Ookla test servers.
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    async listServers(serversToFetch) {
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&limit=${serversToFetch || ookla_js_1.DEFAULT_SERVER_LIST_SIZE}&https_functional=true`;
        return this.getServersList(serversUrl);
    }
    /**
     * Searches Ookla test servers based on search term.
     * @param searchTerm - Search term
     * @param serversToFetch - Number of test servers to fetch
     * @returns {Promise<OAServer[]>} Ookla test servers
     */
    async searchServers(searchTerm, serversToFetch) {
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&search=${searchTerm}&limit=${serversToFetch || ookla_js_1.DEFAULT_SERVER_LIST_SIZE}&https_functional=true`;
        return this.getServersList(serversUrl);
    }
    /**
     * Returns a list of Ookla test servers.
     * @param serversUrl - URL to fetch servers from
     * @private
     * @returns {Promise<OAServer[]>} List of available servers
     */
    async getServersList(serversUrl) {
        try {
            const response = await (0, index_js_2.createGetRequest)(serversUrl);
            const body = await response.text();
            const servers = JSON.parse(body);
            servers.forEach(server => {
                // Convert info to correct types
                server.id = Number(server.id);
                server.lat = Number(server.lat);
                server.lon = Number(server.lon);
                if (this.options.units.distanceUnit === index_js_1.DistanceUnits.km) {
                    server.distance = (0, index_js_2.convertMilesToKilometers)(server.distance);
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
     * @param server - Test server to be used for measurement
     * @returns {Promise<OAResult>} Results of the Ookla test
     */
    async runTest(server) {
        const testUUID = (0, node_crypto_1.randomUUID)();
        const multiConnectionTest = !server && (this.options.ooklaOptions.connections === "multi");
        const testStartTime = Date.now();
        // Get and parse test config
        const testConfig = await this.getConfig();
        if (this.options.debug) {
            console.debug("speedtest.net config was obtained");
            console.debug(`Your ISP is '${testConfig.client.isp}' (${testConfig.client.ip})`);
        }
        // Get available servers and the fastest server(s)
        const servers = (server) ? [server] : await this.listServers(this.options.ooklaOptions.serversToFetch);
        const measurementServers = await this.prepareTestServers(servers);
        const bestServers = await this.getBestServers(measurementServers);
        const bestServer = bestServers.at(0);
        if (this.options.debug) {
            if (multiConnectionTest) {
                console.debug("Selected servers are:");
                bestServers.forEach(server => console.debug(`  - ${server.sponsor} (${server.distance} ${this.options.units.distanceUnit}, ${server.latency} ms)`));
            }
            else {
                console.debug(`Selected server is '${bestServer.sponsor}' (${bestServer.distance} ${this.options.units.distanceUnit}, ${bestServer.latency} ms)`);
            }
        }
        // Test latency and jitter against the fastest server
        const socketClient = (0, index_js_2.createSocketClient)(bestServer.host);
        const pingResult = await this.measurePing(socketClient, testUUID, ookla_js_1.LATENCY_TEST_REQUESTS, ookla_js_1.LATENCY_TEST_TIMEOUT, true);
        if (this.options.debug) {
            console.debug(`Your latency is ${pingResult.latency} ms and jitter is ${pingResult.jitter} ms`);
        }
        // Test download speed
        let downloadResult;
        if (this.options.tests.measureDownload) {
            downloadResult = await this.measureDownloadSpeed(bestServers, bestServer, testUUID, multiConnectionTest);
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
        const elapsedTime = Number(((testEndTime - testStartTime) / 1_000).toFixed(1));
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
            const response = await (0, index_js_2.createGetRequest)("https://www.speedtest.net/speedtest-config.php");
            const body = await response.text();
            return (await (0, index_js_2.parseXML)(body)).settings;
        }
        catch {
            throw new Error("An error occurred while retrieving test configuration from speedtest.net.");
        }
    }
    /**
     * Returns a list of the ten nearest speedtest.net servers with their latency.
     * @param servers List of available test servers
     * @private
     * @returns {Promise<OAMeasurementServer[]>} List of available servers
     */
    async prepareTestServers(servers) {
        const measurementServers = [];
        let testsInProgress = 0;
        return new Promise(resolve => {
            servers.forEach(server => {
                const measurementServer = server;
                measurementServer.activeConnections = 0;
                // Measure server latency in parallel
                testsInProgress++;
                const socketClient = (0, index_js_2.createSocketClient)(measurementServer.host);
                this.measurePing(socketClient, null, ookla_js_1.SERVER_LATENCY_TEST_REQUESTS, ookla_js_1.SERVER_LATENCY_TEST_TIMEOUT, false).then(({ latency }) => {
                    measurementServer.latency = latency;
                    measurementServers.push(measurementServer);
                    testsInProgress--;
                    if (testsInProgress === 0) {
                        resolve(measurementServers);
                    }
                });
            });
        });
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
                autoClose = setTimeout(() => ws.close, timeout * 1_000);
            });
            ws.on("message", (data) => {
                const message = data.toString();
                if (message.includes("PONG")) {
                    // Ignore first ping
                    if (testNumber >= 1) {
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
                const serverLatency = (0, index_js_2.calculateIqm)(latencies, 2);
                const serverJitter = calculateJitter ? (0, index_js_2.average)(jitters, 2) : null;
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
     * @param {boolean} multiConnectionTest - Whether measurement should use single multiple servers
     * @private
     * @returns {Promise<OADownloadResult>} Download speed measurement result
     */
    async measureDownloadSpeed(servers, bestServer, testUUID, multiConnectionTest) {
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
            if (activeConnections >= ookla_js_1.DOWNLOAD_TEST_MAX_CONNECTIONS) {
                return;
            }
            increaseConnections(server);
            const downloadUrl = `https://${server.host}/download?nocache=${Math.random()}&size=${ookla_js_1.DOWNLOAD_TEST_SIZE}&guid=${testUUID}`;
            (0, index_js_2.createGetRequest)(downloadUrl, abortSignal).then(response => {
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
        // Returns the least utilized server using round-robin.
        const selectNextConnectionServer = () => {
            if (!multiConnectionTest) {
                return bestServer;
            }
            return servers
                .sort((serverA, serverB) => serverA.activeConnections - serverB.activeConnections)
                .at(0);
        };
        // Perform download speed measurement
        return new Promise((resolve) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples = [];
            let lastSampleTime = now;
            let transferredBytes = 0;
            // Open initial connection to all available servers
            if (multiConnectionTest) {
                servers.forEach(openServerConnection);
            }
            else {
                for (let connections = 0; connections < ookla_js_1.DOWNLOAD_TEST_INITIAL_CONNECTIONS; connections++) {
                    openServerConnection(bestServer);
                }
            }
            // Start load latency test
            const socketClient = (0, index_js_2.createSocketClient)(bestServer.host);
            const pingTest = this.measurePing(socketClient, testUUID, ookla_js_1.DOWNLOAD_LATENCY_TEST_REQUESTS, ookla_js_1.DOWNLOAD_LATENCY_TEST_TIMEOUT, true);
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
                const progressPercentage = Math.min(100, Math.floor((elapsedTotalTime / (ookla_js_1.DOWNLOAD_TEST_DURATION * 1_000)) * 100));
                if (this.options.debug) {
                    console.debug(`Download test progress: ${progressPercentage}%`);
                }
                // Check whether additional connections should be opened
                if (multiConnectionTest && progressPercentage < 50) {
                    const recommendedConnections = Math.ceil(bandwidthInBytes / ookla_js_1.DOWNLOAD_TEST_SCALING_RATIO);
                    const additionalConnections = recommendedConnections - activeConnections;
                    for (let connections = 0; connections < additionalConnections; connections++) {
                        const server = selectNextConnectionServer();
                        openServerConnection(server);
                    }
                }
                else if (progressPercentage < 100) {
                    const additionalConnections = ookla_js_1.DOWNLOAD_TEST_INITIAL_CONNECTIONS - activeConnections;
                    for (let connections = 0; connections < additionalConnections; connections++) {
                        const server = selectNextConnectionServer();
                        openServerConnection(server);
                    }
                }
                else if (progressPercentage === 100) {
                    (0, node_timers_1.clearInterval)(checkInterval);
                    // Abort all active connections
                    socketClient.close();
                    abortController.abort();
                    // Calculate final download speed
                    const { latency, jitter } = await pingTest;
                    const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                    const convertedSpeed = (0, index_js_2.convertSpeedUnit)(index_js_1.SpeedUnits.Bps, this.options.units.downloadUnit, finalSpeed);
                    resolve({
                        transferredBytes: transferredBytes,
                        latency: latency,
                        jitter: jitter,
                        speed: Number(convertedSpeed.toFixed(2)),
                        servers: (multiConnectionTest) ? servers : [bestServer],
                        totalTime: Number((elapsedTotalTime / 1_000).toFixed(1))
                    });
                }
            }, 750);
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
                autoClose = setTimeout(() => ws.close, timeout * 1_000);
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
        // Handler for current number of active connections
        let activeConnections = 0;
        const increaseConnections = () => activeConnections++;
        const decreaseConnections = () => activeConnections--;
        // Handler for opening new connections
        const openServerConnection = () => {
            if (activeConnections >= ookla_js_1.UPLOAD_TEST_MAX_CONNECTIONS) {
                return;
            }
            const data = new Blob([new Uint8Array(ookla_js_1.UPLOAD_TEST_SIZE)]);
            increaseConnections();
            const uploadUrl = `https://${bestServer.host}/upload?nocache=${Math.random()}&guid=${testUUID}`;
            (0, index_js_2.createPostRequest)(uploadUrl, data, abortSignal).then(decreaseConnections).catch(decreaseConnections);
        };
        // Perform upload speed measurement
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const startTime = now;
            const bandwidthSamples = [];
            let lastSampleTime = now;
            let transferredBytes = 0;
            // Start upload stats gathering
            const statsSocketClient = (0, index_js_2.createSocketClient)(bestServer.host);
            this.startUploadStatsListener(statsSocketClient, testUUID, ookla_js_1.UPLOAD_STATS_LISTENER_TIMEOUT, (deliveredBytes) => sampleBytes += deliveredBytes).then(() => {
                // Open initial connections to the best server
                for (let connections = 0; connections < ookla_js_1.UPLOAD_TEST_INITIAL_CONNECTIONS; connections++) {
                    openServerConnection();
                }
                // Start load latency test
                const latencySocketClient = (0, index_js_2.createSocketClient)(bestServer.host);
                const pingTest = this.measurePing(latencySocketClient, testUUID, ookla_js_1.UPLOAD_LATENCY_TEST_REQUESTS, ookla_js_1.UPLOAD_LATENCY_TEST_TIMEOUT, true);
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
                    const progressPercentage = Math.min(100, Math.floor((elapsedTotalTime / (ookla_js_1.UPLOAD_TEST_DURATION * 1_000)) * 100));
                    if (this.options.debug) {
                        console.debug(`Upload test progress: ${progressPercentage}%`);
                    }
                    // Check whether additional connections should be opened
                    if (progressPercentage < 50) {
                        const recommendedConnections = Math.ceil(bandwidthInBytes / ookla_js_1.UPLOAD_TEST_SCALING_RATIO);
                        const additionalConnections = recommendedConnections - activeConnections;
                        for (let connections = 0; connections < additionalConnections; connections++) {
                            openServerConnection();
                        }
                    }
                    else if (progressPercentage < 100) {
                        const additionalConnections = ookla_js_1.UPLOAD_TEST_INITIAL_CONNECTIONS - activeConnections;
                        for (let connections = 0; connections < additionalConnections; connections++) {
                            openServerConnection();
                        }
                    }
                    else if (progressPercentage === 100) {
                        (0, node_timers_1.clearInterval)(checkInterval);
                        // Abort all active connections
                        latencySocketClient.close();
                        abortController.abort();
                        statsSocketClient.close();
                        // Calculate final upload speed
                        const { latency, jitter } = await pingTest;
                        const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                        const convertedSpeed = (0, index_js_2.convertSpeedUnit)(index_js_1.SpeedUnits.Bps, this.options.units.uploadUnit, finalSpeed);
                        resolve({
                            transferredBytes: transferredBytes,
                            latency: latency,
                            jitter: jitter,
                            speed: Number(convertedSpeed.toFixed(2)),
                            servers: [bestServer],
                            totalTime: Number((elapsedTotalTime / 1_000).toFixed(1))
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
exports.Ookla = Ookla;
