"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.hashPassword = hashPassword;
exports.loadUsers = loadUsers;
exports.findUserByUsername = findUserByUsername;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.loadAdmin = loadAdmin;
exports.findAdminByUsername = findAdminByUsername;
exports.createAdmin = createAdmin;
exports.loadMarket = loadMarket;
exports.findMarketById = findMarketById;
exports.createMarket = createMarket;
exports.updateMarket = updateMarket;
exports.findMarketBalance = findMarketBalance;
exports.upsertMarketBalance = upsertMarketBalance;
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("./generated/prisma/index.js");
const prisma = new index_js_1.PrismaClient();
exports.prisma = prisma;
// Hash password utility
function hashPassword(password) {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
}
//returns list of all the users
async function loadUsers() {
    try {
        return await prisma.user.findMany({
            include: {
                market_balances: true
            }
        });
    }
    catch (e) {
        console.error('Error loading users:', e);
        return [];
    }
}
//returns one particular user
async function findUserByUsername(username) {
    try {
        return await prisma.user.findUnique({
            where: { username },
            include: {
                market_balances: true
            }
        });
    }
    catch (e) {
        console.error('Error finding user:', e);
        return null;
    }
}
async function createUser(userData) {
    try {
        return await prisma.user.create({
            data: userData
        });
    }
    catch (e) {
        console.error('Error creating user:', e);
        throw e;
    }
}
//using prisma types lets goo
async function updateUser(userId, userData) {
    try {
        return await prisma.user.update({
            where: { id: userId },
            data: userData,
            include: {
                market_balances: true
            }
        });
    }
    catch (e) {
        console.error('Error updating user:', e);
        throw e;
    }
}
// loads the array of admins
async function loadAdmin() {
    try {
        return await prisma.admin.findMany();
    }
    catch (e) {
        console.error('Error loading admin:', e);
        return [];
    }
}
async function findAdminByUsername(username) {
    try {
        return await prisma.admin.findUnique({
            where: { username }
        });
    }
    catch (e) {
        console.error('Error finding admin:', e);
        return null;
    }
}
async function createAdmin(adminData) {
    try {
        return await prisma.admin.create({
            data: adminData
        });
    }
    catch (e) {
        console.error('Error creating admin:', e);
        throw e;
    }
}
// Market functions
async function loadMarket() {
    try {
        return await prisma.market.findMany({
            include: {
                admin: true,
                market_balances: true
            }
        });
    }
    catch (e) {
        console.error('Error loading markets:', e);
        return [];
    }
}
async function findMarketById(marketId) {
    try {
        return await prisma.market.findUnique({
            where: { market_id: marketId },
            include: {
                market_balances: true
            }
        });
    }
    catch (e) {
        console.error('Error finding market:', e);
        return null;
    }
}
async function createMarket(marketData) {
    try {
        return await prisma.market.create({
            data: marketData
        });
    }
    catch (e) {
        console.error('Error creating market:', e);
        throw e;
    }
}
async function updateMarket(marketId, marketData) {
    try {
        return await prisma.market.update({
            where: { market_id: marketId },
            data: marketData
        });
    }
    catch (e) {
        console.error('Error updating market:', e);
        throw e;
    }
}
// MarketBalance functions
async function findMarketBalance(userId, marketId) {
    try {
        return await prisma.marketBalance.findUnique({
            where: {
                user_id_market_id: {
                    user_id: userId,
                    market_id: marketId
                }
            }
        });
    }
    catch (e) {
        console.error('Error finding market balance:', e);
        return null;
    }
}
async function upsertMarketBalance(userId, marketId, balanceData) {
    try {
        return await prisma.marketBalance.upsert({
            where: {
                user_id_market_id: {
                    user_id: userId,
                    market_id: marketId
                }
            },
            update: balanceData,
            create: {
                user_id: userId,
                market_id: marketId,
                ...balanceData
            }
        });
    }
    catch (e) {
        console.error('Error upserting market balance:', e);
        throw e;
    }
}
//# sourceMappingURL=util.js.map