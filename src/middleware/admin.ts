import { expressjwt as jwt } from "express-jwt";
import dotenv from 'dotenv';
dotenv.config({ path: '/daytwo/.env' })

export const verifyAdminToken = jwt({
    secret: process.env.ADMIN_SECRET as string,
    algorithms: ["HS256"],
});
