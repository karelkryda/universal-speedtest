"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetRequest = createGetRequest;
exports.createPostRequest = createPostRequest;
exports.createSocketClient = createSocketClient;
exports.parseXML = parseXML;
const ws_1 = require("ws");
const fast_xml_parser_1 = require("fast-xml-parser");
const index_js_1 = require("../interfaces/index.js");
const USER_AGENT = "Mozilla/5.0 (" + process.platform + "; U; " + process.arch + "; en-us) TypeScript/" + process.version + " (KHTML, like Gecko) UniversalSpeedTest/3.0.0-rc.0";
/**
 * Creates a fetch GET request.
 * @param url - URL address
 * @param abortSignal - request abort signal
 * @returns {Promise<Response>} fetch request
 */
function createGetRequest(url, abortSignal) {
    return fetch(url, {
        headers: {
            "User-Agent": USER_AGENT
        },
        method: index_js_1.HttpMethods.GET,
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
function createPostRequest(url, body, abortSignal) {
    return fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/octet-stream",
        },
        method: index_js_1.HttpMethods.POST,
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
function createSocketClient(host) {
    return new ws_1.WebSocket(`wss://${host}/ws`, {
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
function parseXML(xml) {
    if (fast_xml_parser_1.XMLValidator.validate(xml) === true)
        return new Promise(resolve => {
            const parser = new fast_xml_parser_1.XMLParser({
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
