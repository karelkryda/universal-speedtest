import { expect } from "chai";
import { UniversalSpeedTest } from "../src/index";

describe("Puppeteer tests", () => {
    it("Run Fast.com speed test without measureUpload", async () => {
        const test = new UniversalSpeedTest({
            measureUpload: false,
            timeout: 60000
        });

        const result = await test.runTestByFast();

        expect(result.pingUnit).to.be.undefined;
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(60000);

    it("Run Fast.com speed test with measureUpload", async () => {
        const test = new UniversalSpeedTest({
            measureUpload: true,
            timeout: 90000
        });

        const result = await test.runTestByFast();

        expect(result.pingUnit).to.equal("ms");
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(90000);

    it("Run Speedtest.net speed test", async () => {
        const test = new UniversalSpeedTest({
            measureUpload: true,
            timeout: 90000
        });

        const result = await test.runTestBySpeedtest();

        expect(result.pingUnit).to.equal("ms");
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(90000);
});