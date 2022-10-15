import { performance } from "perf_hooks";
import { IncomingHttpHeaders } from "http";
import { request } from "urllib";
import { RequestOptions } from "urllib/src/Request";
import { HttpClientResponse } from "urllib/src/Response";
import { parseString } from "xml2js";
import { XMLValidator } from "fast-xml-parser";

/**
 * Function to create an urllib request for speedtest.net
 * @param url - URL address
 * @param headers - IncomingHttpHeaders
 * @param secure - Use https
 * @param data - data to be sent
 * @param bump - identifier
 * @param timeout - request timeout
 * @param withBump - add bump to request url (for speedtest.net)
 * @param urllibOptions - custom request options
 * @returns Promise
 */
export function createRequest(url: string, headers: IncomingHttpHeaders, secure = true, data = {}, bump = "0", timeout = 10, withBump = false, urllibOptions: RequestOptions = {}): Promise<HttpClientResponse> {
    headers["user-agent"] = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/2.0.5";
    headers["cache-control"] = "no-cache";

    return request(((url[0] == ":") ? (secure) ? "https" : "http" : "") + url + ((withBump) ? (((url.includes("?")) ? "&" : "?") + "x=" + performance.now() + bump) : ""), {
        method: (typeof data !== "object") ? "POST" : "GET",
        timeout: timeout * 1000,
        ...urllibOptions,
        headers: {
            ...headers,
            ...urllibOptions.headers,
        },
        data,
    }).catch(() => {
        return null;
    });
}

/**
 * Function to parse XML sting to JSON object
 * @param xml - XML string to be parsed
 * @param callback - callback to which the JSON object will be returned
 */
export function parseXML(xml: string, callback): void {
    if (XMLValidator.validate(xml) === true)
        parseString(xml, (error, result) => {
            return callback(result);
        });
    else
        throw new Error("Error parsing xml");
}
