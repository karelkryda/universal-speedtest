import { convert } from "convert";
/**
 * Returns the sum of all the elements in an array.
 * @param values - The array to be summed
 * @returns {number} Sum of all values in array
 */
function sum(values) {
    return values.reduce((accumulator, value) => accumulator + value, 0);
}
/**
 * Returns average value from given values.
 * @param {number[]} values - Values to calculate average from
 * @param {number} decimalPoints - Maximum number of decimal points
 * @private
 * @returns {number} The average value
 */
export function average(values, decimalPoints) {
    const valuesSum = sum(values);
    const averageValue = valuesSum / values.length;
    return Number(averageValue.toFixed(decimalPoints));
}
/**
 * Converts miles to kilometers.
 * @param distance Current distance in miles
 * @returns {number} Distance in kilometers
 */
export function convertMilesToKilometers(distance) {
    try {
        return Number(convert(distance, "mi").to("km").toFixed(2));
    }
    catch {
        throw new Error("There was an error in converting the units. Did you enter the correct input units?");
    }
}
/**
 * Converts speed to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns {number} Speed in requested unit
 */
export function convertSpeedUnit(actualUnit, newUnit, speed) {
    try {
        const actualUnitData = actualUnit.slice(0, -2);
        const newUnitData = newUnit.slice(0, -2);
        return convert(speed, actualUnitData).to(newUnitData);
    }
    catch {
        throw new Error("There was an error in converting the units. Did you enter the correct input units?");
    }
}
