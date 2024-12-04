const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination:  (req, file, cb) => {
        if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
        cb(null, `/data-files/${req.body.path}/`);
    },
    filename: (req, file, cb) => cb(null,  `profile.png`),
});

const upload = multer({ storage: storage });

module.exports = upload;