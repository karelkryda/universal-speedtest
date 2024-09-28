import { WebSocket } from "ws";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { HttpMethods } from "../interfaces/index.js";

const USER_AGENT = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/APP_VERSION";

/**
 * Creates a fetch GET request.
 * @param url - URL address
 * @param abortSignal - request abort signal
 * @returns {Promise<Response>} fetch request
 */
export function createGetRequest(url: string, abortSignal?: AbortSignal): Promise<Response> {
    return fetch(url, {
        headers: {
            "User-Agent": USER_AGENT
        },
        method: HttpMethods.GET,
        signal: abortSignal
    });
}

/**
 * Creates a fetch POST request.
 * @param url - URL address
 * @param body - request POST body
 * @param abortSignal - request abort signal
 * @returns {Promise<Response>} fetch request
 */
export function createPostRequest(url: string, body: ReadableStream, abortSignal?: AbortSignal): Promise<Response> {
    return fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/octet-stream",
        },
        method: HttpMethods.POST,
        body: body,
        duplex: "half",
        signal: abortSignal
    });
}

/**
 * Creates a WebSocket client connection to the specified server.
 * @param {string} host - Server to send requests to
 * @private
 * @returns {WebSocket} WebSocket client connection
 */
export function createSocketClient(host: string): WebSocket {
    return new WebSocket(`wss://${ host }/ws`, {
        headers: {
            "User-Agent": USER_AGENT
        },
        timeout: 10
    });
}

/**
 * Parses XML string to JSON object.
 * @param xml - XML string to be parsed
 * @returns {Promise<any>} XML as object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseXML(xml: string): Promise<any> {
    if (XMLValidator.validate(xml) === true)
        return new Promise(resolve => {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: "",
                parseAttributeValue: true
            });
            const xmlObject = parser.parse(xml);

            resolve(xmlObject);
        });
    else
        throw new Error("Error parsing xml");
}
