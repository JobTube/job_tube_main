const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const md5 = require('js-md5');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extend: true }));

const pool = require('./connection');
const sendConfirmationCode = require('./send_confirmation_code');

app.get('/data', async (req, res) => {
    try {
        var data = JSON.parse('{}');

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
        
        await pool.query(`SELECT * FROM job_seekers ORDER BY id DESC LIMIT 10`)
        .then(job_seekers=>{
            data.job_seekers = job_seekers.rows;
        });
    
        await pool.query(`SELECT * FROM offers ORDER BY id DESC LIMIT 10`)
        .then(offers=>{
            data.offers = offers.rows;
        });
    
        await pool.query(`SELECT * FROM freelancers ORDER BY id DESC LIMIT 10`)
        .then(freelancers=>{
            data.freelancers = freelancers.rows;
        });
    
        await pool.query(`SELECT * FROM talents ORDER BY id DESC LIMIT 10`)
        .then(talents=>{
            data.talents = talents.rows;
        });

        res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});

app.get('/e/:mail', async(req, res)=>{
    try {
        const result = await pool.query(`SELECT confirm FROM users WHERE email = '${req.params.mail}'`);
        if (!result.rows.length) {
            res.json({"Status": 1});
            await pool.query(`INSERT INTO users (index, username, password, email) VALUES ($1, $2, $3, $4);`, [1, 'testuser', 'testing_pass', req.params.mail]);
            sendConfirmationCode("e1000.tavakkulov@gmail.com", 4630).catch(console.error);
        } else {
            res.json({"Status": 2});
        }
    } catch (err) {
        console.error(err);
    }
});

app.post('/add-user', async(req, res) => {
    try {

        const check = await pool.query(`SELECT confirm FROM users WHERE email = '${req.body.email}'`);
        if (!check.rows[0].exists) {
            res.json({"Status": 3});
            await pool.query(`INSERT INTO users (index, username, password, email) VALUES ($1, $2, $3, $4);`,
                [req.body.index, req.body.user, md5(`SET_USER_DATA_${req.body.password}`), req.params.mail, req.body.employment]);
            // sendConfirmationCode(req.body.email, req.body.code).catch(console.error);
        } else if(!count.rows[0].confirm){
            res.json({"Status": 2});
        }else if(count.rows[0].confirm){
            res.json({"Status": 1});
        }
    }catch (err) {
        res.json({"Status": 0, "error": err});
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