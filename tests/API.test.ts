import { expect } from "chai";
import { FastAPI } from "../src/index";

describe("Puppeteer tests", () => {
    it("Run speed test", async () => {
        const FastTest = new FastAPI({
            measureUpload: false,
            timeout: 60000
        });

        const result = await FastTest.runTest();
        expect(result.pingUnit).to.equal("ms");
    }).timeout(60000);
});