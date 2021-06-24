import { convertUnits } from "./Utils";
import puppeteer = require("puppeteer");
import chromium = require("chromium");

/**
 * Check if parameters are valid
 * @param options 
 */
function check(options: FastAPIOptions) {
	if (!options) throw new TypeError("FastAPIOptions must not be empty.");

	if (
		typeof options.measureUpload !== "undefined" &&
		typeof options.measureUpload !== "boolean"
	)
		throw new TypeError("Option \"measureUpload\" must be a boolean.");

	if (
		typeof options.uploadUnit !== "undefined" &&
		(typeof options.uploadUnit !== "string" ||
			!/.+/.test(options.uploadUnit) ||
			!Object.values(SpeedUnits).includes(options.uploadUnit))
	)
		throw new TypeError("Option \"uploadUnit\" must be one of the values of \"FastAPI.SpeedUnits\".");

	if (
		typeof options.downloadUnit !== "undefined" &&
		(typeof options.downloadUnit !== "string" ||
			!/.+/.test(options.downloadUnit) ||
			!Object.values(SpeedUnits).includes(options.downloadUnit))
	)
		throw new TypeError("Option \"downloadUnit\" must be one of the values of \"FastAPI.SpeedUnits\".");

	if (
		typeof options.timeout !== "undefined" &&
		typeof options.timeout !== "number"
	)
		throw new TypeError("Option \"timeout\" must be a number.");

	if (
		typeof options.executablePath !== "undefined" &&
		(typeof options.executablePath !== "string" ||
			!/.+/.test(options.executablePath))
	)
		throw new TypeError("Option \"executablePath\" must be a non-empty string.");
}

export class FastAPI {
	/** The options that were set. */
	public readonly options: FastAPIOptions;


	/**
	 * Initiates the FastAPI class.
	 * @param options
	 */
	constructor(options: FastAPIOptions) {
		check(options);

		this.options = {
			measureUpload: false,
			uploadUnit: SpeedUnits.Mbps,
			downloadUnit: SpeedUnits.Mbps,
			timeout: 40000,
			executablePath: null,
			...options,
		};
	}

	/**
	 * Function to run speed test.
	 * @returns Promise
	 */
	public runTest(): Promise<SpeedTestResult> {
		return new Promise((resolve, reject) => {
			try {
				this.launchBrowser(this.options).then(async (browser) => {
					const page = await browser.newPage();
					await page.goto("https://fast.com");
					await page.waitForSelector("#speed-value.succeeded", { timeout: this.options.timeout });
					if (this.options.measureUpload) await page.waitForSelector("#upload-value.succeeded", { timeout: this.options.timeout });

					const result = await page.evaluate((measureUpload) => {
						const $ = document.querySelector.bind(document);

						if (measureUpload)
							return {
								ping: Number($("#latency-value").textContent),
								downloadSpeed: Number($("#speed-value").textContent),
								uploadSpeed: Number($("#upload-value").textContent),
								pingUnit: $("#latency-units").textContent.trim(),
								downloadUnit: $("#speed-units").textContent.trim(),
								uploadUnit: $("#upload-units").textContent.trim(),
								servers: $("#server-locations").textContent.trim().replace(/\s\s+/g, "").split("|")
							};
						else
							return {
								downloadSpeed: Number($("#speed-value").textContent),
								downloadUnit: $("#speed-units").textContent.trim(),
								servers: $("#server-locations").textContent.trim().replace(/\s\s+/g, "").split("|")
							};
					}, this.options.measureUpload);

					if (result.downloadSpeed && result.downloadUnit !== this.options.downloadUnit) {
						const newSpeed = convertUnits(result.downloadUnit, this.options.downloadUnit, result.downloadSpeed);
						result.downloadSpeed = newSpeed;
						result.downloadUnit = this.options.downloadUnit;
					}
					if (result.uploadSpeed && result.uploadUnit !== this.options.uploadUnit) {
						const newSpeed = convertUnits(result.uploadUnit, this.options.uploadUnit, result.uploadSpeed);
						result.uploadSpeed = newSpeed;
						result.uploadUnit = this.options.uploadUnit;
					}

					await browser.close();

					resolve(result);
				}).catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Function to lauch Puppeteer browser.
	 * This function will pick correct ```executablePath``` for Linux systems based on ARM processors
	 * @returns Puppeteer browser
	 */
	private async launchBrowser(options: FastAPIOptions): Promise<puppeteer.Browser> {
		try {
			//Launches Puppeteer browser for Windows and MacOS
			return puppeteer.launch({ executablePath: chromium.path, args: ["--no-sandbox"] });
		} catch (error) {
			try {
				//Launches the Puppeteer browser for Linux systems based on ARM processors
				return puppeteer.launch({ executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"] });
			} catch (error) {
				if (options.executablePath) {
					try {
						//Launches the Puppeteer browser using a user-specified path
						return puppeteer.launch({ executablePath: options.executablePath, args: ["--no-sandbox"] });
					} catch (error) {
						throw new Error("Unable to launch Puppeteer. See possible solutions to the problem at https://github.com/karelkryda/fast-api-speedtest/wiki/Troubleshooting.");
					}
				}
				else
					throw new Error("Unable to launch Puppeteer. See possible solutions to the problem at https://github.com/karelkryda/fast-api-speedtest/wiki/Troubleshooting.");
			}
		}
	}
}

export enum SpeedUnits {
	Bps = "Bps",
	KBps = "KBps",
	MBps = "MBps",
	GBps = "GBps",

	bps = "bps",
	Kbps = "Kbps",
	Mbps = "Mbps",
	Gbps = "Gbps",
}

export interface SpeedTestResult {
	/** Network ping. */
	ping?: number,
	/** Network download speed. */
	downloadSpeed: number,
	/** Network upload speed. */
	uploadSpeed?: number,
	/** Network ping unit. */
	pingUnit?: string,
	/** Network download speed unit. */
	downloadUnit: string,
	/** Network upload speed unit. */
	uploadUnit?: string,
	/** Location(s) of test server(s). */
	servers: string[]
}

export interface FastAPIOptions {
	/** To wait for the upload speed result. */
	measureUpload?: boolean;
	/** The resulting unit of upload speed. */
	uploadUnit?: SpeedUnits;
	/** The resulting unit of download speed. */
	downloadUnit?: SpeedUnits;
	/** Limit how long the speed test can run. */
	timeout?: number;
	/** Path to the Chrome startup file. You can use it if Puppeteer failed to start. */
	executablePath?: string;
}