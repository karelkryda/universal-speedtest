import { SpeedUnits } from "../interfaces/index.js";
/**
 * Returns average value from given values.
 * @param {number[]} values - Values to calculate average from
 * @param {number|undefined} decimalPoints - Maximum number of decimal points
 * @private
 * @returns {number} The average value
 */
export declare function average(values: number[], decimalPoints?: number): number;
/**
 * Returns IQM from given values.
 * @param {number[]} values - Values to calculate IQM from
 * @param {number|number} decimalPoints - Maximum number of decimal points
 * @private
 * @returns {number} The IQM value
 */
export declare function calculateIqm(values: number[], decimalPoints?: number): number;
/**
 * Converts miles to kilometers.
 * @param distance Current distance in miles
 * @returns {number} Distance in kilometers
 */
export declare function convertMilesToKilometers(distance: number): number;
/**
 * Converts speed to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns {number} Speed in requested unit
 */
export declare function convertSpeedUnit(actualUnit: SpeedUnits, newUnit: SpeedUnits, speed: number): number;
