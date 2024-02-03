import { convertUnits, SpeedUnits } from "../src/index.js";

describe("convertUnits test", () => {
    it("Run convertUnits test #1", async () => {
        const speedInBps = convertUnits(SpeedUnits.Mbps, SpeedUnits.Kbps, 10);

        expect(speedInBps).toEqual(10_000);
    }, 2000);

    it("Run convertUnits test #2", async () => {
        const speedInBps = convertUnits(SpeedUnits.MBps, SpeedUnits.Kbps, 1);

        expect(speedInBps).toEqual(8_000);
    }, 2000);

    it("Run convertUnits test #3", async () => {
        const speedInBps = convertUnits(SpeedUnits.Mbps, SpeedUnits.MBps, 1);

        expect(speedInBps).toEqual(0.125000);
    }, 2000);
});
