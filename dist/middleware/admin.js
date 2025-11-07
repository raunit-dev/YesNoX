"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminToken = void 0;
const express_jwt_1 = require("express-jwt");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '/daytwo/.env' });
exports.verifyAdminToken = (0, express_jwt_1.expressjwt)({
    secret: process.env.ADMIN_SECRET,
    algorithms: ["HS256"],
});
//# sourceMappingURL=admin.js.map