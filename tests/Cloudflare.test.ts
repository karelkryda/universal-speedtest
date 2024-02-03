import { UniversalSpeedTest } from "../src/index.js";

describe("Cloudflare test", () => {
    it("Run speed.cloudflare.com speed test", async () => {
        const test = new UniversalSpeedTest({
            measureUpload: true
        });
        const result = await test.runCloudflareTest();

        expect(result.ping).toBeLessThan(60);
        expect(result.uploadSpeed).toBeGreaterThan(6);
        expect(result.downloadSpeed).toBeGreaterThan(20);
    }, 120000);
});
