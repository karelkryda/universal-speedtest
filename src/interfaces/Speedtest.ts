interface STConfig {
    client: STConfigClient;
    "server-config": STConfigServerConfig;
    odometer: STConfigOdometer;
    times: STConfigTimes;
    download: STConfigDownload;
    upload: STConfigUpload;
    latency: STConfigLatency;
    "socket-download": STConfigSocketLoad;
    "socket-upload": STConfigSocketLoad;
    "socket-latency": STConfigLatency;
}

interface STConfigClient {
    ip: string;
    lat: number;
    lon: number;
    isp: string;
    isprating: number;
    rating: number;
    ispdlavg: number;
    ispulavg: number;
    loggedin: number;
    country: string;
}

interface STConfigServerConfig {
    threadcount: number;
    ignoreids: string;
    notonmap: string;
    forcepingid: string;
    preferredserverid: string;
}

interface STConfigOdometer {
    start: number;
    rate: number;
}

interface STConfigTimes {
    dl1: number;
    dl2: number;
    dl3: number;
    ul1: number;
    ul2: number;
    ul3: number;
}

interface STConfigDownload {
    testlength: number;
    initialtest: string;
    mintestsize: string;
    threadsperurl: number;
}

interface STConfigUpload {
    testlength: number;
    ratio: number;
    initialtest: number;
    mintestsize: string;
    threads: number;
    maxchunksize: string;
    maxchunkcount: number;
    threadsperurl: number;
}

interface STConfigLatency {
    testlength: number;
    waittime: number;
    timeout: number;
}

interface STConfigSocketLoad {
    testlength: number;
    initialthreads: number | string;
    minthreads: number | string;
    maxthreads: number;
    threadratio: string;
    maxsamplesize: number;
    minsamplesize: number;
    startsamplesize: number;
    startbuffersize: number;
    bufferlength: number;
    packetlength: number;
    readbuffer?: number;
    disabled?: boolean;
}

interface STTestConfig {
    client: STConfigClient;
    sizes: STConfigSizes;
    counts: STConfigCounts;
    threads: STConfigThreads;
    lengths: STConfigLengths;
    uploadMax: number;
}

interface STConfigSizes {
    upload: number[];
    download: number[];
}

interface STConfigCounts {
    upload: number;
    download: number;
}

interface STConfigThreads {
    upload: number;
    download: number;
}

interface STConfigLengths {
    upload: number;
    download: number;
}

interface STMeasurementServer {
    /**
     * Server url.
     */
    url: string;
    /**
     * Server latitude.
     */
    lat: number;
    /**
     * Server longitude.
     */
    lon: number;
    /**
     * Server distance (km).
     */
    distance: number;
    /**
     * Server name.
     */
    name: string;
    /**
     * Server country.
     */
    country: string;
    /**
     * Server country code.
     */
    cc: string;
    /**
     * Server sponsor.
     */
    sponsor: string;
    /**
     * Server ID.
     */
    id: number;
    /**
     * Server preferred.
     */
    preferred: boolean;
    /**
     * Server HTTPS functional.
     */
    https_functional: boolean;
    /**
     * Server host URI.
     */
    host: string;
    /**
     * Server latency.
     */
    latency: number;
    /**
     * Server jitter.
     */
    jitter: number;
}

interface STResultClient {
    /** Client IP address. */
    ip: string;
    /**
     * Client latitude.
     */
    lat: number;
    /**
     * Client longitude.
     */
    lon: number;
    /** Client ISP. */
    isp: string;
    /**
     * Client ISP rating.
     */
    ispRating: number;
}

interface STLatencyJitter {
    latency: number;
    jitter: number;
}

interface STDownloadResult {
    transferredBytes: number;
    latency: number;
    jitter: number;
    speed: number;
}

interface STResult {
    /** Client information. */
    client: STResultClient;
    /** Network latency. */
    latency: number;
    /** Network jitter. */
    jitter: number;
    /** Network download measurement result. */
    downloadResult?: STDownloadResult;
    /** Network upload measurement result. */
    // uploadResult?: STUploadResult;
    /** Servers information. */
    servers: STMeasurementServer[];
    /** The best server information. */
    bestServer: STMeasurementServer;
    /** Time the test lasted in seconds. */
    totalTime: number;
}

interface STResultServer {
    /** Server name. */
    sponsor: string;
    /** Server city. */
    city: string;
    /** Server country. */
    country: string;
    /** Server country code. */
    countryCode: string;
    /** Server distance. */
    distance: number;
}

export {
    STConfig,
    STTestConfig,
    STMeasurementServer,
    STLatencyJitter,
    STDownloadResult,
    STResult
};
