const express = require('express');
const app = express();
const crypto = require('crypto');
const fs = require('fs');
const port = 3000;

app.use(express.json());
app.use('/user/*');
app.use('/admin/*');
app.use('/api/v1/user/*');
app.use('/api/v1/admin/*')
app.listen(port, () => {
    console.log("3000");
});