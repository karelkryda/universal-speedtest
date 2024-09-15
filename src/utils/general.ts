import { IncomingHttpHeaders } from "http";
import { HttpClientResponse, request, RequestOptions } from "urllib";
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
    headers["user-agent"] = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/APP_VERSION";
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
 */
export function parseXML(xml: string): Promise<any> {
    if (XMLValidator.validate(xml) === true)
        return new Promise(resolve => parseString(xml, {
            explicitArray: false,
            mergeAttrs: true
        }, (_, result) => resolve(result)));
    else
        throw new Error("Error parsing xml");
}
