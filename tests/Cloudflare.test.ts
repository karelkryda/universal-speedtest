import { expect } from "chai";
import { UniversalSpeedtest } from "../src";

describe("Cloudflare test", () => {
    it("Run speed.cloudflare.com speed test", async () => {
        const test = new UniversalSpeedtest({
            measureUpload: true
        });
        const result = await test.runCloudflareCom();

        expect(result.ping).to.be.below(60);
        expect(result.uploadSpeed).not.to.be.undefined;
        expect(result.downloadSpeed).to.be.above(20);
    }).timeout(120000);
});