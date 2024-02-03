import { convert, Data } from "convert";
import { SpeedUnits } from "../interfaces/index.js";

/**
 * Converts degrees to radians.
 * @param degrees - number of degrees
 * @returns number
 */
export function radians(degrees: number): number {
    return degrees * Math.PI / 180;
}

/**
 * Obtains the distance of the server.
 * @param clientLat - client latitude
 * @param clientLon - client longitude
 * @param serverLat - server latitude
 * @param serverLon - server longitude
 * @private
 * @returns number
 */
export function getDistance(clientLat: number, clientLon: number, serverLat: number, serverLon: number): number {
    const radius = 6371;

    const dLat = radians(serverLat - clientLat);
    const dLon = radians(serverLon - clientLon);

    const a = (Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radians(clientLat)) *
        Math.cos(radians(serverLat)) * Math.sin(dLon / 2) *
        Math.sin(dLon / 2));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return radius * c;
}

/**
 * Calculates the average value.
 * @param values - an array of values from which to average the value
 */
export function avg(values: number[]): number {
    return (values.reduce((a, b) => a + b) / values.length / 6);
}

/**
 * Calculates the jitter.
 * @param values - an array of values from which to calculate jitter
 */
export function jitter(values: number[]): number {
    const jitters = [];

    for (let i = 0; i < values.length - 1; i++)
        jitters.push(Math.abs(values[i] - values[i + 1]));

    return avg(jitters);
}

/**
 * Calculates the overall xth percentile.
 * @param tests - all completed tests
 * @param percentile - xth percentile
 */
export function getQuartile(tests: number[], percentile: number): number {
    tests.sort((a, b) => a - b);
    const pos = (tests.length - 1) * percentile;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (tests[base + 1] !== undefined)
        return tests[base] + rest * (tests[base + 1] - tests[base]);

    return tests[base];
}

/**
 * Returns the sum of all the elements in an array.
 * @param arr - The array to be summed
 * @returns number
 */
export function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Converts a unit to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns number - new speed
 */
export function convertUnits(actualUnit: SpeedUnits, newUnit: SpeedUnits, speed: number): number {
    try {
        const actualUnitData: Data = actualUnit.slice(0, -2) as Data;
        const newUnitData: Data = newUnit.slice(0, -2) as Data;

        return convert(speed, actualUnitData).to(newUnitData);
    } catch {
        throw new Error("There was an error in converting the units. Did you enter the correct input units?");
    }
}
