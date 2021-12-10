import * as path from "path";
import {Worker} from "worker_threads";
import {IncomingHttpHeaders} from "urllib";
import {createRequest, parseXML} from "./helpers/UrllibHelper";
import {convertUnits, getDistance, jitter, sortObject, sum} from "./Utils";
import {HTTPUploaderData} from "./helpers/HTTPUploaderData";
import {SpeedUnits} from "./index";


export class Speedtest {
    private readonly options: SpeedtestOptions;
    private readonly result: SpeedtestResult = {} as SpeedtestResult;

    private testConfig;
    private clientLat: number;
    private clientLon: number;
    private readonly uploadSizes = [32768, 65536, 131072, 262144, 524288, 1048576, 7340032];
    private servers = {};
    private fastestServer;

    /**
     * Constructor for Speedtest class
     * @param options - SpeedtestOptions (available options for this test)
     */
    constructor(options: SpeedtestOptions) {
        this.options = options;
    }

    /**
     * The function that performs the entire measurement
     * @returns Promise
     */
    public async run(): Promise<SpeedtestResult> {
        const start = performance.now();
        await this.getConfig();

        this.result.client = {
            ip: this.testConfig.client.ip,
            isp: this.testConfig.client.isp
        };

        if (this.options.debug) {
            console.debug("speedtest.net config was obtained");
            console.debug("Client - " + this.testConfig.client.isp + " (" + this.testConfig.client.ip + ")");
        }

        await this.getServersList();
        await this.getBestServer();

        if (this.options.debug)
            console.debug("Server: " + this.fastestServer.sponsor + " (" + this.fastestServer.name + " - " + this.fastestServer.country + "), " + Number(this.fastestServer.distance).toFixed(2) + " km, " + Number(this.fastestServer.latency).toFixed(3) + " ms");

        this.result.ping = Number(Number(this.fastestServer.latency).toFixed(3));
        this.result.jitter = Number(Number(this.fastestServer.jitter).toFixed(3));
        this.result.server = {
            sponsor: this.fastestServer.sponsor,
            city: this.fastestServer.name,
            country: this.fastestServer.country,
            countryCode: this.fastestServer.cc,
            distance: Number(Number(this.fastestServer.distance).toFixed(2))
        };

        if (this.options.measureDownload) {
            const downloadSpeed = await this.testDownloadSpeed()
            this.result.downloadSpeed = downloadSpeed;

            if (this.options.debug)
                console.debug("Download: " + downloadSpeed + " " + this.options.downloadUnit);
        }

        if (this.options.measureUpload) {
            const uploadSpeed = await this.testUploadSpeed();
            this.result.uploadSpeed = uploadSpeed;

            if (this.options.debug)
                console.debug("Upload: " + uploadSpeed + " " + this.options.uploadUnit);
        }

        const end = performance.now();
        if (this.options.debug)
            console.debug("Test performed in " + ((end - start) / 1000).toFixed(1) + " seconds");

        this.result.totalTime = Number(((end - start) / 1000).toFixed(1));
        return this.result;
    }

    /**
     * Retrieve configuration for speedtest.net test
     * @private
     * @returns Promise
     */
    private async getConfig(): Promise<void> {
        try {
            const request = createRequest("://www.speedtest.net/speedtest-config.php", {}, this.options.secure, {}, "0", this.options.timeout, true);
            await request.then((result) => {
                parseXML(result.data.toString(), (response) => {
                    const client = response.settings.client[0].$;
                    const serverConfig = response.settings["server-config"][0].$;
                    const download = response.settings.download[0].$;
                    const upload = response.settings.upload[0].$;

                    const ignoreServers = [];

                    const uploadRatio = Number(upload.ratio);

                    const uploadMax = Number(upload.maxchunkcount);

                    const sizes = {
                        "upload": this.uploadSizes.slice(uploadRatio - 1, this.uploadSizes.length),
                        "download": [350, 500, 750, 1000, 1500, 2000, 2500,
                            3000, 3500, 4000]
                    };

                    const uploadSizeCount = sizes["upload"].length;

                    const uploadCount = Number(Math.ceil(uploadMax / uploadSizeCount));

                    const counts = {
                        "upload": uploadCount,
                        "download": Number(download.threadsperurl)
                    };

                    const threads = {
                        "upload": Number(upload.threads),
                        "download": Number(serverConfig.threadcount) * 2
                    };

                    const length = {
                        "upload": Number(upload.testlength),
                        "download": Number(download.testlength)
                    };

                    this.testConfig = {
                        "client": client,
                        "ignoreServers": ignoreServers,
                        "sizes": sizes,
                        "counts": counts,
                        "threads": threads,
                        "length": length,
                        "uploadMax": uploadCount * uploadSizeCount
                    };

                    this.clientLat = parseFloat(client.lat);
                    this.clientLon = parseFloat(client.lon);
                });
            });
        } catch {
            throw new Error("An error occurred while retrieving test configuration from speedtest.net.");
        }
    }

    /**
     * Retrieve a list of speedtest.net servers
     * @private
     * @returns Promise
     */
    private async getServersList(): Promise<void> {
        const urls = [
            "://www.speedtest.net/speedtest-servers-static.php",
            "https://c.speedtest.net/speedtest-servers-static.php",
            //"://www.speedtest.net/speedtest-servers.php",
            "https://c.speedtest.net/speedtest-servers.php",
        ];

        const headers: IncomingHttpHeaders = {};
        headers["Accept-Encoding"] = "gzip";

        try {
            for (const url of urls) {
                const request = createRequest(url + "?threads=" + this.testConfig.threads.download, {}, this.options.secure, {}, "0", this.options.timeout, true);
                await request.then((result) => {
                    parseXML(result.data.toString(), (response) => {
                        try {
                            response.settings.servers[0].server.forEach((server) => {
                                const distance = getDistance(this.clientLat, this.clientLon, Number(server.$.lat), Number(server.$.lon));

                                server.$.distance = distance;
                                this.servers[distance] = [server.$];
                            });
                        } catch (e) {
                            throw new Error("Error getting server list");
                        }
                    });
                });
            }
        } catch {
            throw new Error("An error occurred while retrieving the server list from speedtest.net.");
        }
    }

    /**
     *
     * @param limit - Limit, from how many servers to choose
     * @private
     * @returns [string, unknown]
     */
    private getClosestServer(limit = 5): [string, unknown][] {
        return Object.entries(sortObject(this.servers)).slice(0, limit);
    }

    /**
     *
     * @private
     * @returns Promise
     */
    private async getBestServer(): Promise<void> {
        const servers = this.getClosestServer();
        const results = {};

        try {
            for (const server of servers) {
                const totalTimes = [];
                const url = path.dirname(server[1][0].url) + "/latency.txt";

                for (let i = 0; i < 3; i++) {
                    const start = performance.now();

                    const request = createRequest(url, {}, this.options.secure, {}, "0", this.options.timeout, true);
                    await request.then((result) => {
                        const total = (performance.now() - start)

                        if (result.res.statusCode === 200 && result.data.toString().trim() === "test=test")
                            totalTimes.push(total / 1000)
                        else
                            totalTimes.push(3600)
                    });
                }

                const avg = ((sum(totalTimes) / 6) * 1000.0).toFixed(3);
                results[avg] = server[1][0];
                results[avg].jitter = jitter(totalTimes) * 1000;
            }

            const fastestPing = Object.keys(results).sort(function (a, b) {
                return Number(b) - Number(a)
            }).reverse()[0];

            const fastestServer = results[fastestPing];
            fastestServer.latency = fastestPing;

            this.fastestServer = fastestServer;
        } catch {
            throw new Error("An error occurred while measuring the latency to select the best server.");
        }
    }

    private readonly delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * The function to measure download speed
     * @private
     * @returns Promise
     */
    private async testDownloadSpeed(): Promise<number> {
        const urls = [];

        try {
            for (const size of this.testConfig.sizes.download) {
                for (let i = 0; i < this.testConfig.counts.download; i++)
                    urls.push(path.dirname(this.fastestServer.url) + "/random" + size + "x" + size + ".jpg");
            }

            const requestCount = urls.length;
            const requests = [];
            urls.forEach((url, i) => {
                requests.push([url, this.options.secure, i.toString(), (this.options.wait) ? this.options.timeout : this.testConfig.length.download]);
            });

            const maxThreads = this.testConfig.threads.download;
            const inFlight = {"threads": 0};
            const finished = [];
            const start = performance.now();

            for (const request of requests) {
                while (inFlight.threads >= maxThreads)
                    await this.delay(0.001);

                const worker = new Worker(__dirname + "/thread_workers/download_worker.js", {
                    workerData: {
                        path: "./download_worker.ts",
                        request,
                        wait: this.options.wait,
                        startTime: start,
                        timeout: this.testConfig.length.download
                    }
                });

                worker.on("message", (result) => {
                    inFlight.threads -= 1;
                    finished.push(sum(result));
                });

                inFlight.threads += 1;
            }

            while (finished.length < requestCount)
                await this.delay(0.001);

            const end = performance.now();
            const bytesReceived = sum(finished);
            let download = (
                (bytesReceived / ((end - start) / 1000)) * 8.0
            );
            if (download > 100000)
                this.testConfig.threads.upload = 8;

            download = Number((download / 1000.0 / 1000.0).toFixed(2));

            if (this.options.downloadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.downloadUnit, download);
            else
                return download;
        } catch {
            throw new Error("An error occurred while measuring the download speed.");
        }
    }

    /**
     * The function to measure upload speed
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
            const requests = [];
            sizes.slice(0, requestCount).forEach((size, i) => {
                const headers: IncomingHttpHeaders = {};
                headers["content-length"] = size;

                const data = new HTTPUploaderData(size);
                data.preAllocate();

                requests.push([this.fastestServer.url, headers, this.options.secure, data.read(size), i.toString(), (this.options.wait) ? this.options.timeout : this.testConfig.length.upload, data.total]);
            });

            const maxThreads = this.testConfig.threads.upload;
            const inFlight = {"threads": 0};
            const finished = [];
            const start = performance.now();

            for (const request of requests) {
                while (inFlight.threads >= maxThreads)
                    await this.delay(0.001);

                const worker = new Worker(__dirname + "/thread_workers/upload_worker.js", {
                    workerData: {
                        path: "./upload_worker.ts",
                        request,
                        wait: this.options.wait,
                        startTime: start,
                        timeout: this.testConfig.length.upload
                    }
                });

                worker.on("message", (result) => {
                    inFlight.threads -= 1;
                    finished.push(result);
                });

                inFlight.threads += 1;
            }

            while (finished.length < requestCount)
                await this.delay(0.001);

            const end = performance.now();
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

export interface SpeedtestOptions {
    /** Display debug messages. */
    debug?: boolean,
    /** Use https. */
    secure?: boolean,
    /** Single request timeout (in seconds). */
    timeout?: number,
    /** Measure the download speed. */
    measureDownload?: boolean,
    /** Measure the upload speed. */
    measureUpload?: boolean,
    /** Complete test without skipping (if timeout reached). */
    wait?: boolean,
    /** The resulting unit of download speed. */
    downloadUnit?: SpeedUnits,
    /** The resulting unit of upload speed. */
    uploadUnit?: SpeedUnits
}

export interface SpeedtestResult {
    /** Client information. */
    client: Client,
    /** Network ping. */
    ping: number,
    /** Network jitter. */
    jitter: number,
    /** Network download speed. */
    downloadSpeed?: number,
    /** Network upload speed. */
    uploadSpeed?: number,
    /** Server information. */
    server: Server,
    /** The time the test lasted in seconds. */
    totalTime: number
}

interface Client {
    /** Client IP address. */
    ip: string,
    /** Client ISP. */
    isp: string
}

interface Server {
    /** Server name. */
    sponsor: string,
    /** Server city. */
    city: string,
    /** Server country. */
    country: string,
    /** Server country code. */
    countryCode: string,
    /** Server distance. */
    distance: number
}