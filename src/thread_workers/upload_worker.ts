import { parentPort, workerData } from "worker_threads";
import { HTTPUploader } from "../helpers/index.js";
import { WorkerData } from "../interfaces/index.js";
import { createRequest } from "../utils/index.js";

const {
    request,
    wait,
    startTime,
    timeout,
    urllibOptions
} = workerData as WorkerData;

if (wait || (((Date.now() - startTime) / 1000) <= timeout)) {
    const thread = new HTTPUploader(createRequest(request.url, request.headers, request.body, request.cacheBump, request.timeout, urllibOptions), request.totalData);
    thread.run().then(result => {
        parentPort.postMessage(result);
    });
} else parentPort.postMessage(0);
