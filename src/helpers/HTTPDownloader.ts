import { HttpClientResponse } from "urllib/src/Response";

export class HTTPDownloader {
    private readonly request: Promise<HttpClientResponse>;

    /**
     * Constructor for HTTPDownloader class
     * @param request - Pre-created urllib request
     */
    constructor(request: Promise<HttpClientResponse>) {
        this.request = request;
    }

    /**
     * Runs pre-created urllib request.
     * @returns Promise
     */
    public async run(): Promise<number[]> {
        const results = [];

        try {
            const { data } = await this.request;

            let i = 0;
            while (i < data.length) {
                results.push(data.slice(i, i + 10240).length);
                i += 10240;
            }
        } catch {
            results.push(0);
        }

        return results;
    }
}
