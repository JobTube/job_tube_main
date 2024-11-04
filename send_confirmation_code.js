const transporter = require("./transporter");

async function sendConfirmationCode(mail, code) {
    const info = await transporter.sendMail({
        from: '"JobTube Confirmation Code" <e1000.space@gmail.com>', // sender address
        to: mail, // list of receivers
        subject: "Confirmation", // Subject line
        text: `Confirmation code: ${code}`, // plain text body
        html: `<b>Confirmation code: ${code}</b>`, // html body
    });

    console.log("Message sent: %s", info.messageId);
}

module.exports = sendConfirmationCode;