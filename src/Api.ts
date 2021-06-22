import PCR = require("puppeteer-chromium-resolver");
import { convertUnits } from "./Utils";

const AVAILABLE_UNITS = ["Bps", "KBps", "MBps", "GBps", "bps", "Kbps", "Mbps", "Gbps"];
const option = {
	revision: "",
	detectionPath: "",
	folderName: ".chromium-browser-snapshots",
	defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
	hosts: [],
	cacheRevisions: 2,
	retry: 3,
	silent: false
};

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
		check(options);

		this.options = {
			measureUpload: false,
			uploadUnit: "Mbps",
			downloadUnit: "Mbps",
			timeout: 40000,
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
				PCR(option).then(async (stats) => {
					const browser = await stats.puppeteer.launch({ executablePath: stats.executablePath, args: ["--no-sandbox"] });
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
						const newSpeed = convertUnits(result.downloadUnit, this.options.downloadUnit, result.downloadSpeed);
						result.downloadSpeed = newSpeed;
						result.downloadUnit = this.options.downloadUnit;
					}
					if (result.uploadUnit !== this.options.uploadUnit) {
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