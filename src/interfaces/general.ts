enum DistanceUnits {
    mi = "mi",
    km = "km",
}

enum SpeedUnits {
    Bps = "Bps",
    KBps = "KBps",
    MBps = "MBps",
    GBps = "GBps",
    bps = "bps",
    Kbps = "Kbps",
    Mbps = "Mbps",
    Gbps = "Gbps",
}

interface USOptions {
    /** Display debug messages. */
    debug?: boolean;
    /** Perform Ookla test against multiple servers. */
    multiTest?: boolean;
    /** Number of Ookla test servers to fetch. */
    serversToFetch?: number;
    /** Measure the download speed. */
    measureDownload?: boolean;
    /** Measure the upload speed. */
    measureUpload?: boolean;
    /** The resulting unit of distance to test server. */
    distanceUnit?: DistanceUnits;
    /** The resulting unit of download speed. */
    downloadUnit?: SpeedUnits;
    /** The resulting unit of upload speed. */
    uploadUnit?: SpeedUnits;
}

export {
    DistanceUnits,
    SpeedUnits,
    USOptions
};
