import { OoklaOptions } from "./Speedtest.js";

export enum HttpMethods {
    GET = "GET",
    POST = "POST"
}

export enum DistanceUnits {
    mi = "mi",
    km = "km",
}

export enum SpeedUnits {
    Bps = "Bps",
    KBps = "KBps",
    MBps = "MBps",
    GBps = "GBps",
    bps = "bps",
    Kbps = "Kbps",
    Mbps = "Mbps",
    Gbps = "Gbps",
}

interface USTestOptions {
    /** Measure the download speed. */
    measureDownload?: boolean;
    /** Measure the upload speed. */
    measureUpload?: boolean;
}

interface USUnitOptions {
    /** The resulting unit of distance from the test servers. */
    distanceUnit?: DistanceUnits;
    /** The resulting unit of download speed. */
    downloadUnit?: SpeedUnits;
    /** The resulting unit of upload speed. */
    uploadUnit?: SpeedUnits;
}

export interface USOptions {
    /** Display debug messages. */
    debug?: boolean;
    /** Configure what tests will be performed. */
    tests?: USTestOptions;
    /** Resulting units options. */
    units?: USUnitOptions;
    /** Ookla speedtest related options. */
    ooklaOptions?: OoklaOptions;
}
