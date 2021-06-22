import configureMeasurements from "convert-units";
import allMeasures from "convert-units/lib/cjs/definitions";

/**
 * Function to convert a unit to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns ```number``` new speed
 */
export function convertUnits(actualUnit: string, newUnit: string, speed: number): number {
    const convert = configureMeasurements(allMeasures);
    const newSpeed = convert(speed).from(actualUnit.slice(0, -2)).to(newUnit.slice(0, -2));
    return newSpeed;
}