const transporter = require("./transporter");

async function sendConfirmationCode(mail, code) {
    const info = await transporter.sendMail({
        from: '"JobTube Confirmation Code" <*****@gmail.com>',
        to: mail,
        subject: "Confirmation",
        text: `Confirmation code: ${code}`,
        html: `<b>Confirmation code: ${code}</b>`,
    });

    console.log("Message sent: %s", info.messageId);
}

module.exports = sendConfirmationCode;