import { UniversalSpeedTest } from "../src/index.js";

describe("Speedtest test", () => {
    it("Run Speedtest.com speed test", async () => {
        const test = new UniversalSpeedTest();
        const result = await test.performTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult).toBeUndefined();
        expect(result.downloadResult.speed).toBeGreaterThan(20);
    }, 120000);
});
