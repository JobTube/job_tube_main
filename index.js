const express = require('express');
const fs = require('fs');
const http = require('http');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extend: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extend: true }));

const pool = require('./connection');
const sendConfirmationCode = require('./send_confirmation_code');
const generateMd5 = require('./generate_code');
const upload_profile = require('./upload_profile');
const upload_record = require('./upload_record');

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
      res.sendStatus(500);
    }
});

app.post('/add-user', async(req, res) => {
    try {
        let sendMail = false;
        const check = await pool.query(`SELECT index, username, password, confirm FROM users WHERE email = '${req.body.email}'`);
        if (!check.rows.length) {
            res.json({"name": "successful", "code": "0"});
            await pool.query(
                `INSERT INTO users (index, username, password, email, token, employment) VALUES ($1, $2, $3, $4, $5, $6);`,
                [req.body.index, req.body.user, generateMd5(`SET_USER_DATA_${req.body.password}`), req.body.email, req.body.token, req.body.employment]
            );
            sendMail = true;
        } else {
            if(
                // check.rows[0].index == parseInt(req.body.index)
                // && check.rows[0].username == req.body.username
                // && check.rows[0].password == generateMd5(`SET_USER_DATA_${req.body.password}`)
                 !check.rows[0].confirm){
                    res.json({"name": "successful", "code": "1"});
                    sendMail = true;
            }else{
                res.json({"name": "successful", "code": "2"});
            }
        }
        if(sendMail) sendConfirmationCode("e1000.tavakkulov@gmail.com", req.body.code).catch(console.error);
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-login', async(req, res) => {
    try {
        const check = await pool.query(`SELECT token FROM users WHERE password='${generateMd5(`SET_USER_DATA_${req.body.password}`)}' AND email='${req.body.email}' AND confirm = TRUE;`);
        if (check.rows.length) {
            res.json({"name": "successful", "code": check.rows[0].token});
        } else {
            res.json({"name": "inaccessible"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-confirm', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET confirm = TRUE WHERE password='${req.body.password}' AND email='${req.body.email}';`)
        .then(() => {
            const filePath = `/data-files/${req.body.path}/`;
            const base64 = fs.readFileSync("/files/default_user_profile_image.png", "base64");
            const buffer = Buffer.from(base64, "base64");
            fs.mkdirSync(filePath);
            fs.writeFileSync(`/data-files/${req.body.path}/profile.png`, buffer);
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

// https://jobtube-1bqr.onrender.com/user-data/4bc46e6f-a96a-43e7-a48e-c395e06ab54d

app.get('/user-data/:token', (req, res) => {
    const filePath = `./files/${req.params.token}/profile.png`;
    fs.exists(filePath, function (exists) {
        console.log(`path: `)
        res.writeHead(exists ? 200 : 404, {"Content-Type": exists ? "image/png" : "text/plain"});
        exists ? fs.readFile(filePath,(err, content) => res.end(content)) : res.end(`404 Not found token: ${req.params.token}`);
    });
});

app.get('/test', (req, res) => {
    // fs.unlinkSync('/data-files/undefined/profile.png');
    // fs.rmdirSync('/data-files/undefined');
    fs.readdirSync('/data-files/d1b80070-a523-11ef-9f8e-d54edaf17bc7').forEach(file => {
        console.log('in directory: ' + file);
    });
    res.send('Testing');
});

// app.get('/test/:path', (req, res) => {
//     const base64 = fs.readFileSync("./files/profile.png", "base64");
//     const filePath = `./files/${req.params.path}/`;
//     fs.mkdirSync(filePath);
//     const buffer = Buffer.from(base64, "base64");
//     fs.writeFileSync(`${filePath}/profile.png`, buffer);
//     fs.exists(filePath, function (exists) {
//         res.writeHead(exists ? 200 : 404, {"Content-Type": exists ? "image/png" : "text/plain"});
//         exists ? fs.readFile(filePath,(err, content) => res.end(content)) : res.end("404 Not Found");
//     });
// });

// app.get('/user-video', (req, res) => {
//     const videoPath = './files/video.mp4';
//     const stat = fs.statSync(videoPath);
//     const fileSize = stat.size;
//     const range = req.headers.range;
  
//     if (range) {
//       const parts = range.replace(/bytes=/, '').split('-');
//       const start = parseInt(parts[0], 10);
//       const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
//       const chunkSize = end - start + 1;
//       const file = fs.createReadStream(videoPath, { start, end });
//       const head = {
//         'Content-Range': `bytes ${start}-${end}/${fileSize}`,
//         'Accept-Ranges': 'bytes',
//         'Content-Length': chunkSize,
//         'Content-Type': 'video/mp4',
//       };
  
//       res.writeHead(206, head);
//       file.pipe(res);
//     } else {
//       const head = {
//         'Content-Length': fileSize,
//         'Content-Type': 'video/mp4',
//       };
  
//       res.writeHead(200, head);
//       fs.createReadStream(videoPath).pipe(res);
//     }
// });

app.post('/add-profile/', upload_profile.single('file'), (req, res) => res.sendStatus( req.file ? 200 : 400));

app.post('/video-record/', upload_record.single('file'), (req, res) => res.sendStatus( req.file ? 200 : 400));

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