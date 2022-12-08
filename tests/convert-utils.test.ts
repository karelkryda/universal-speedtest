import { expect } from "chai";
import { convertUnits, SpeedUnits } from "../src";

describe("convertUnits test", () => {
    it("Run convertUnits test #1", async () => {
        const speedInBps = convertUnits(SpeedUnits.Mbps, SpeedUnits.Kbps, 10);

        expect(speedInBps).to.be.equal(10_000);
    }).timeout(2000);

    it("Run convertUnits test #2", async () => {
        const speedInBps = convertUnits(SpeedUnits.MBps, SpeedUnits.Kbps, 1);

        expect(speedInBps).to.be.equal(8_000);
    }).timeout(2000);

    it("Run convertUnits test #3", async () => {
        const speedInBps = convertUnits(SpeedUnits.Mbps, SpeedUnits.MBps, 1);

        expect(speedInBps).to.be.equal(0.125000);
    }).timeout(2000);
});
