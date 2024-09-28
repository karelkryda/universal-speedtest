import { WebSocket } from "ws";
/**
 * Creates a fetch GET request.
 * @param url - URL address
 * @param abortSignal - request abort signal
 * @returns {Promise<Response>} fetch request
 */
export declare function createGetRequest(url: string, abortSignal?: AbortSignal): Promise<Response>;
/**
 * Creates a fetch POST request.
 * @param url - URL address
 * @param body - request POST body
 * @param abortSignal - request abort signal
 * @returns {Promise<Response>} fetch request
 */
export declare function createPostRequest(url: string, body: ReadableStream, abortSignal?: AbortSignal): Promise<Response>;
/**
 * Creates a WebSocket client connection to the specified server.
 * @param {string} host - Server to send requests to
 * @private
 * @returns {WebSocket} WebSocket client connection
 */
export declare function createSocketClient(host: string): WebSocket;
/**
 * Parses XML string to JSON object.
 * @param xml - XML string to be parsed
 * @returns {Promise<any>} XML as object
 */
export declare function parseXML(xml: string): Promise<any>;
