import { IncomingHttpHeaders } from "http";
import { request } from "urllib";
import { RequestOptions } from "urllib/src/Request";
import { HttpClientResponse } from "urllib/src/Response";
import { XMLValidator } from "fast-xml-parser";
import { parseString } from "xml2js";

/**
 * Creates an urllib request for speedtest.net
 * @param url - URL address
 * @param headers - optional request headers
 * @param body - data to be sent
 * @param cacheBump - cache override bump
 * @param timeout - request timeout
 * @param options - custom request options
 */
export function createRequest(url: string, headers: IncomingHttpHeaders, body: string, cacheBump: string = null, timeout = 10, options: RequestOptions): Promise<HttpClientResponse> {
    headers["user-agent"] = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/3.0.0";
    headers["cache-control"] = "no-cache";

    return request(url + ((cacheBump !== null) ? ((url.includes("?") ? "&" : "?") + "x=" + Date.now() + cacheBump) : ""), {
        method: (body !== null) ? "POST" : "GET",
        timeout: timeout * 1000,
        ...options,
        headers: {
            ...headers,
            ...options?.headers
        },
        data: body
    });
}

/**
 * Parses XML string to JSON object.
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
