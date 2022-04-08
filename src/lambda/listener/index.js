"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
exports.handler = (event) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    console.log("EVENT\n" + JSON.stringify(event));
    return { statusCode: 200, body: "success" };
});
