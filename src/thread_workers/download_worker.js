// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { workerData } = require("worker_threads");

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("ts-node").register();
require(path.resolve(__dirname, workerData.path));