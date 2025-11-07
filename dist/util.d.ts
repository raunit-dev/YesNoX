import { PrismaClient, User, Admin, Market, MarketBalance, Prisma } from './generated/prisma/index.js';
declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("./generated/prisma/runtime/library.js").DefaultArgs>;
declare function hashPassword(password: string): string;
type UserWithBalances = Prisma.UserGetPayload<{
    include: {
        market_balances: true;
    };
}>;
type MarketWithRelations = Prisma.MarketGetPayload<{
    include: {
        admin: true;
        market_balances: true;
    };
}>;
type MarketWithBalances = Prisma.MarketGetPayload<{
    include: {
        market_balances: true;
    };
}>;
declare function loadUsers(): Promise<UserWithBalances[]>;
declare function findUserByUsername(username: string): Promise<UserWithBalances | null>;
declare function createUser(userData: Prisma.UserCreateInput): Promise<User>;
declare function updateUser(userId: number, userData: Prisma.UserUpdateInput): Promise<UserWithBalances>;
declare function loadAdmin(): Promise<{
    id: number;
    username: string;
    password: string;
    role: string;
    created_at: Date;
    updated_at: Date;
}[]>;
declare function findAdminByUsername(username: string): Promise<Admin | null>;
declare function createAdmin(adminData: Prisma.AdminCreateInput): Promise<{
    id: number;
    username: string;
    password: string;
    role: string;
    created_at: Date;
    updated_at: Date;
}>;
declare function loadMarket(): Promise<MarketWithRelations[]>;
declare function findMarketById(marketId: string): Promise<MarketWithBalances | null>;
declare function createMarket(marketData: Prisma.MarketCreateInput): Promise<Market>;
declare function updateMarket(marketId: string, marketData: Prisma.MarketCreateInput): Promise<Market>;
declare function findMarketBalance(userId: number, marketId: string): Promise<MarketBalance | null>;
declare function upsertMarketBalance(userId: number, marketId: string, balanceData: Partial<Pick<MarketBalance, 'outcome_a' | 'outcome_b'>>): Promise<MarketBalance>;
export { prisma, hashPassword, loadUsers, findUserByUsername, createUser, updateUser, loadAdmin, findAdminByUsername, createAdmin, loadMarket, findMarketById, createMarket, updateMarket, findMarketBalance, upsertMarketBalance };
