const multer = require('multer');
const pool = require('./connection');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: async  (req, file, cb) => {
        try {
            await pool.query(
                `INSERT INTO videos (index, name, description, countries, types, end_date, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
                [req.body.index, req.body.name, req.body.description, req.body.countries, req.body.types, parseInt(req.body.index) == 1 ? req.body.end : null, req.body.user]
            );
            if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
            cb(null, `/data-files/${req.body.path}/`);
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    },
    filename: (req, file, cb) => cb(null,  `${req.body.name}.mp4`),
});

const upload = multer({ storage: storage });

module.exports = upload;