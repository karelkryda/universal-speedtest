import { expect } from "chai";
import { FastAPI } from "../src/index";

describe("Puppeteer tests", () => {
    it("Run speed test without measureUpload", async () => {
        const FastTest = new FastAPI({
            measureUpload: false,
            timeout: 60000
        });

        const result = await FastTest.runTest();

        expect(result.pingUnit).to.be.undefined;
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(60000);

    it("Run speed test with measureUpload", async () => {
        const FastTest = new FastAPI({
            measureUpload: true,
            timeout: 90000
        });

        const result = await FastTest.runTest();

        expect(result.pingUnit).to.equal("ms");
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(90000);
});