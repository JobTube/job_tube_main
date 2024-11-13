const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const md5 = require('js-md5');
const { v4: uuidv4, } = require('uuid');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extend: true }));

const pool = require('./connection');
const sendConfirmationCode = require('./send_confirmation_code');
const generateMd5 = require('./generate_code');

app.get('/data/:token?', async (req, res) => {
    try {
        var data = JSON.parse('{}');
        const user = req.params.token || "Guest";

        if(user == "Guest"){
            data.user = JSON.parse(`{"id": 0, "index": 0, "username": "Guest", "email": "", "token": "", "employment": "", "followers": [], "following": []}`);
        }else{
            await pool.query(`SELECT id, index, username, email, token, employment, followers, following FROM users WHERE token='${req.params.token}'`)
            .then(users =>{
                if(users.rows.length) data.user = users.rows[0];
            });
            
        }

        await pool.query(`SELECT id, index, number, code, '[]'::json as children FROM job_categories WHERE index = 1 ORDER BY number ASC`)
        .then(categories =>{
            data.categories = categories.rows;
        });

        await pool.query(`SELECT id, index, number, code, '[]'::json as children FROM job_categories WHERE index = 2 ORDER BY number ASC`)
        .then(subcategories =>{
            subcategories.rows.forEach(row=>{
                data.categories[Math.floor(row.number)-1].children.push(row);
            });
        });
        
        await pool.query(`SELECT * FROM countries ORDER BY code ASC`)
        .then(countries=>{
            data.countries = countries.rows;
        });
        
        await pool.query(`SELECT * FROM job_records ORDER BY id DESC LIMIT 10`)
        .then(job_seekers=>{
            data.job_seekers = job_seekers.rows;
        });
    
        await pool.query(`SELECT * FROM job_records ORDER BY id DESC LIMIT 10`)
        .then(offers=>{
            data.offers = offers.rows;
        });
    
        await pool.query(`SELECT * FROM job_records ORDER BY id DESC LIMIT 10`)
        .then(freelancers=>{
            data.freelancers = freelancers.rows;
        });
    
        await pool.query(`SELECT * FROM job_records ORDER BY id DESC LIMIT 10`)
        .then(talents=>{
            data.talents = talents.rows;
        });

        res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});

app.post('/add-user', async(req, res) => {
    try {
        const check = await pool.query(`SELECT confirm FROM users WHERE email = '${req.body.email}'`);
        if (!check.rows.length) {
            res.json({"name": "successful", "code": "0"});
            await pool.query(
                `INSERT INTO users (index, username, password, email, token, employment) VALUES ($1, $2, $3, $4, $5, $6);`,
                [req.body.index, req.body.user, generateMd5(`SET_USER_DATA_${req.body.password}`), req.body.email, uuidv4(), req.body.employment]
            );
            sendConfirmationCode("e1000.tavakkulov@gmail.com", req.body.code).catch(console.error);
        } else {
            res.json({"name": "successful", "code": !check.rows[0].confirm ? "1" : "2"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-login', async(req, res) => {
    try {
        const check = await pool.query(`SELECT token FROM users WHERE password='${generateMd5(`SET_USER_DATA_${req.body.password}`)}' AND email='${req.body.email}';`);
        if (check.rows.length) {
            res.json({"name": "successful", "code": check.rows[0].token});
        } else {
            res.json({"name": "inaccessible"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.get('/ex/:email', async(req, res) => {
    try {
        const check = await pool.query(`SELECT token FROM users WHERE email='${req.params.email}';`);
        console.log(check.rows);
        if (check.rows.length) {
            res.json({"email": req.params.email, "name": "successful", "code": check.rows[0].token});
        } else {
            res.json({"email": req.params.email, "name": "successful", "code": "1"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-confirm', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET confirm = TRUE WHERE password='${req.body.password}' AND email='${req.body.email}';`);
        res.json({"name": "successful", "code": "0"});
    } catch (err) {
        res.json(err);
    }
});

app.get('/admin', (req, res) => {
    res.render(
        __dirname + '/pages/admin.ejs',
        {

        }
    )
});

app.listen(3000);

/*
    git add .
    git commit -m "restore api"
    git push origin master
    
*/