const convert = require('@samuelpoulin/convert-units')

/**
 * Function to convert a unit to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns ```Array[newSpeed, newUnit]```
 */
export async function convertUnits(actualUnit: string, newUnit: string, speed: Number) {
    const newSpeed = convert(speed).from(actualUnit.slice(0, -2)).to(newUnit.slice(0, -2));
    return [newSpeed, newUnit];
}