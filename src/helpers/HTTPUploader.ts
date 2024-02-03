import { sum } from "../utils/index.js";
import { HttpClientResponse } from "urllib";

export class HTTPUploader {
    private readonly request: Promise<HttpClientResponse>;
    private readonly total: number[];

    /**
     * Constructor for HTTPUploader class
     * @param request - Pre-created urllib request
     * @param total - Array with total sizes of uploaded data
     */
    constructor(request: Promise<HttpClientResponse>, total: number[]) {
        this.request = request;
        this.total = total;
    }

    /**
     * Runs pre-created urllib request.
     * @returns Promise
     */
    public async run(): Promise<number> {
        try {
            await this.request;
            return sum(this.total);
        } catch {
            return 0;
        }
    }
}
