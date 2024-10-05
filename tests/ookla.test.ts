import { UniversalSpeedTest } from "../src/index.js";

describe("Ookla list test", () => {
    it("Run Ookla list test #1", async () => {
        const test = new UniversalSpeedTest();
        const servers = await test.listOoklaServers(14);

        expect(servers.length).toEqual(14);
        expect(typeof servers.at(5).id).toBe("number");
    }, 4_000);

    it("Run Ookla list test #2", async () => {
        const test = new UniversalSpeedTest();
        const servers = await test.listOoklaServers();

        expect(servers.length).toBeGreaterThan(15);
        expect(typeof servers.at(15).id).toBe("number");
    }, 4_000);
});

describe("Ookla search test", () => {
    it("Run Ookla search test #1", async () => {
        const test = new UniversalSpeedTest();
        const servers = await test.searchOoklaServers("czechia", 14);

        expect(servers.length).toEqual(14);
        expect(typeof servers.at(5).id).toBe("number");
    }, 4_000);

    it("Run Ookla search test #2", async () => {
        const test = new UniversalSpeedTest();
        const servers = await test.searchOoklaServers("czechia");

        expect(servers.length).toBeGreaterThan(40);
        expect(typeof servers.at(28).id).toBe("number");
    }, 4_000);
});

describe("Ookla measurement test", () => {
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

    it("Run Ookla speed test with download only (single-connection)", async () => {
        const test = new UniversalSpeedTest({
            ooklaOptions: {
                connections: "single"
            }
        });
        const result = await test.performOoklaTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult).toBeUndefined();
        expect(result.downloadResult.speed).toBeGreaterThan(20);
        expect(result.downloadResult.servers.length).toEqual(1);
    }, 30_000);

    it("Run Ookla speed test with download only (multi-connection)", async () => {
        const test = new UniversalSpeedTest();
        const result = await test.performOoklaTest();

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult).toBeUndefined();
        expect(result.downloadResult.speed).toBeGreaterThan(20);
        expect(result.downloadResult.servers.length).toEqual(4);
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
        expect(result.uploadResult.servers.length).toEqual(1);
        expect(result.downloadResult.speed).toBeGreaterThan(20);
        expect(result.downloadResult.servers.length).toEqual(4);
    }, 60_000);

    it("Run full Ookla speed test with specified server", async () => {
        const test = new UniversalSpeedTest({
            tests: {
                measureDownload: true,
                measureUpload: true
            }
        });
        const servers = await test.searchOoklaServers("czechia");
        const testServer = servers.at(0);
        const result = await test.performOoklaTest(testServer);

        expect(result.pingResult.latency).toBeLessThan(60);
        expect(result.uploadResult.transferredBytes).toBeGreaterThan(2_000);
        expect(result.uploadResult.speed).toBeGreaterThan(4);
        expect(result.uploadResult.servers.length).toEqual(1);
        expect(result.uploadResult.servers.at(0).id).toEqual(testServer.id);
        expect(result.downloadResult.speed).toBeGreaterThan(20);
        expect(result.downloadResult.servers.length).toEqual(1);
        expect(result.downloadResult.servers.at(0).id).toEqual(testServer.id);
        expect(result.servers.length).toEqual(1);
        expect(result.servers.at(0).id).toEqual(testServer.id);
        expect(result.bestServer.id).toEqual(testServer.id);
    }, 60_000);
});
