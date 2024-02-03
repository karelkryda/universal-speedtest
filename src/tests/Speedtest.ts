import * as path from "path";
import { Worker } from "worker_threads";
import { IncomingHttpHeaders } from "http";
import { HTTPUploaderData } from "../helpers/index.js";
import { Options, Request, SpeedtestResult, SpeedUnits, STMeasurementServer } from "../interfaces/index.js";
import { convertUnits, createRequest, jitter, parseXML, sum } from "../utils/index.js";

export class Speedtest {
    private readonly options: Options;
    private readonly result: SpeedtestResult = {} as SpeedtestResult;

    private testConfig: any;
    private readonly uploadSizes = [ 32768, 65536, 131072, 262144, 524288, 1048576, 7340032 ];
    private servers: STMeasurementServer[];
    private fastestServer: STMeasurementServer;

    /**
     * Constructor for Speedtest class
     * @param options - UniversalSpeedTest options object
     */
    constructor(options: Options) {
        this.options = options;
    }

    /**
     * Performs the entire measurement.
     * @returns Promise
     */
    public async run(): Promise<SpeedtestResult> {
        const start = Date.now();

        // Get test config
        await this.getConfig();
        this.result.client = {
            ip: this.testConfig.client.ip,
            lat: this.testConfig.client.lat,
            lon: this.testConfig.client.lon,
            isp: this.testConfig.client.isp,
            ispRating: this.testConfig.client.isprating
        };

        if (this.options.debug) {
            console.debug("speedtest.net config was obtained");
            console.debug(`Client - ${ this.result.client.isp } (${ this.result.client.ip })`);
        }

        // Get test server and fastest server
        await this.getServersList();
        await this.getBestServer();
        this.result.ping = this.fastestServer.latency;
        this.result.jitter = Number(this.fastestServer.jitter.toFixed(3));
        this.result.server = {
            sponsor: this.fastestServer.sponsor,
            city: this.fastestServer.name,
            country: this.fastestServer.country,
            countryCode: this.fastestServer.cc,
            distance: Number(this.fastestServer.distance.toFixed(2))
        };

        if (this.options.debug)
            console.debug(`Server: ${ this.fastestServer.sponsor } (${ this.fastestServer.name } - ${ this.fastestServer.country }), ${ this.fastestServer.distance.toFixed(2) } km, ${ this.fastestServer.latency.toFixed(3) } ms`);

        // Test download speed
        if (this.options.measureDownload) {
            const downloadSpeed = await this.testDownloadSpeed();
            this.result.downloadSpeed = downloadSpeed;

            if (this.options.debug)
                console.debug(`Download: ${ downloadSpeed } ${ this.options.downloadUnit }`);
        }

        // Test upload speed
        if (this.options.measureUpload) {
            const uploadSpeed = await this.testUploadSpeed();
            this.result.uploadSpeed = uploadSpeed;

            if (this.options.debug)
                console.debug(`Upload: ${ uploadSpeed } ${ this.options.uploadUnit }`);
        }

        const end = Date.now();
        if (this.options.debug)
            console.debug(`Test performed in ${ ((end - start) / 1000).toFixed(1) } seconds`);

        this.result.totalTime = Number(((end - start) / 1000).toFixed(1));
        return this.result;
    }

    /**
     * Retrieves configuration for speedtest.net test.
     * @private
     * @returns Promise
     */
    private async getConfig(): Promise<void> {
        try {
            const { data } = await createRequest("https://www.speedtest.net/speedtest-config.php", {}, null, null, this.options.timeout, this.options.urllibOptions);
            parseXML(data.toString(), (response) => {
                const client = response.settings.client[0].$;
                const serverConfig = response.settings["server-config"][0].$;
                const download = response.settings.download[0].$;
                const upload = response.settings.upload[0].$;

                const uploadRatio = Number(upload.ratio);
                const uploadMax = Number(upload.maxchunkcount);

                const sizes = {
                    "upload": this.uploadSizes.slice(uploadRatio - 1, this.uploadSizes.length),
                    "download": [ 350, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000 ]
                };

                const uploadSizeCount = sizes["upload"].length;
                const uploadCount = Math.ceil(uploadMax / uploadSizeCount);

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
                    "sizes": sizes,
                    "counts": counts,
                    "threads": threads,
                    "length": length,
                    "uploadMax": uploadCount * uploadSizeCount
                };
            });
        } catch {
            throw new Error("An error occurred while retrieving test configuration from speedtest.net.");
        }
    }

    /**
     * Retrieves a list of speedtest.net servers.
     * @private
     * @returns Promise
     */
    private async getServersList(limit = 5): Promise<void> {
        const serversUrl = `https://www.speedtest.net/api/js/servers?engine=js&limit=${ limit }`;
        try {
            const { data } = await createRequest(serversUrl, {}, null, null, this.options.timeout, this.options.urllibOptions);
            const servers: STMeasurementServer[] = JSON.parse(data);
            servers.forEach(server => server.distance = server.distance * 1.609344);
            this.servers = servers;
        } catch {
            throw new Error("An error occurred while retrieving the server list from speedtest.net.");
        }
    }

    /**
     * Returns the server with the shortest average response time.
     * @private
     * @returns Promise
     */
    private async getBestServer(): Promise<void> {
        try {
            for (const server of this.servers) {
                const totalTimes = [];
                const url = `${ path.dirname(server.url) }/latency.txt`;

                for (let i = 0; i < 3; i++) {
                    const start = Date.now();
                    const {
                        statusCode,
                        data
                    } = await createRequest(url, {}, null, null, this.options.timeout, this.options.urllibOptions);
                    const total = (Date.now() - start);

                    if (statusCode === 200 && data.toString().trim() === "test=test")
                        totalTimes.push(total / 1000);
                    else
                        totalTimes.push(3600);
                }

                server.latency = Number(((sum(totalTimes) / 6) * 1000.0).toFixed(3));
                server.jitter = jitter(totalTimes) * 1000;
            }

            this.fastestServer = this.servers.sort((serverA, serverB) => serverA.latency - serverB.latency).at(0);
        } catch {
            throw new Error("An error occurred while measuring the latency to select the best server.");
        }
    }

    private readonly delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Measures the download speed.
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
            const requests: Request[] = [];
            urls.forEach((url, i) => {
                requests.push({
                    url: url,
                    headers: {},
                    body: null,
                    cacheBump: i.toString(),
                    timeout: (this.options.wait) ? this.options.timeout : this.testConfig.length.download,
                    totalData: null
                });
            });

            const maxThreads = this.testConfig.threads.download;
            const inFlight = { "threads": 0 };
            const finished = [];
            const start = Date.now();

            for (const request of requests) {
                while (inFlight.threads >= maxThreads)
                    await this.delay(0.001);

                const worker = new Worker(__dirname + "/../thread_workers/download_worker.js", {
                    workerData: {
                        path: "./download_worker.ts",
                        request,
                        wait: this.options.wait,
                        startTime: start,
                        timeout: this.testConfig.length.download,
                        urllibOptions: this.options.urllibOptions
                    }
                });

                worker.on("message", (result) => {
                    inFlight.threads--;
                    finished.push(sum(result));
                });

                inFlight.threads++;
            }

            while (finished.length < requestCount)
                await this.delay(0.001);

            const end = Date.now();
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
                    url: this.fastestServer.url,
                    headers: headers,
                    body: data.read(size),
                    cacheBump: i.toString(),
                    timeout: (this.options.wait) ? this.options.timeout : this.testConfig.length.upload,
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
                        timeout: this.testConfig.length.upload,
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
