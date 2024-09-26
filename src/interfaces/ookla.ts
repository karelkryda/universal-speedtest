export interface OoklaOptions {
    /** Perform Ookla test against multiple servers. */
    multiTest?: true;
    /** Number of Ookla test servers to fetch. */
    serversToFetch?: number;
}

/**
 * Test config interfaces.
 */
// TODO: cleanup
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

/**
 * Test interfaces.
 */
interface STMeasurementServer {
    id: number;
    host: string;
    name: string;
    lat: number;
    lon: number;
    distance: number;
    country: string;
    cc: string;
    sponsor: string;
    latency: number;
    jitter: number;
    activeConnections: number;
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
    totalTime: number;
}

interface STUploadResult {
    transferredBytes: number;
    latency: number;
    jitter: number;
    speed: number;
    totalTime: number;
}

interface STResult {
    /** Client information. */
    client: STConfigClient;
    /** Network ping measurement result. */
    pingResult: STLatencyJitter;
    /** Network download measurement result. */
    downloadResult?: STDownloadResult;
    /** Network upload measurement result. */
    uploadResult?: STUploadResult;
    /** Servers information. */
    servers: STMeasurementServer[];
    /** The best server information. */
    bestServer: STMeasurementServer;
    /** Time the test lasted in seconds. */
    totalTime: number;
}

export {
    STConfig,
    STMeasurementServer,
    STLatencyJitter,
    STDownloadResult,
    STUploadResult,
    STResult
};
