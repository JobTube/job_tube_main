const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
        user: "e1000.space@gmail.com",
        pass: "bwft uoqe vcka lfsl",
    },
});

module.exports = transporter;