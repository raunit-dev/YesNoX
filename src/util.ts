import crypto from 'crypto';
import { PrismaClient, User, Admin, Market, MarketBalance, Prisma } from './generated/prisma/index.js';

const prisma = new PrismaClient();

// Hash password utility
function hashPassword(password: string) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

type UserWithBalances = Prisma.UserGetPayload<{
    include: { market_balances: true }
}>;

type MarketWithRelations = Prisma.MarketGetPayload<{
    include: { admin: true, market_balances: true }
}>;

type MarketWithBalances = Prisma.MarketGetPayload<{
    include: { market_balances: true }
}>

//returns list of all the users
async function loadUsers(): Promise<UserWithBalances[]> {
    try {
        return await prisma.user.findMany({
            include: {
                market_balances: true
            }
        });
    } catch (e) {
        console.error('Error loading users:', e);
        return [];
    }
}

//returns one particular user
async function findUserByUsername(username: string): Promise<UserWithBalances | null> {
    try {
        return await prisma.user.findUnique({
            where: { username },
            include: {
                market_balances: true
            }
        });
    } catch (e) {
        console.error('Error finding user:', e);
        return null;
    }
}

async function createUser(userData: Prisma.UserCreateInput): Promise<User> {
    try {
        return await prisma.user.create({
            data: userData
        });
    } catch (e) {
        console.error('Error creating user:', e);
        throw e;
    }
}

//using prisma types lets goo
async function updateUser(userId: number, userData: Prisma.UserUpdateInput): Promise<UserWithBalances> {
    try {
        return await prisma.user.update({
            where: { id: userId },
            data: userData,
            include: {
                market_balances: true
            }
        });
    } catch (e) {
        console.error('Error updating user:', e);
        throw e;
    }
}

// loads the array of admins
async function loadAdmin() {
    try {
        return await prisma.admin.findMany();
    } catch (e) {
        console.error('Error loading admin:', e);
        return [];
    }
}

async function findAdminByUsername(username: string): Promise<Admin | null> {
    try {
        return await prisma.admin.findUnique({
            where: { username }
        });
    } catch (e) {
        console.error('Error finding admin:', e);
        return null;
    }
}

async function createAdmin(adminData: Prisma.AdminCreateInput) {
    try {
        return await prisma.admin.create({
            data: adminData
        });
    } catch (e) {
        console.error('Error creating admin:', e);
        throw e;
    }
}

// Market functions
async function loadMarket(): Promise<MarketWithRelations[]> {
    try {
        return await prisma.market.findMany({
            include: {
                admin: true,
                market_balances: true
            }
        });
    } catch (e) {
        console.error('Error loading markets:', e);
        return [];
    }
}

async function findMarketById(marketId: string): Promise<MarketWithBalances | null> {
    try {
        return await prisma.market.findUnique({
            where: { market_id: marketId },
            include: {
                market_balances: true
            }
        });
    } catch (e) {
        console.error('Error finding market:', e);
        return null;
    }
}

async function createMarket(marketData: Prisma.MarketCreateInput): Promise<Market> {
    try {
        return await prisma.market.create({
            data: marketData
        });
    } catch (e) {
        console.error('Error creating market:', e);
        throw e;
    }
}

async function updateMarket(marketId: string, marketData: Prisma.MarketCreateInput): Promise<Market> {
    try {
        return await prisma.market.update({
            where: { market_id: marketId },
            data: marketData
        });
    } catch (e) {
        console.error('Error updating market:', e);
        throw e;
    }
}

// MarketBalance functions
async function findMarketBalance(userId: number, marketId: string): Promise<MarketBalance | null> {
    try {
        return await prisma.marketBalance.findUnique({
            where: {
                user_id_market_id: {
                    user_id: userId,
                    market_id: marketId
                }
            }
        });
    } catch (e) {
        console.error('Error finding market balance:', e);
        return null;
    }
}

async function upsertMarketBalance(userId: number, marketId: string, balanceData: Partial<Pick<MarketBalance, 'outcome_a' | 'outcome_b'>>): Promise<MarketBalance> {
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
    } catch (e) {
        console.error('Error upserting market balance:', e);
        throw e;
    }
}

export {
    prisma,
    hashPassword,
    loadUsers,
    findUserByUsername,
    createUser,
    updateUser,
    loadAdmin,
    findAdminByUsername,
    createAdmin,
    loadMarket,
    findMarketById,
    createMarket,
    updateMarket,
    findMarketBalance,
    upsertMarketBalance
};