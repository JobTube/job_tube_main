const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 0,
    secure: false,
    auth: {
        user: "*****@gmail.com",
        pass: "*****",
    },
});

module.exports = transporter;