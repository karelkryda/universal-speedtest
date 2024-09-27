// Ookla configuration interfaces
export interface OoklaOptions {
    /** Perform Ookla test against multiple servers. */
    multiTest?: true;
    /** Number of Ookla test servers to fetch. */
    serversToFetch?: number;
    /** Technology used to perform the test. */
    technology?: "http";
}

// Ookla test interfaces
export interface OAConfig {
    client: OAConfigClient;
}

interface OAConfigClient {
    ip: string;
    lat: number;
    lon: number;
    isp: string;
    isprating: number;
    rating: number;
    ispdlavg: number;
    ispulavg: number;
    country: string;
}

export interface OAMeasurementServer {
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

export interface OAPingResult {
    latency: number;
    jitter: number;
}

export interface OADownloadResult {
    transferredBytes: number;
    latency: number;
    jitter: number;
    speed: number;
    totalTime: number;
}

export interface OAUploadResult {
    transferredBytes: number;
    latency: number;
    jitter: number;
    speed: number;
    totalTime: number;
}

export interface OAResult {
    /** Client information. */
    client: OAConfigClient;
    /** Network ping measurement result. */
    pingResult: OAPingResult;
    /** Network download measurement result. */
    downloadResult?: OADownloadResult;
    /** Network upload measurement result. */
    uploadResult?: OAUploadResult;
    /** Servers information. */
    servers: OAMeasurementServer[];
    /** The best server information. */
    bestServer: OAMeasurementServer;
    /** Time the test lasted in seconds. */
    totalTime: number;
}
