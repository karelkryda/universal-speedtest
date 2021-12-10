import {sum} from "../Utils";

export class HTTPUploader {
    private readonly request;
    private readonly total;

    /**
     * Constructor for HTTPUploader class
     * @param request - Pre-created urllib request
     * @param total - Array with total sizes of uploaded data
     */
    constructor(request, total) {
        this.request = request;
        this.total = total;
    }

    /**
     * Run pre-created urllib request
     * @returns Promise
     */
    public async run(): Promise<number> {
        await this.request;
        return sum(this.total);
    }
}