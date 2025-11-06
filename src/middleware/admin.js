
const { expressjwt: jwt } = require("express-jwt");
const dotenv = require('dotenv');
dotenv.config({ path: '/daytwo/.env' })

const verifyAdminToken = jwt({
    secret: process.env.ADMIN_SECRET,
    algorithms: ["HS256"],
});

module.exports = { verifyAdminToken };
