import { convertMilesToKilometers, convertSpeedUnit } from "../src/utils/index.js";
import { SpeedUnits } from "../src/interfaces/index.js";

describe("convertSpeedUnit test", () => {
    it("Run convertSpeedUnit test #1", () => {
        const speedInKbps = convertSpeedUnit(SpeedUnits.Mbps, SpeedUnits.Kbps, 10);

        expect(speedInKbps).toEqual(10_000);
    }, 2000);

    it("Run convertSpeedUnit test #2", () => {
        const speedInKbps = convertSpeedUnit(SpeedUnits.MBps, SpeedUnits.Kbps, 1);

        expect(speedInKbps).toEqual(8_000);
    }, 2000);

    it("Run convertSpeedUnit test #3", () => {
        const speedInMBps = convertSpeedUnit(SpeedUnits.Mbps, SpeedUnits.MBps, 1);

        expect(speedInMBps).toEqual(0.125000);
    }, 2000);
});

describe("convertMilesToKilometers test", () => {
    it("Run convertMilesToKilometers test", () => {
        const distanceInKilometers = convertMilesToKilometers(10);

        expect(distanceInKilometers).toEqual(16.09);
    }, 2000);
});
