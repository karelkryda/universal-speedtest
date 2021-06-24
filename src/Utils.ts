import puppeteer = require("puppeteer");
import chromium = require("chromium");
import configureMeasurements from "convert-units";
import allMeasures from "convert-units/lib/cjs/definitions";

/**
 * Function to lauch Puppeteer browser.
 * 
 * This function will pick correct ```executablePath``` for Linux systems based on ARM processors
 * @param executablePath Path to the Chrome startup file
 * @returns ```Puppeteer browser```
 */
export async function launchBrowser(executablePath: string): Promise<puppeteer.Browser> {
    try {
        //Launches Puppeteer browser for Windows and MacOS
        return await puppeteer.launch({ executablePath: chromium.path, args: ["--no-sandbox"] });
    } catch (error) {
        try {
            //Launches the Puppeteer browser for Linux systems based on ARM processors
            return await puppeteer.launch({ executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"] });
        } catch (error) {
            if (executablePath) {
                try {
                    //Launches the Puppeteer browser using a user-specified path
                    return await puppeteer.launch({ executablePath, args: ["--no-sandbox"] });
                } catch (error) {
                    throw new Error("Unable to launch Puppeteer. See possible solutions to the problem at https://github.com/karelkryda/universal-speedtest/wiki/Troubleshooting.");
                }
            }
            else
                throw new Error("Unable to launch Puppeteer. See possible solutions to the problem at https://github.com/karelkryda/universal-speedtest/wiki/Troubleshooting.");
        }
    }
}

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