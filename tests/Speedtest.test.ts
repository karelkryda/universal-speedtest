import { UniversalSpeedTest } from "../src/index.js";

describe("Speedtest test", () => {
    it("Run Speedtest.com speed test", async () => {
        const test = new UniversalSpeedTest({
            wait: true
        });
        const result = await test.runSpeedtestTest();

        expect(result.ping).toBeLessThan(60);
        expect(result.uploadSpeed).toBeUndefined();
        expect(result.downloadSpeed).toBeGreaterThan(20);
    }, 120000);
});
