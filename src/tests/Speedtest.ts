import { Worker } from "worker_threads";
import { IncomingHttpHeaders } from "http";
import { HTTPUploaderData } from "../helpers/index.js";
import {
    DistanceUnits,
    Request,
    SpeedUnits,
    STConfig,
    STDownloadResult,
    STLatencyJitter,
    STMeasurementServer,
    STResult,
    STTestConfig,
    USOptions
} from "../interfaces/index.js";
import { average, convertMilesToKilometers, convertUnits, createRequest, parseXML, sum } from "../utils/index.js";
import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { clearInterval } from "node:timers";

export class Speedtest {
    private readonly USER_AGENT = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/APP_VERSION";
    private readonly options: USOptions;
    private readonly result: STResult;
    // private openedConnections = 0;
    // private readers = [];
    // private abortControllers = [];

    // TODO:
    private testConfig: STTestConfig;
    // private readonly uploadSizes = [ 32768, 65536, 131072, 262144, 524288, 1048576, 7340032 ];
    // private servers: STMeasurementServer[];
    // private fastestServer: STMeasurementServer;

    /**
     * Constructor for Ookla Speedtest.
     * @param {USOptions} options - UniversalSpeedTest options object
     */
    constructor(options: USOptions) {
        this.options = options;
    }

    /**
     * Performs the Ookla Speedtest measurement.
     * @returns {Promise<STResult>} Results of the test
     */
    public async run(): Promise<STResult> {
        const testUUID = randomUUID();
        const testStartTime = Date.now();

        // Get and parse test config
        const testConfig: STConfig = await this.getConfig();
        // TODO:
        // console.log(testConfig);
        // await this.parseTestConfig(testConfig);
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
        const socketClient = this.createSocketClient(bestServer.host);
        const { latency, jitter } = await this.getLatencyAndJitter(socketClient, testUUID, 10, 20, true);
        if (this.options.debug) {
            console.debug(`Your latency is ${ latency } ms and jitter is ${ jitter } ms`);
        }

        // TODO: this can be used to measure latency during download/upload test
        // console.log("test start");
        // const socketClient2 = this.createSocketClient(bestServer.host);
        // this.getLatencyAndJitter(socketClient2, -1).then((result) => {
        //     console.log("latency: " + result.latency);
        //     console.log("jitter: " + result.jitter);
        // });
        // this.delay(2000).then(() => {
        //     console.log("test done");
        //     socketClient2.close();
        // });

        // Test download speed
        let downloadResult: STDownloadResult;
        if (this.options.measureDownload) {
            downloadResult = await this.measureDownloadSpeed(bestServers, testUUID);
            if (this.options.debug) {
                console.debug(`Download speed is ${ downloadResult.speed } ${ this.options.downloadUnit }`);
            }
        }

        // TODO:
        //
        // // Test upload speed
        // if (this.options.measureUpload) {
        //     const uploadSpeed = await this.testUploadSpeed();
        //     this.result.uploadSpeed = uploadSpeed;
        //
        //     if (this.options.debug)
        //         console.debug(`Upload: ${ uploadSpeed } ${ this.options.uploadUnit }`);
        // }

        const testEndTime = Date.now();
        const elapsedTime = Number(((testEndTime - testStartTime) / 1000).toFixed(1));
        if (this.options.debug) {
            console.debug(`Test was performed in ${ elapsedTime } seconds`);
        }

        // TODO:
        return {
            // client: {
            //     ip: testConfig.settings.client.ip,
            //     lat: Number(testConfig.settings.client.lat),
            //     lon: Number(testConfig.settings.client.lon),
            //     isp: testConfig.settings.client.isp,
            //     ispRating: Number(testConfig.settings.client.isprating)
            // },
            client: testConfig.client,
            servers: bestServers,
            bestServer: bestServer,
            latency: latency,
            jitter: jitter,
            downloadResult: downloadResult,
            // uploadResult: uploadResult,
            totalTime: elapsedTime,
            ...this.result
        };
    }

    /**
     * Retrieves the configuration for speedtest.net test.
     * @private
     * @returns {Promise<STConfig>} Configuration for the current test
     */
    private async getConfig(): Promise<STConfig> {
        // TODO: return only client info cuz I don't need anything else?
        try {
            const { data } = await createRequest("https://www.speedtest.net/speedtest-config.php", {}, null, null, this.options.timeout, this.options.urllibOptions);
            const config = ((await parseXML(data.toString())).settings as STConfig);
            config.client.lat = Number(config.client.lat);
            config.client.lon = Number(config.client.lon);
            config.client.isprating = Number(config.client.isprating);
            config.client.rating = Number(config.client.rating);
            config.client.ispdlavg = Number(config.client.ispdlavg);
            config.client.ispulavg = Number(config.client.ispulavg);
            config.client.loggedin = Number(config.client.loggedin);
            return config;
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
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&limit=10&https_functional=true`;
        try {
            const { data } = await createRequest(serversUrl, {}, null, null, this.options.timeout, this.options.urllibOptions);
            const servers: STMeasurementServer[] = JSON.parse(data);
            return new Promise(resolve => {
                servers.forEach(server => {
                    // Convert info to correct types
                    server.lat = Number(server.lat);
                    server.lon = Number(server.lon);
                    server.id = Number(server.id);
                    // TODO:
                    // delete server.url;
                    // delete server.preferred;
                    // delete server.https_functional;
                    if (distanceUnit === DistanceUnits.km) {
                        server.distance = convertMilesToKilometers(server.distance);
                    }

                    // Measure server latency and jitter in parallel
                    testsInProgress++;
                    const socketClient = this.createSocketClient(server.host);
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
     * Creates a WebSocket client connection to the specified server.
     * @param {string} host - Server to send requests to
     * @private
     * @returns {WebSocket} WebSocket client connection
     */
    private createSocketClient(host: string): WebSocket {
        return new WebSocket(`wss://${ host }/ws`, {
            headers: {
                "User-Agent": this.USER_AGENT
            },
            timeout: 10
        });
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

    private readonly delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Performs download speed measurement and returns the result.
     * @param {STMeasurementServer[]} servers - All available measurement servers
     * @param {string} testUUID - Generated UUID for this test
     * @private
     * @returns {STDownloadResult} Download speed measurement result
     */
    private async measureDownloadSpeed(servers: STMeasurementServer[], testUUID: string): Promise<STDownloadResult> {
        let sampleBytes = 0;

        // Handler for interrupting active connections
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        // Handler for current number of active connections
        let activeConnections = 0;
        const increaseConnections = () => activeConnections++;
        const decreaseConnections = () => activeConnections--;

        // Handler for opening new connections
        const openServerConnection = (server: STMeasurementServer) => {
            increaseConnections();
            fetch(`https://${ server.host }/download?nocache=${ Math.random() }&size=25000000&guid=${ testUUID }`, { signal: abortSignal }).then(response => {
                if (response.ok) {
                    // Handler for capturing downloaded bytes
                    const readChunk = ({ done, value }) => {
                        if (!done) {
                            sampleBytes += value.length;
                            reader.read().then(readChunk).catch(decreaseConnections);
                        } else {
                            decreaseConnections();
                        }
                    };

                    // Handle first chunk
                    const reader = response.body.getReader();
                    reader.read().then(readChunk).catch(decreaseConnections);
                } else {
                    decreaseConnections();
                }
            }).catch(decreaseConnections);
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

            const checkInterval = setInterval(() => {
                const now = Date.now();
                const elapsedSampleTime = now - lastSampleTime;
                const bandwidthInBytes = (sampleBytes / (elapsedSampleTime / 1_000));

                // Save current bandwidth
                transferredBytes += sampleBytes;
                sampleBytes = 0;
                lastSampleTime = now;
                bandwidthSamples.push(bandwidthInBytes);

                // Calculate current progress in percents
                const elapsedTotalTime = now - startTime;
                const progressPercentage = Math.min(100, Math.floor((elapsedTotalTime / 15_000) * 100));
                if (progressPercentage < 50) {
                    // Check whether additional connections should be opened
                    const recommendedConnections = Math.ceil(bandwidthInBytes / 750_000);
                    const additionalConnections = recommendedConnections - activeConnections;
                    for (let i = 0; i < additionalConnections; i++) {
                        // TODO: implement round-robin
                        const serverIndex = Math.floor(Math.random() * 4);
                        const server = servers.at(serverIndex);
                        openServerConnection(server);
                    }
                } else if (progressPercentage === 100) {
                    clearInterval(checkInterval);

                    // Abort all active connections
                    abortController.abort();

                    // Calculate final download speed
                    const finalSpeed = this.calculateSpeedFromSamples(bandwidthSamples);
                    const convertedSpeed = convertUnits(SpeedUnits.Bps, this.options.downloadUnit, finalSpeed);
                    resolve({
                        transferredBytes: transferredBytes,
                        // TODO: implement latency test
                        latency: 0,
                        speed: Number(convertedSpeed.toFixed(2))
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

    // private async openDownloadConnection(signal: AbortSignal, server: STMeasurementServer, uuid: string, callback: (bytes: number) => void) {
    //     const lowerConnections = () => this.openedConnections--;
    //     const response = await fetch(`https://${ server.host }/download?nocache=${ Math.random() }&size=25000000&guid=${ uuid }`, { signal });
    //     if (response.ok) {
    //         const appendBytes = ({ done, value }) => {
    //             if (!done) {
    //                 callback(value.length);
    //                 reader.read().then(appendBytes).catch(lowerConnections);
    //             } else {
    //                 lowerConnections();
    //             }
    //         };
    //         const reader = response.body.getReader();
    //         reader.read().then(appendBytes).catch(lowerConnections);
    //     } else {
    //         this.openedConnections--;
    //     }
    // }

    // private async testDownloadSpeedss(servers: STMeasurementServer[]): Promise<number> {
    //     let prevReqTimes: any = [];
    //     let downloads = [];
    //     let sockets: WebSocket[] = [];
    //     return new Promise((resolve, reject) => {
    //         setTimeout(() => {
    //             sockets.forEach(socket => socket.close());
    //             resolve(average(downloads, 2));
    //         }, 15_000);
    //         servers.forEach(server => {
    //             prevReqTimes[server.id] = [];
    //             // for (let i = 0; i < 4; i++) {
    //             // Measure server latency and jitter in parallel
    //             const ws = this.createSocketClient(server.host);
    //             sockets.push(ws);
    //
    //             ws.on("error", (error) => reject(error));
    //
    //             ws.on("open", () => {
    //                 ws.send("HI");
    //                 ws.send("PING ");
    //             });
    //
    //             ws.on("message", (data) => {
    //                 const message = data.toString();
    //                 if (message.includes("PONG")) {
    //                     console.log("pong");
    //                     const now = Date.now();
    //                     ws.send(`DOWNLOAD 8000000`);
    //                     prevReqTimes[server.id]/*[i]*/ = now;
    //                 } else if (message.includes("DOWNLOAD ")) {
    //                     console.log("DOWN");
    //                     const now = Date.now();
    //                     const elapsedTime = now - prevReqTimes[server.id]/*[i]*/;
    //                     // const download = Number((((250000 / (elapsedTime / 1000)) * 8.0) / 1000.0 / 1000.0).toFixed(2));
    //                     const bitsPerByte = 8;
    //                     const bits = 8000000 * bitsPerByte;
    //                     const mbps = (bits / (elapsedTime * 0.001)) * 1e-6;
    //                     const download = mbps;
    //                     console.log("current download: " + download);
    //                     downloads.push(download);
    //                     ws.send(`DOWNLOAD 8000000`);
    //                     prevReqTimes[server.id]/*[i]*/ = now;
    //                 } else if (!message.includes("HELLO")) {
    //                     console.log(message);
    //                     console.error("WTF");
    //                 }
    //             });
    //             // }
    //         });
    //     });
    // }

    /**
     * Returns the download speed.
     * @private
     * @returns {Promise<number>} Download speed
     */
    // private async testDownloadSpeeds(host: string): Promise<number> {
    //     const urls = [];
    //     const sizes = [ 245388, 505544, 1118012, 1986284, 4468241,
    //         7907740, 12407926, 17816816, 24262167,
    //         31625365 ];
    //
    //     try {
    //         for (const size of sizes) {
    //             const counts = 3;
    //             for (let i = 0; i < counts; i++)
    //                 urls.push(`https://${ host }/download?size=${ size }`);
    //         }
    //
    //         const requestCount = urls.length;
    //         const requests: Request[] = [];
    //         urls.forEach((url, i) => {
    //             console.log(url);
    //             requests.push({
    //                 url: url,
    //                 headers: {},
    //                 body: null,
    //                 cacheBump: i.toString(),
    //                 // timeout: (this.options.wait) ? this.options.timeout : this.testConfig.lengths.download,
    //                 timeout: 60000,
    //                 totalData: null
    //             });
    //         });
    //
    //         // const maxThreads = this.testConfig.threads.download;
    //         const maxThreads = 4;
    //         const inFlight = { "threads": 0 };
    //         const finished = [];
    //         const start = Date.now();
    //
    //         const __dirname = path.resolve();
    //         for (const request of requests) {
    //             while (inFlight.threads >= maxThreads)
    //                 await this.delay(0.001);
    //
    //             const worker = new Worker(__dirname + "/src/thread_workers/download_worker.ts", {
    //                 workerData: {
    //                     path: "./download_worker.ts",
    //                     request,
    //                     wait: this.options.wait,
    //                     startTime: start,
    //                     // timeout: this.testConfig.lengths.download,
    //                     timeout: 60000,
    //                     urllibOptions: this.options.urllibOptions
    //                 }
    //             });
    //
    //             worker.on("message", (result) => {
    //                 inFlight.threads--;
    //                 finished.push(sum(result));
    //             });
    //
    //             inFlight.threads++;
    //         }
    //
    //         while (finished.length < requestCount)
    //             await this.delay(0.001);
    //
    //         const end = Date.now();
    //         const bytesReceived = sum(finished);
    //         console.log(bytesReceived);
    //         let download = (
    //             (bytesReceived / ((end - start) / 1000)) * 8.0
    //         );
    //         // if (download > 100000)
    //         //     this.testConfig.threads.upload = 8;
    //
    //         download = Number((download / 1000.0 / 1000.0).toFixed(2));
    //
    //         if (this.options.downloadUnit !== SpeedUnits.Mbps)
    //             return convertUnits(SpeedUnits.Mbps, this.options.downloadUnit, download);
    //         else
    //             return download;
    //     } catch (e) {
    //         console.error(e);
    //         throw new Error("An error occurred while measuring the download speed.");
    //     }
    // }

    /**
     * Measures the upload speed.
     * @private
     * @returns Promise
     */
    private async testUploadSpeed(): Promise<number> {
        const sizes = [];

        try {
            for (const size of this.testConfig.sizes.upload) {
                for (let i = 0; i < this.testConfig.counts.upload; i++)
                    sizes.push(size);
            }

            const requestCount = this.testConfig.uploadMax;
            const requests: Request[] = [];
            sizes.slice(0, requestCount).forEach((size, i) => {
                const headers: IncomingHttpHeaders = {};
                headers["content-length"] = size;

                const data = new HTTPUploaderData(size);
                data.preAllocate();

                requests.push({
                    url: "",//this.fastestServer.url,
                    headers: headers,
                    body: data.read(size),
                    cacheBump: i.toString(),
                    timeout: (this.options.wait) ? this.options.timeout : this.testConfig.lengths.upload,
                    totalData: data.total
                });
            });

            const maxThreads = this.testConfig.threads.upload;
            const inFlight = { "threads": 0 };
            const finished = [];
            const start = Date.now();

            for (const request of requests) {
                while (inFlight.threads >= maxThreads)
                    await this.delay(0.001);

                const worker = new Worker(__dirname + "/../thread_workers/upload_worker.js", {
                    workerData: {
                        path: "./upload_worker.ts",
                        request,
                        wait: this.options.wait,
                        startTime: start,
                        timeout: this.testConfig.lengths.upload,
                        urllibOptions: this.options.urllibOptions
                    }
                });

                worker.on("message", (result) => {
                    inFlight.threads--;
                    finished.push(result);
                });

                inFlight.threads++;
            }

            while (finished.length < requestCount)
                await this.delay(0.001);

            const end = Date.now();
            const bytesSent = sum(finished);
            const upload = Number((((bytesSent / ((end - start) / 1000)) * 8.0) / 1000.0 / 1000.0).toFixed(2));

            if (this.options.uploadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.uploadUnit, upload);
            else
                return upload;
        } catch {
            throw new Error("An error occurred while measuring the upload speed.");
        }
    }
}
