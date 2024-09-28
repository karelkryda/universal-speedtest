"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeedUnits = exports.DistanceUnits = exports.HttpMethods = void 0;
var HttpMethods;
(function (HttpMethods) {
    HttpMethods["GET"] = "GET";
    HttpMethods["POST"] = "POST";
})(HttpMethods || (exports.HttpMethods = HttpMethods = {}));
var DistanceUnits;
(function (DistanceUnits) {
    DistanceUnits["mi"] = "mi";
    DistanceUnits["km"] = "km";
})(DistanceUnits || (exports.DistanceUnits = DistanceUnits = {}));
var SpeedUnits;
(function (SpeedUnits) {
    SpeedUnits["Bps"] = "Bps";
    SpeedUnits["KBps"] = "KBps";
    SpeedUnits["MBps"] = "MBps";
    SpeedUnits["GBps"] = "GBps";
    SpeedUnits["bps"] = "bps";
    SpeedUnits["Kbps"] = "Kbps";
    SpeedUnits["Mbps"] = "Mbps";
    SpeedUnits["Gbps"] = "Gbps";
})(SpeedUnits || (exports.SpeedUnits = SpeedUnits = {}));
