export class HTTPDownloader {
    private request;

    /**
     * Constructor for HTTPDownloader class
     * @param request - Pre-created urllib request
     */
    constructor(request) {
        this.request = request;
    }

    /**
     * Run pre-created urllib request
     * @returns Promise
     */
    public async run(): Promise<number[]> {
        const results = [];

        await this.request.then(async (result) => {
            let i = 0;
            while (i < result.data.length) {
                results.push(result.data.slice(i, i + 10240).length);
                i += 10240;
            }
        }).catch(() => {
            results.push(0);
        });

        return results;
    }
}
