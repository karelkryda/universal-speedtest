import { CloudflareResult, DistanceUnits, SpeedUnits, STResult, USOptions } from "./interfaces/index.js";
import { convertUnits } from "./utils/index.js";
import { Cloudflare, Speedtest } from "./tests/index.js";

export class UniversalSpeedTest {
    private readonly options: USOptions;

    constructor(options?: USOptions) {
        this.options = {
            debug: false,
            multiTest: true,
            serversCount: 10,
            timeout: 60,
            measureDownload: true,
            measureUpload: false,
            wait: true,
            urlCount: 5,
            distanceUnit: DistanceUnits.mi,
            downloadUnit: SpeedUnits.Mbps,
            uploadUnit: SpeedUnits.Mbps,
            downloadPayload: [
                [ 101000, 10 ],
                [ 1001000, 8 ],
                [ 10001000, 6 ],
                [ 25001000, 4 ],
                [ 100001000, 1 ]
            ],
            uploadPayload: [
                [ 11000, 10 ],
                [ 101000, 10 ],
                [ 1001000, 8 ]
            ],
            ...options
        };
    }

    /**
     * Performs measurements using speedtest.net
     * @returns Promise
     */
    public runSpeedtestTest(): Promise<STResult> {
        const speedTest = new Speedtest(this.options);
        return speedTest.run();
    }

    /**
     * Performs measurements using speed.cloudflare.com
     * @returns Promise
     */
    public runCloudflareTest(): Promise<CloudflareResult> {
        const speedTest = new Cloudflare(this.options);
        return speedTest.run();
    }
}

export {
    DistanceUnits,
    SpeedUnits,
    convertUnits
};
