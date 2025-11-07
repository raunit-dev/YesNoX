import { expressjwt as jwt } from "express-jwt";
import dotenv from 'dotenv';
dotenv.config({ path: '/daytwo/.env' })

export const verifyUserToken = jwt({
    secret: process.env.USER_SECRET as string,
    algorithms: ["HS256"],
});