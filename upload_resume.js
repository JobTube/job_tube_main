const fs = require('fs');
const multer = require('multer');
const pool = require('./connection');

const storage = multer.diskStorage({
    destination: async  (req, file, cb) => {
        try {
            await pool.query( `UPDATE users SET resume = TRUE WHERE token='${req.body.path}';`);
            if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
            cb(null, `/data-files/${req.body.path}/`);
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    },
    filename: (req, file, cb) => cb(null,  `resume.pdf`),
});

const upload = multer({ storage: storage });

module.exports = upload;