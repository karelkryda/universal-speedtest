import { DistanceUnits, SpeedUnits, STResult, USOptions } from "./interfaces/index.js";
import { convertUnits } from "./utils/index.js";
import { Speedtest } from "./tests/index.js";

export class UniversalSpeedTest {
    private readonly options: USOptions;

    constructor(options?: USOptions) {
        this.options = {
            debug: false,
            multiTest: true,
            measureDownload: true,
            measureUpload: false,
            distanceUnit: DistanceUnits.mi,
            downloadUnit: SpeedUnits.Mbps,
            uploadUnit: SpeedUnits.Mbps,
            ...options
        };
    }

    /**
     * Performs measurements using speedtest.net
     * @returns Promise
     */
    public performTest(): Promise<STResult> {
        const speedTest = new Speedtest(this.options);
        return speedTest.run();
    }
}

export {
    DistanceUnits,
    SpeedUnits,
    convertUnits
};
