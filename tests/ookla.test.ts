import { UniversalSpeedTest } from "../src/index.js";

describe("Ookla test", () => {
    it("Run Ookla speed test without measuring", async () => {
        const test = new UniversalSpeedTest({
            tests: {
                measureDownload: false,
                measureUpload: false
            }
        });
        const result = await test.performOoklaTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult).toBeUndefined();
        expect(result.downloadResult).toBeUndefined();
    }, 10_000);

    it("Run Ookla speed test with download only", async () => {
        const test = new UniversalSpeedTest();
        const result = await test.performOoklaTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult).toBeUndefined();
        expect(result.downloadResult.speed).toBeGreaterThan(20);
    }, 30_000);

    it("Run full Ookla speed test", async () => {
        const test = new UniversalSpeedTest({
            tests: {
                measureDownload: true,
                measureUpload: true
            }
        });
        const result = await test.performOoklaTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult.transferredBytes).toBeGreaterThan(2_000);
        expect(result.uploadResult.speed).toBeGreaterThan(4);
        expect(result.downloadResult.speed).toBeGreaterThan(20);
    }, 60_000);
});
