import { IncomingHttpHeaders } from "http";
import { HttpClientResponse } from "urllib/src/Response";
import { CFMeasurementServer, CFTestConfig, CloudflareResult, Options, SpeedUnits } from "../interfaces";
import { avg, convertUnits, createRequest, getDistance, getQuartile, jitter } from "../utils";

export class Cloudflare {
    private readonly options: Options;
    private readonly result: CloudflareResult = {} as CloudflareResult;

    private testConfig: CFTestConfig;
    private closestServer: CFMeasurementServer;

    /**
     * Constructor for Cloudflare class
     * @param options - CloudflareOptions (available options for this test)
     */
    constructor(options: Options) {
        this.options = options;
    }

    /**
     * Performs the entire measurement.
     * @returns Promise
     */
    public async run(): Promise<CloudflareResult> {
        const start = Date.now();

        // Get test config
        await this.getMetaData();
        this.result.client = {
            ip: this.testConfig.clientIp,
            isp: this.testConfig.asOrganization,
            city: this.testConfig.city,
            lat: this.testConfig.latitude,
            lon: this.testConfig.longitude,
            countryCode: this.testConfig.country
        };

        if (this.options.debug) {
            console.debug("speed.cloudflare.com data were obtained");
            console.debug(`Client - ${this.result.client.ip} (${this.result.client.countryCode})`);
        }

        // Get test server and fastest server
        await this.getServersList();
        this.result.server = {
            city: this.closestServer.city,
            region: this.closestServer.region,
            countryCode: this.closestServer.cca2,
            distance: Number(this.closestServer.distance.toFixed(2))
        };
        const latency = await this.getLatency();
        this.result.ping = latency[0];
        this.result.jitter = latency[1];

        if (this.options.debug)
            console.debug(`Server: ${this.closestServer.iata} (${this.closestServer.city} - ${this.closestServer.region}), ${this.closestServer.distance.toFixed(2)} km, ${this.result.ping} ms`);

        // Test download speed
        if (this.options.measureDownload) {
            const downloadSpeed = await this.testDownloadSpeed();
            this.result.downloadSpeed = downloadSpeed;

            if (this.options.debug)
                console.debug(`Download: ${downloadSpeed} ${this.options.downloadUnit}`);
        }

        // Test upload speed
        if (this.options.measureUpload) {
            const uploadSpeed = await this.testUploadSpeed();
            this.result.uploadSpeed = uploadSpeed;

            if (this.options.debug)
                console.debug(`Upload: ${uploadSpeed} ${this.options.uploadUnit}`);
        }

        const end = Date.now();
        if (this.options.debug)
            console.debug(`Test performed in ${((end - start) / 1000).toFixed(1)} seconds`);

        this.result.totalTime = Number(((end - start) / 1000).toFixed(1));
        return this.result;
    }

    /**
     * Retrieves client data from speed.cloudflare.com
     * @private
     * @returns Promise
     */
    private async getMetaData(): Promise<void> {
        try {
            const { data } = await createRequest("https://speed.cloudflare.com/meta", {}, null, null, this.options.timeout, this.options.urllibOptions);
            this.testConfig = JSON.parse(data);
        } catch {
            throw new Error("An error occurred while retrieving metadata from the Cloudflare measuring station.");
        }
    }

    /**
     * Retrieves a list of speed.cloudflare.com servers.
     * @private
     * @returns Promise
     */
    private async getServersList(): Promise<void> {
        try {
            const { data } = await createRequest("https://speed.cloudflare.com/locations", {}, null, null, this.options.timeout, this.options.urllibOptions);
            const servers: CFMeasurementServer[] = JSON.parse(data);
            servers.forEach((server) => server.distance = getDistance(this.testConfig.latitude, this.testConfig.longitude, server.lat, server.lon));

            this.closestServer = servers.sort((serverA, serverB) => serverA.distance - serverB.distance).at(0);
        } catch {
            throw new Error("An error occurred while retrieving the server list from the Cloudflare metering station.");
        }
    }

    /**
     * Gets client latency.
     * @private
     */
    private async getLatency(): Promise<[ number, number ]> {
        try {
            const times = [];

            for (let i = 0; i < 20; i++) {
                const start = Date.now();
                const { statusCode } = await this.doDownload(1000);
                const total = (Date.now() - start);

                if (statusCode === 200)
                    times.push(total);
            }
            return [ Number(avg(times).toFixed(3)), Number(jitter(times).toFixed(3)) ];
        } catch {
            throw new Error("An error occurred while measuring latency.");
        }
    }

    /**
     * Creates urllib request with specific amount of bytes for download.
     * @param bytes - How many bytes to download
     * @private
     */
    private doDownload(bytes: number): Promise<HttpClientResponse> {
        return createRequest(`https://speed.cloudflare.com/__down?bytes=${bytes}`, {}, null, null, this.options.timeout, this.options.urllibOptions);
    }

    /**
     * Measures the download speed.
     * @private
     * @returns Promise
     */
    private async testDownloadSpeed(): Promise<number> {
        const completedTests: number[] = [];

        try {
            for (const test of this.options.downloadPayload) {
                const singleTest: number[] = [];
                for (let i = 0; i < test[1]; i++) {
                    try {
                        const start = Date.now();
                        await this.doDownload(test[0]);
                        const total = (Date.now() - start);

                        singleTest.push((test[0] / (total / 1000)) * 8.0 / 1000 / 1000);
                    } catch {
                        // do nothing
                    }
                }
                completedTests.push(...singleTest);
            }

            const download = Number(getQuartile(completedTests, 0.9).toFixed(2));

            if (this.options.downloadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.downloadUnit, download);
            else
                return download;
        } catch {
            throw new Error("An error occurred while measuring the download speed.");
        }
    }

    /**
     * Creates urllib request with specific amount of bytes for upload.
     * @param bytes - How many bytes to download
     * @private
     */
    private doUpload(bytes: number): Promise<HttpClientResponse> {
        const bytesData = "0".repeat(bytes);

        const headers: IncomingHttpHeaders = {};
        headers["content-length"] = `${Buffer.byteLength(bytesData)}`;

        return createRequest(`https://speed.cloudflare.com/__up`, headers, bytesData, null, this.options.timeout, this.options.urllibOptions);
    }

    /**
     * Measures the upload speed.
     * @private
     * @returns Promise
     */
    private async testUploadSpeed(): Promise<number> {
        const completedTests = [];

        try {
            for (const test of this.options.uploadPayload) {
                const singleTest = [];
                for (let i = 0; i < test[1]; i++) {
                    try {
                        const { headers } = await this.doUpload(test[0]);

                        const duration = parseFloat(<string>headers["server-timing"].slice(22));
                        singleTest.push((test[0] * 8) / (duration / 1000) / 1e6);
                    } catch {
                        // do nothing
                    }
                }
                completedTests.push(...singleTest);
            }

            const upload = Number(getQuartile(completedTests, 0.9).toFixed(2));

            if (this.options.uploadUnit !== SpeedUnits.Mbps)
                return convertUnits(SpeedUnits.Mbps, this.options.uploadUnit, upload);
            else
                return upload;
        } catch {
            throw new Error("An error occurred while measuring the upload speed.");
        }
    }
}
