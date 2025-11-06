const crypto = require('crypto');

const usersFile = [];
const adminFile = [];
const marketFile = [];


function loadUsers() {
    try {
        if (usersFile.length !== 0) {
            return usersFile;
        } else {
            return [];
        }
    } catch (e) {
        console.error('Error loading users:', e);
        return [];
    }
}

function loadAdmin() {
    try {
        if (adminFile.length !== 0)
            return adminFile;
        else {
            return [];
        }
    } catch (e) {
        console.error('Error loading admin:', e);
        return [];
    }
}

function loadMarket() {
    try {
        if (marketFile.length !== 0)
            return marketFile;
        else {
            return [];
        }
    } catch (e) {
        console.error('Error Loading Market', e);
    }
}



function saveAdmin(admin) {
    adminFile.push(admin);
}

function saveUsers(users) {
    usersFile.push(users);
}

function saveMarket(market) {
    marketFile.push(market)
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = {
    loadUsers,
    loadAdmin,
    loadMarket,
    saveAdmin,
    saveUsers,
    saveMarket,
    hashPassword
};