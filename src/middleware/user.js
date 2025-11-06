const {expressjwt: jwt} = require("express-jwt");
const dotenv = require('dotenv');
dotenv.config({ path: '/daytwo/.env' })

const verifyUserToken = jwt({
    secret: process.env.USER_SECRET,
    algorithms: ["HS256"],
})

module.exports = { verifyUserToken };