const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination:  (req, file, cb) => cb(null, `files/${req.body.path}/`),
    filename: (req, file, cb) => cb(null,  `profile.png`),
});

const upload = multer({ storage: storage });

module.exports = upload;