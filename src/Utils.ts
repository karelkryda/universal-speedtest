import configureMeasurements from "convert-units";
import allMeasures from "convert-units/lib/cjs/definitions";

/**
 * Function that converts degrees to radians
 * @param degrees - number of degrees
 * @returns number
 */
export function radians(degrees): number {
    return degrees * Math.PI / 180;
}

/**
 * Function to obtain the distance of the server
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
 * Function to calculate the average value
 * @param values - an array of values from which to average the value
 */
export function avg(values: number[]): number {
    return (values.reduce((a, b) => a + b) / values.length / 6);
}

/**
 * Function to calculate the jitter
 * @param values - an array of values from which to calculate jitter
 */
export function jitter(values: number[]): number {
    const jitters = [];

    for (let i = 0; i < values.length - 1; i++)
        jitters.push(Math.abs(values[i] - values[i + 1]));

    return avg(jitters);
}

/**
 * Calculate the overall xth percentile
 * @param tests - all completed tests
 * @param percentile - xth percentile
 */
export function getQuartile(tests, percentile): [] {
    tests.sort((a, b) => a - b);
    const pos = (tests.length - 1) * percentile;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (tests[base + 1] !== undefined)
        return tests[base] + rest * (tests[base + 1] - tests[base]);

    return tests[base];
}

/**
 * Function that returns a sorted object
 * @param obj - The object to be sorted
 * @returns object
 */
export function sortObject(obj): object {
    return Object.keys(obj).sort(function (a, b) {
        return Number(b) - Number(a)
    }).reverse().reduce((res, key) => (res[key] = obj[key], res), {});
}

/**
 * Function that returns the sum of all the elements in an array
 * @param arr - The array to be summed
 * @returns number
 */
export function sum(arr): number {
    return arr.reduce((a, b) => a + b, 0)
}

/**
 * Function to convert a unit to another unit.
 * @param actualUnit The unit returned by the speed test
 * @param newUnit The new unit to which you want to convert speed
 * @param speed Current network speed
 * @returns number - new speed
 */
export function convertUnits(actualUnit: string, newUnit: string, speed: number): number {
    const convert = configureMeasurements(allMeasures);
    return convert(speed).from(actualUnit.slice(0, -2)).to(newUnit.slice(0, -2));
}