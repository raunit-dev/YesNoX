declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            auth?: {
                username: string;
                role: string;
            };
        }
    }
}
export default router;
