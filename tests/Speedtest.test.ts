import { expect } from "chai";
import { UniversalSpeedTest } from "../src";

describe("Speedtest test", () => {
    it("Run Speedtest.com speed test", async () => {
        const test = new UniversalSpeedTest({
            wait: true
        });
        const result = await test.runSpeedtestTest();

        expect(result.ping).to.be.below(60);
        expect(result.uploadSpeed).to.be.undefined;
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(120000);
});
