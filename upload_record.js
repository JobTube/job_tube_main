const fs = require('fs');
const multer = require('multer');
const pool = require('./connection');

const storage = multer.diskStorage({
    destination: async  (req, file, cb) => {
        try {
            if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
            await pool.query(
                `INSERT INTO videos (employment, description, user_id) VALUES ($1, $2, $3);`,
                [req.body.employment, req.body.description, req.body.user]
            ).then(() => cb(null, `/data-files/${req.body.path}/`));
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    },
    filename: (req, file, cb) => cb(null,  `${req.body.id}-${req.body.employment}`),
});

const upload = multer({ storage: storage });

module.exports = upload;