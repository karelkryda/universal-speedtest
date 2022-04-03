import {SpeedUnits} from "./index";
import {Speedtest, SpeedtestResult} from "./Speedtest";
import {Cloudflare, CloudflareResult} from "./Cloudflare";

/**
 * Check if parameters are valid
 * @param options
 */
function check(options: UniversalSpeedTestOptions) {
    if (!options) return;

    /** Check debug option. */
    if (
        typeof options.debug !== "undefined" &&
        typeof options.debug !== "boolean"
    )
        throw new TypeError("Option \"debug\" must be a boolean.");

    /** Check secure option. */
    if (
        typeof options.secure !== "undefined" &&
        typeof options.secure !== "boolean"
    )
        throw new TypeError("Option \"secure\" must be a boolean.");

    /** Check timeout option. */
    if (
        typeof options.timeout !== "undefined" &&
        typeof options.timeout !== "number"
    )
        throw new TypeError("Option \"timeout\" must be a number.");

    /** Check measureDownload option. */
    if (
        typeof options.measureDownload !== "undefined" &&
        typeof options.measureDownload !== "boolean"
    )
        throw new TypeError("Option \"measureDownload\" must be a boolean.");

    /** Check measureUpload option. */
    if (
        typeof options.measureUpload !== "undefined" &&
        typeof options.measureUpload !== "boolean"
    )
        throw new TypeError("Option \"measureUpload\" must be a boolean.");

    /** Check wait option. */
    if (
        typeof options.wait !== "undefined" &&
        typeof options.wait !== "boolean"
    )
        throw new TypeError("Option \"wait\" must be a boolean.");

    /** Check downloadUnit option. */
    if (
        typeof options.downloadUnit !== "undefined" &&
        (typeof options.downloadUnit !== "string" ||
            !/.+/.test(options.downloadUnit) ||
            !Object.values(SpeedUnits).includes(options.downloadUnit))
    )
        throw new TypeError("Option \"downloadUnit\" must be one of the values of \"SpeedUnits\".");

    /** Check uploadUnit option. */
    if (
        typeof options.uploadUnit !== "undefined" &&
        (typeof options.uploadUnit !== "string" ||
            !/.+/.test(options.uploadUnit) ||
            !Object.values(SpeedUnits).includes(options.uploadUnit))
    )
        throw new TypeError("Option \"uploadUnit\" must be one of the values of \"SpeedUnits\".");

    const isEmpty = a => a.toString().replace(/,/g, "") === "";
    /** Check downloadPayload option. */
    if (
        typeof options.downloadPayload !== "undefined" &&
        (typeof options.downloadPayload !== "object" ||
            isEmpty(options.downloadPayload))
    )
        throw new TypeError("Option \"downloadPayload\" must be a non-empty array.");

    /** Check uploadPayload option. */
    if (
        typeof options.uploadPayload !== "undefined" &&
        (typeof options.uploadPayload !== "object" ||
            isEmpty(options.uploadPayload))
    )
        throw new TypeError("Option \"uploadPayload\" must be a non-empty array.");
}

export class UniversalSpeedtest {
    /**
     * Optional parameters
     * @type UniversalSpeedTestOptions
     */
    private readonly options: UniversalSpeedTestOptions;

    /**
     * Constructor for UniversalSpeedtest class
     * @param options - Optional parameters
     */
    constructor(options?: UniversalSpeedTestOptions) {
        check(options);

        this.options = {
            debug: false,
            secure: true,
            timeout: 60,
            measureDownload: true,
            measureUpload: false,
            wait: true,
            APIToken: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm",
            urlCount: 5,
            downloadUnit: SpeedUnits.Mbps,
            uploadUnit: SpeedUnits.Mbps,
            ...options,
        };
    }

    /**
     * Function that performs measurements using speedtest.net
     * @returns Promise
     */
    public runSpeedtestNet(): Promise<SpeedtestResult> {
        const speedTest = new Speedtest({...this.options});
        return speedTest.run();
    }

    /**
     * Function that performs measurements using fast.com
     * @returns Promise
     */

    /*public runFastCom(): Promise<FastResult> {
        const speedTest = new Fast({...this.options});
        return speedTest.run();
    }*/

    /**
     * Function that performs measurements using speed.cloudflare.com
     * @returns Promise
     */
    public runCloudflareCom(): Promise<CloudflareResult> {
        const speedTest = new Cloudflare({...this.options});
        return speedTest.run();
    }
}


interface UniversalSpeedTestOptions {
    /** Display debug messages. */
    debug?: boolean,
    /** Use https. */
    secure?: boolean,
    /** Single request timeout (in seconds). */
    timeout?: number,
    /** Measure the download speed. */
    measureDownload?: boolean,
    /** Measure the upload speed. */
    measureUpload?: boolean,
    /** Complete test without skipping (if timeout reached). */
    wait?: boolean,
    /** API token for performing the test (if left blank, the default from the Fast.com .js file will be used). */
    APIToken?: string,
    /** The number of URL addresses, ie the number of tests performed. */
    urlCount?: number,
    /** The resulting unit of download speed. */
    downloadUnit?: SpeedUnits,
    /** The resulting unit of upload speed. */
    uploadUnit?: SpeedUnits
    /** Payload used by Cloudflare test (download). */
    downloadPayload?: number[][]
    /** Payload used by Cloudflare test (upload). */
    uploadPayload?: number[][]
}
