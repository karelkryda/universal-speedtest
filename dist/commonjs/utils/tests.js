"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.average = average;
exports.calculateIqm = calculateIqm;
exports.convertMilesToKilometers = convertMilesToKilometers;
exports.convertSpeedUnit = convertSpeedUnit;
const convert_1 = require("convert");
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
 * @param {number|undefined} decimalPoints - Maximum number of decimal points
 * @private
 * @returns {number} The average value
 */
function average(values, decimalPoints) {
    const valuesSum = sum(values);
    const averageValue = valuesSum / values.length;
    if (decimalPoints) {
        return Number(averageValue.toFixed(decimalPoints));
    }
    return averageValue;
}
/**
 * Returns IQM from given values.
 * @param {number[]} values - Values to calculate IQM from
 * @param {number|number} decimalPoints - Maximum number of decimal points
 * @private
 * @returns {number} The IQM value
 */
function calculateIqm(values, decimalPoints) {
    const sortedValues = values.sort((a, b) => a - b);
    const lowerQuartileIndex = Math.floor(sortedValues.length * 0.25);
    const upperQuartileIndex = Math.ceil(sortedValues.length * 0.75);
    const valuesIqm = sortedValues.slice(lowerQuartileIndex, upperQuartileIndex);
    const iqm = average(valuesIqm);
    if (decimalPoints) {
        return Number(iqm.toFixed(decimalPoints));
    }
    return iqm;
}
/**
 * Converts miles to kilometers.
 * @param distance Current distance in miles
 * @returns {number} Distance in kilometers
 */
function convertMilesToKilometers(distance) {
    try {
        return Number((0, convert_1.convert)(distance, "mi").to("km").toFixed(2));
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
function convertSpeedUnit(actualUnit, newUnit, speed) {
    try {
        const actualUnitData = actualUnit.slice(0, -2);
        const newUnitData = newUnit.slice(0, -2);
        return (0, convert_1.convert)(speed, actualUnitData).to(newUnitData);
    }
    catch {
        throw new Error("There was an error in converting the units. Did you enter the correct input units?");
    }
}
