const fs = require('fs');
const multer = require('multer');
const pool = require('./connection');

const storage = multer.diskStorage({
    destination: async  (req, file, cb) => {
        try {
            // const check = await pool.query(`SELECT COUNT(id) FROM videos WHERE employment='${req.body.user}${req.body.employment}'`);
            if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
            // if (!check.rows.length){
                await pool.query(
                    `INSERT INTO videos (index, employment, description, types, end_date, user_id) VALUES ($1, $2, $3, $4, $5, $6);`,
                    [req.body.index, `${req.body.user}${req.body.employment}`, req.body.description, req.body.types, parseInt(req.body.index) == 1 ? req.body.end : null, req.body.user]
                );
            // }
            cb(null, `/data-files/${req.body.path}/`);
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    },
    filename: (req, file, cb) => cb(null,  `${req.body.user}${req.body.employment}.mp4`),
});

const upload = multer({ storage: storage });

module.exports = upload;