import {performance} from "perf_hooks";
import {parentPort, workerData} from "worker_threads";
import {createRequest} from "../helpers/UrllibHelper";
import {HTTPDownloader} from "../helpers/HTTPDownloader";

const {request, wait, startTime, timeout} = workerData;

if (wait || (((performance.now() - startTime) / 1000) <= timeout)) {
    const thread = new HTTPDownloader(createRequest(request[0], {}, request[1], {}, request[2], request[3]));
    thread.run().then(result => {
        parentPort.postMessage(result);
    });
} else parentPort.postMessage([0]);
