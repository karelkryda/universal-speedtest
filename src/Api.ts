import puppeteer = require("puppeteer");
import os = require("os");
import { convertUnits } from "./Utils";

const AVAILABLE_UNITS = ["Bps", "KBps", "MBps", "GBps", "bps", "Kbps", "Mbps", "Gbps"];

/**
 * Check if parameters are valid
 * @param options 
 */
function check(options: FastAPIOptions) {
	if (
		typeof options.measureUpload !== "undefined" &&
		typeof options.measureUpload !== "boolean"
	)
		throw new TypeError("Option \"measureUpload\" must be a boolean.");

	if (
		typeof options.uploadUnit !== "undefined" &&
		(typeof options.uploadUnit !== "string" ||
			!/.+/.test(options.uploadUnit) ||
			!AVAILABLE_UNITS.includes(options.uploadUnit))
	)
		throw new TypeError("Option \"uploadUnit\" must be one of the values of \"FastAPI.UNITS\".");

	if (
		typeof options.downloadUnit !== "undefined" &&
		(typeof options.downloadUnit !== "string" ||
			!/.+/.test(options.downloadUnit) ||
			!AVAILABLE_UNITS.includes(options.downloadUnit))
	)
		throw new TypeError("Option \"downloadUnit\" must be one of the values of \"FastAPI.UNITS\".");

	if (
		typeof options.timeout !== "undefined" &&
		typeof options.timeout !== "number"
	)
		throw new TypeError("Option \"timeout\" must be a number.");
}

export class FastAPI {
	/** The options that were set. */
	public readonly options: FastAPIOptions;


	/**
	 * Initiates the FastAPI class.
	 * @param options
	 */
	constructor(options: FastAPIOptions) {
		if (options) check(options);

		this.options = {
			measureUpload: options.measureUpload || false,
			uploadUnit: AVAILABLE_UNITS.find((u) => u === options.uploadUnit) ?? "Mbps",
			downloadUnit: AVAILABLE_UNITS.find((u) => u === options.downloadUnit) ?? "Mbps",
			timeout: options.timeout || 30000,
		}
	}

	/**
	 * Function to run speed test.
	 * @returns Promise
	 */
	public runTest(): Promise<SpeedTestResult> {
		return new Promise(async (resolve, reject) => {
			try {
				const browser = await this.launchBrowser();
				const page = await browser.newPage();
				await page.goto("https://fast.com");
				await page.waitForSelector("#speed-value.succeeded", { timeout: this.options.timeout });
				if (this.options.measureUpload) await page.waitForSelector("#upload-value.succeeded", { timeout: this.options.timeout });

				const result = await page.evaluate(() => {
					const $ = document.querySelector.bind(document);

					return {
						ping: Number($("#latency-value").textContent),
						downloadSpeed: Number($("#speed-value").textContent),
						uploadSpeed: Number($("#upload-value").textContent),
						pingUnit: $("#latency-units").textContent.trim(),
						downloadUnit: $("#speed-units").textContent.trim(),
						uploadUnit: $("#upload-units").textContent.trim(),
					};
				});

				if (result.downloadUnit !== this.options.downloadUnit) {
					const newData = convertUnits(result.downloadUnit, this.options.downloadUnit, result.downloadSpeed);
					result.downloadSpeed = Number(newData[0]);
					result.downloadUnit = newData[1];
				}
				if (result.uploadUnit !== this.options.uploadUnit) {
					const newData = convertUnits(result.uploadUnit, this.options.uploadUnit, result.uploadSpeed);
					result.uploadSpeed = Number(newData[0]);
					result.uploadUnit = newData[1];
				}

				resolve(result);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Function to lauch Puppeteer browser.
	 * This function will pick correct ```executablePath``` for Linux
	 * @returns Puppeteer browser
	 */
	private async launchBrowser() {
		const osPlatform = os.platform(); // possible values are: 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'

		let executablePath: string;
		if (/^win/i.test(osPlatform))
			executablePath = "";
		else if (/^linux/i.test(osPlatform))
			executablePath = "/usr/bin/google-chrome";

		return await puppeteer.launch({ executablePath, args: ["--no-sandbox"] });
	}
}

export type UNITS =
	| "Bps"
	| "KBps"
	| "MBps"
	| "GBps"

	| "bps"
	| "Kbps"
	| "Mbps"
	| "Gbps";

export interface SpeedTestResult {
	/** Network ping. */
	ping: number,
	/** Network download speed. */
	downloadSpeed: number,
	/** Network upload speed. */
	uploadSpeed: number,
	/** Network ping unit. */
	pingUnit: string,
	/** Network download speed unit. */
	downloadUnit: string,
	/** Network upload speed unit. */
	uploadUnit: string,
}

export interface FastAPIOptions {
	/** To wait for the upload speed result. */
	measureUpload?: boolean;
	/** The resulting unit of upload speed. */
	uploadUnit?: string;
	/** The resulting unit of download speed. */
	downloadUnit?: string;
	/** Limit how long the speed test can run. */
	timeout?: number;
}