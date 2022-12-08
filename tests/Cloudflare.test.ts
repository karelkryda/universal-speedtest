import { expect } from "chai";
import { UniversalSpeedTest } from "../src";

describe("Cloudflare test", () => {
    it("Run speed.cloudflare.com speed test", async () => {
        const test = new UniversalSpeedTest({
            measureUpload: true
        });
        const result = await test.runCloudflareTest();

        expect(result.ping).to.be.below(60);
        expect(result.uploadSpeed).not.to.be.undefined;
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(120000);
});
