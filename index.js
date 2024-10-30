const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extend: true }));

const client = require('./connection');

app.get('/api', async (req, res) => {
        try{
            await client.connect();

            var data = new Object;
        
            await client.query(`SELECT id, index, number, code, '[]'::json as children FROM job_categories WHERE index = 1 ORDER BY number ASC`)
                .then(categories =>{
                    data.categories = categories.rows;
                });
        
            await client.query(`SELECT id, index, number, code, '[]'::json as children FROM job_categories WHERE index = 2 ORDER BY number ASC`)
                .then(subcategories =>{
                    subcategories.rows.forEach(row=>{
                        data.categories[Math.floor(row.number)-1].children.push(row);
                    });
                });
            
            await client.query(`SELECT * FROM countries ORDER BY code ASC`)
                .then(countries=>{
                    data.countries = countries.rows;
                });
            
            await client.query(`SELECT * FROM job_seekers ORDER BY id DESC LIMIT 10`)
                .then(job_seekers=>{
                    data.job_seekers = job_seekers.rows;
                });
        
            await client.query(`SELECT * FROM offers ORDER BY id DESC LIMIT 10`)
                .then(offers=>{
                    data.offers = offers.rows;
                });
        
            await client.query(`SELECT * FROM freelancers ORDER BY id DESC LIMIT 10`)
                .then(freelancers=>{
                    data.freelancers = freelancers.rows;
                });
        
            await client.query(`SELECT * FROM talents ORDER BY id DESC LIMIT 10`)
                .then(talents=>{
                    data.talents = talents.rows;
                });
        
            res.json(data);
        
            await client.end();
        } catch (err){
            console.log(err);
            res.sendStatus(500);
        }
    }
);

app.get('/admin', (req, res) => {
    res.render(
        __dirname + '/pages/admin.ejs',
        {

        }
    )
});

app.listen(3000);