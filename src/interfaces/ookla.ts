// Ookla configuration interfaces
export interface OoklaOptions {
    /** Number of Ookla test servers to fetch. */
    serversToFetch?: number;
    /** Perform Ookla test against single or multiple servers. */
    connections?: "single" | "multi";
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
    ispdlavg: number;
    ispulavg: number;
    country: string;
}

export interface OAServer {
    id: number;
    host: string;
    name: string;
    lat: number;
    lon: number;
    distance: number;
    country: string;
    cc: string;
    sponsor: string;
}

export interface OAMeasurementServer extends OAServer {
    latency: number;
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
    servers: OAMeasurementServer[];
    totalTime: number;
}

export interface OAUploadResult {
    transferredBytes: number;
    latency: number;
    jitter: number;
    speed: number;
    servers: OAMeasurementServer[];
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
