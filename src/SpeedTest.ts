import { launchBrowser, convertUnits } from "./Utils";

/**
 * Check if parameters are valid
 * @param options 
 */
function check(options: SpeedTestOptions) {
	if (!options) throw new TypeError("SpeedTestOptions must not be empty.");

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
		throw new TypeError("Option \"uploadUnit\" must be one of the values of \"SpeedUnits\".");

	if (
		typeof options.downloadUnit !== "undefined" &&
		(typeof options.downloadUnit !== "string" ||
			!/.+/.test(options.downloadUnit) ||
			!Object.values(SpeedUnits).includes(options.downloadUnit))
	)
		throw new TypeError("Option \"downloadUnit\" must be one of the values of \"SpeedUnits\".");

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

export class UniversalSpeedTest {
	/** The options that were set. */
	public readonly options: SpeedTestOptions;


	/**
	 * Initiates the UniversalSpeedTest class.
	 * @param options
	 */
	constructor(options: SpeedTestOptions) {
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
	 * Function to run the test with the Fast.com speed test by Netflix.
	 * @returns Promise
	 */
	public runTestByFast(): Promise<SpeedTestResult> {
		return new Promise((resolve, reject) => {
			try {
				launchBrowser(this.options.executablePath).then(async (browser) => {
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
	 * Function to run the test with the Netmetr.cz speed test by cz.nic.
	 * 
	 * Not recommended for repeated tests over a short period of time.
	 * @returns Promise
	 */
	public runTestByNetmetr(): Promise<SpeedTestResult> {
		return new Promise((resolve, reject) => {
			try {
				launchBrowser(this.options.executablePath).then(async (browser) => {
					const page = await browser.newPage();
					await page.goto("https://www.netmetr.cz/en/test.html");
					await page.click(".start-test");
					await page.waitForSelector(".test-detail-table.detail-speed .download_kbit .classification", { timeout: this.options.timeout });
					await page.waitForSelector(".test-detail-table.detail-speed .upload_kbit .classification", { timeout: this.options.timeout });

					const result = await page.evaluate(() => {
						const $ = document.querySelector.bind(document);

						const ping = $(".ping_ms").textContent.split(" ");
						const upload = $(".upload_kbit").textContent.split(" ");
						const download = $(".download_kbit").textContent.split(" ");

						return {
							ping: Number(ping[0]),
							downloadSpeed: Number(download[0]),
							uploadSpeed: Number(upload[0]),
							pingUnit: ping[1].trim(),
							downloadUnit: download[1].trim(),
							uploadUnit: upload[1].trim()
						};
					});

					if (result.downloadSpeed && result.downloadUnit !== this.options.downloadUnit) {
						const newSpeed = convertUnits(SpeedUnitsConverter[result.downloadUnit], this.options.downloadUnit, result.downloadSpeed);
						result.downloadSpeed = newSpeed;
						result.downloadUnit = this.options.downloadUnit;
					}
					if (result.uploadSpeed && result.uploadUnit !== this.options.uploadUnit) {
						const newSpeed = convertUnits(SpeedUnitsConverter[result.uploadUnit], this.options.uploadUnit, result.uploadSpeed);
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
	 * Function to run the test with the Speedtest.net speed test by Ookla.
	 * @returns Promise
	 */
	public runTestBySpeedtest(): Promise<SpeedTestResult> {
		return new Promise((resolve, reject) => {
			try {
				launchBrowser(this.options.executablePath).then(async (browser) => {
					const page = await browser.newPage();
					await page.goto("https://www.speedtest.net/");
					await page.click(".js-start-test");
					await page.waitForFunction("document.getElementsByClassName('upload-speed')[0].innerHTML.trim() != '&nbsp;'", { timeout: this.options.timeout });

					const result = await page.evaluate(() => {
						const $ = document.querySelector.bind(document);

						return {
							ping: Number($(".ping-speed").textContent),
							downloadSpeed: Number($(".download-speed").textContent),
							uploadSpeed: Number($(".upload-speed").textContent),
							pingUnit: $(".result-item-ping .result-data-unit").textContent.trim(),
							downloadUnit: $(".result-item-download .result-data-unit").textContent.trim(),
							uploadUnit: $(".result-item-upload .result-data-unit").textContent.trim(),
						};
					});

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

enum SpeedUnitsConverter {
	"B/s" = "Bps",
	"KB/s" = "KBps",
	"MB/s" = "MBps",
	"GB/s" = "GBps",

	"b/s" = "bps",
	"Kb/s" = "Kbps",
	"Mb/s" = "Mbps",
	"Gb/s" = "Gbps",
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
	servers?: string[]
}

export interface SpeedTestOptions {
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