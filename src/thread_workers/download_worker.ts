import { parentPort, workerData } from "worker_threads";
import { HTTPDownloader } from "../helpers/index.js";
import { createRequest } from "../utils/index.js";
import { WorkerData } from "../interfaces/index.js";

const {
    request,
    wait,
    startTime,
    timeout,
    urllibOptions
} = workerData as WorkerData;

if (wait || (((Date.now() - startTime) / 1000) <= timeout)) {
    const thread = new HTTPDownloader(createRequest(request.url, {}, null, request.cacheBump, request.timeout, urllibOptions));
    thread.run().then(result => {
        parentPort.postMessage(result);
    });
} else parentPort.postMessage([ 0 ]);
