import {performance} from "perf_hooks";
import {HttpClientResponse, IncomingHttpHeaders, RequestOptions} from "urllib";
import {createRequest} from "./helpers/UrllibHelper";
import {avg, convertUnits, getDistance, getQuartile, jitter, sortObject} from "./Utils";
import {SpeedUnits} from "./index";


export class Cloudflare {
    private readonly options: CloudflareOptions;
    private readonly result: CloudflareResult = {} as CloudflareResult;

    private testConfig;
    private clientLat: number;
    private clientLon: number;
    private readonly tests = {
        download: [
            [101000, 10],
            [1001000, 8],
            [10001000, 6],
            [25001000, 4],
            [100001000, 1]
        ],
        upload: [
            [11000, 10],
            [101000, 10],
            [1001000, 8]
        ]
    }
    private servers = {};
    private bestServer;

    /**
     * Constructor for Cloudflare class
     * @param options - CloudflareOptions (available options for this test)
     */
    constructor(options: CloudflareOptions) {
        this.options = options;
    }

    /**
     * The function that performs the entire measurement
     * @returns Promise
     */
    public async run(): Promise<CloudflareResult> {
        const start = performance.now();
        await this.getMetaData();

        this.result.client = {
            ip: this.testConfig.clientIp,
            city: this.testConfig.city,
            countryCode: this.testConfig.country
        };

        if (this.options.debug) {
            console.debug("speed.cloudflare.com data were obtained");
            console.debug("Client - " + this.result.client.ip + " (" + this.result.client.countryCode + ")");
        }

        await this.getServersList();
        this.bestServer = this.getClosestServer();

        this.result.server = {
            city: this.bestServer.city,
            region: this.bestServer.region,
            countryCode: this.bestServer.cca2,
            distance: Number(Number(this.bestServer.distance).toFixed(2)),
        };
        const latency = await this.getLatency();
        this.result.ping = latency[0];
        this.result.jitter = latency[1];

        if (this.options.debug)
            console.debug("Server: " + this.bestServer.iata + " (" + this.bestServer.city + " - " + this.bestServer.region + "), " + Number(this.bestServer.distance).toFixed(2) + " km, " + this.result.ping + " ms");

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
     * Retrieve client data from speed.cloudflare.com
     * @private
     * @returns Promise
     */
    private async getMetaData(): Promise<void> {
        try {
            const request = createRequest("://speed.cloudflare.com/meta", {}, this.options.secure, {}, "", this.options.timeout, false, this.options.urllibOptions);
            await request.then((result) => {
                const response = JSON.parse(result.data.toString());
                this.testConfig = response;

                this.clientLat = response.latitude;
                this.clientLon = response.longitude;
            });
        } catch {
            throw new Error("An error occurred while retrieving metadata from the Cloudflare measuring station.");
        }
    }

    /**
     * Retrieve a list of speed.cloudflare.com servers
     * @private
     * @returns Promise
     */
    private async getServersList(): Promise<void> {
        const headers: IncomingHttpHeaders = {};
        headers["Accept-Encoding"] = "gzip";

        try {
            const request = createRequest("://speed.cloudflare.com/locations", headers, this.options.secure, {}, "", this.options.timeout, false, this.options.urllibOptions);
            await request.then((result) => {
                try {
                    const response = JSON.parse(result.data.toString());
                    response.forEach((server) => {
                        const distance = getDistance(this.clientLat, this.clientLon, Number(server.lat), Number(server.lon));

                        server.distance = distance;
                        this.servers[distance] = server;
                    });
                } catch (e) {
                    throw new Error("Error getting server list");
                }
            });
        } catch {
            throw new Error("An error occurred while retrieving the server list from the Cloudflare metering station.");
        }
    }

    /**
     * Function to get closest server by client and server distance
     * @private
     * @returns [string, unknown]
     */
    private getClosestServer(): object {
        return Object.entries(sortObject(this.servers))[0][1];
    }

    /**
     * Function to get client latency
     * @private
     */
    private async getLatency(): Promise<[number, number]> {
        try {
            const times = [];

            for (let i = 0; i < 20; i++) {
                const start = performance.now();

                await this.doDownload(1000).then((result) => {
                    const total = (performance.now() - start);

                    if (result.res.statusCode === 200)
                        times.push(total);
                });
            }
            return [Number(avg(times).toFixed(3)), Number(jitter(times).toFixed(3))];
        } catch {
            throw new Error("An error occurred while measuring latency.");
        }
    }

    /**
     * Function to create urllibRequest with specific amount of bytes for download
     * @param bytes - How many bytes to download
     * @private
     */
    private doDownload(bytes: number): Promise<HttpClientResponse<unknown>> {
        return createRequest(`://speed.cloudflare.com/__down?bytes=${bytes}`, {}, this.options.secure, {}, "", this.options.timeout, false, this.options.urllibOptions);
    }

    /**
     * The function to measure download speed
     * @private
     * @returns Promise
     */
    private async testDownloadSpeed(): Promise<number> {
        const completedTests = [];

        try {
            for (const test of this.options.downloadPayload || this.tests.download) {
                const singleTest = [];
                for (let i = 0; i < test[1]; i++) {
                    const start = performance.now();
                    await this.doDownload(test[0]).then(() => {
                        singleTest.push((test[0] / ((performance.now() - start) / 1000)) * 8.0 / 1000 / 1000);
                    });
                }
                completedTests.push(...singleTest);
            }

            const download = Number(Number(getQuartile(completedTests, 0.9)).toFixed(2));

            if (this.options.downloadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.downloadUnit, download);
            else
                return download;
        } catch {
            throw new Error("An error occurred while measuring the download speed.");
        }
    }

    /**
     * Function to create urllibRequest with specific amount of bytes for upload
     * @param bytes - How many bytes to download
     * @private
     */
    private doUpload(bytes: number): Promise<HttpClientResponse<unknown>> {
        const bytesData = "0".repeat(bytes);

        const headers: IncomingHttpHeaders = {};
        headers["content-length"] = `${Buffer.byteLength(bytesData)}`;

        return createRequest(`://speed.cloudflare.com/__up`, headers, this.options.secure, bytesData, "", this.options.timeout, false, this.options.urllibOptions);
    }

    /**
     * The function to measure upload speed
     * @private
     * @returns Promise
     */
    private async testUploadSpeed(): Promise<number> {
        const completedTests = [];

        try {
            for (const test of this.options.uploadPayload || this.tests.upload) {
                const singleTest = [];
                for (let i = 0; i < test[1]; i++) {
                    await this.doUpload(test[0]).then((result) => {
                        const duration = parseFloat(<string>result.res.headers["server-timing"].slice(22));
                        singleTest.push((test[0] * 8) / (duration / 1000) / 1e6);
                    });
                }
                completedTests.push(...singleTest);
            }

            const upload = Number(Number(getQuartile(completedTests, 0.9)).toFixed(2));

            if (this.options.uploadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.uploadUnit, upload);
            else
                return upload;
        } catch {
            throw new Error("An error occurred while measuring the upload speed.");
        }
    }
}

export interface CloudflareOptions {
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
    /** The resulting unit of download speed. */
    downloadUnit?: SpeedUnits,
    /** The resulting unit of upload speed. */
    uploadUnit?: SpeedUnits,
    /** Payload used by Cloudflare test (download). */
    downloadPayload?: number[][],
    /** Payload used by Cloudflare test (upload). */
    uploadPayload?: number[][],
    /** Custom request options to urllib. */
    urllibOptions?: RequestOptions
}

export interface CloudflareResult {
    /** Client information. */
    client: Client
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
    /** Client city. */
    city: string,
    /** Client country code. */
    countryCode: string
}

interface Server {
    /** Server city. */
    city: string,
    /** Server country. */
    region: string,
    /** Server country code. */
    countryCode: string,
    /** Server distance. */
    distance: number
}
