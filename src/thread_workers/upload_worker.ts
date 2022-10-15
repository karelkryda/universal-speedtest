import { performance } from "perf_hooks";
import { parentPort, workerData } from "worker_threads";
import { createRequest } from "../helpers/UrllibHelper";
import { HTTPUploader } from "../helpers/HTTPUploader";

const {
    request,
    wait,
    startTime,
    timeout,
    urllibOptions,
} = workerData;

if (wait || (((performance.now() - startTime) / 1000) <= timeout)) {
    const thread = new HTTPUploader(createRequest(request[0], request[1], request[2], request[3], request[4], request[5], false, urllibOptions), request[6]);
    thread.run().then(result => {
        parentPort.postMessage(result);
    });
} else parentPort.postMessage(0);
