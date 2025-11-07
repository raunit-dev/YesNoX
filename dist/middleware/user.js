"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserToken = void 0;
const express_jwt_1 = require("express-jwt");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '/daytwo/.env' });
exports.verifyUserToken = (0, express_jwt_1.expressjwt)({
    secret: process.env.USER_SECRET,
    algorithms: ["HS256"],
});
//# sourceMappingURL=user.js.map