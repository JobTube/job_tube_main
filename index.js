const express = require('express');
const fs = require('fs');
const http = require('http');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');

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
const upload_resume = require('./upload_resume');

app.get('/data/:token?', async (req, res) => {
    try {
        var data = JSON.parse('{}');
        const user = req.params.token || "Guest";

        if(user == "Guest"){
            data.user = JSON.parse(`{"id": 0, "index": 0, "username": "Guest", "email": "", "token": "", "employment": "", "permission": 0, "resume": false, "followers": [], "following": []}`);
            data.videos = JSON.parse(`[]`);
            data.followers = JSON.parse(`[]`);
            data.followings = JSON.parse(`[]`);
        }else{
            await pool.query(`SELECT id, index, username, email, token, employment, permission, resume FROM users WHERE token='${req.params.token}'`)
            .then(users =>{
                if(users.rows.length){
                    data.user = users.rows[0];
                }
            });

            await pool.query(`SELECT users.id, users.username, follow.follower_id as follower  
                FROM follow INNER JOIN users ON follow.user_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(followers =>{
                data.followers = followers.rows;
            });

            await pool.query(`SELECT  users.id, users.username, follow.user_id as following 
                FROM follow INNER JOIN users ON follow.follower_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(followings =>{
                data.followings = followings.rows;
            });

            await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.employment as name, users.token, videos.description, videos.publish_date, videos.end_date, videos.types, videos.is_active, videos.confirm,
                (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes 
                FROM videos INNER JOIN users ON videos.user_id = users.id
                WHERE users.token = '${req.params.token}'`)
            .then(videos =>{
                data.videos = videos.rows;
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
        
        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.employment as name, users.token, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes 
            FROM videos INNER JOIN users ON videos.user_id = users.id
            WHERE videos.index = 0
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE`)
        .then(job_seekers =>{
            data.job_seekers = job_seekers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.employment as name, users.token, videos.description, videos.publish_date, videos.end_date, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes
            FROM videos INNER JOIN users ON videos.user_id = users.id
            WHERE videos.index = 1
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE`)
        .then(vacancies =>{
            data.vacancies = vacancies.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.employment as name, users.token, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes
            FROM videos INNER JOIN users ON videos.user_id = users.id
            WHERE videos.index = 2
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE`)
        .then(freelancers =>{
            data.freelancers = freelancers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.employment as name, users.token, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes
            FROM videos INNER JOIN users ON videos.user_id = users.id
            WHERE videos.index = 3
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE`)
        .then(talents =>{
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
                `INSERT INTO users (index, username, password, email, token, employment, permission) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
                [req.body.index, req.body.user, generateMd5(`SET_USER_DATA_${req.body.password}`), req.body.email, req.body.token, req.body.employment, parseInt(req.body.index) == 1 ? 3 : 1]
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
            res.json({"name": "inaccessible", "code": "3"});
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
            const base64 = fs.readFileSync("./files/default_user_profile_image.png", "base64");
            const buffer = Buffer.from(base64, "base64");
            fs.mkdirSync(filePath);
            fs.writeFileSync(`/data-files/${req.body.path}/profile.png`, buffer);
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.get('/user-data/:token', (req, res) => {
    const filePath = `/data-files/${req.params.token}/profile.png`;
    fs.exists(filePath, function (exists) {
        console.log(`path: `)
        res.writeHead(exists ? 200 : 404, {"Content-Type": exists ? "image/png" : "text/plain"});
        exists ? fs.readFile(filePath,(err, content) => res.end(content)) : res.end(`404 Not found token: ${req.params.token}`);
    });
});

app.get('/delete-files', (req, res) => {
    fs.readdirSync('/data-files/').forEach(folder => {
        if(fs.readdirSync(`/data-files/${folder}/`).length){
            fs.readdirSync(`/data-files/${folder}/`).forEach(file=>{
                fs.unlinkSync(`/data-files/${folder}/${file}`);
            });
        }
        fs.rmdirSync(`/data-files/${folder}`);
    });
    res.send('Deleted');
});

app.get('/read-files', (req, res) => {
    fs.readdirSync('/data-files/').forEach(folder => {
        console.log(`-- ${folder}`);
        fs.readdirSync(`/data-files/${folder}`).forEach(file=>{
            console.log(`-- -- ${file}`);
        });
    });
    res.send('Readed');
});

app.get('/user-resume/:token', (req, res) => {
    fs.readFile(`/data-files/${req.params.token}/resume.pdf`, (err, data) => {
    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=resume.pdf",
    });
    res.send(data);
    });
});

app.get('/user-video/:token/:file', (req, res) => {
    const videoPath = `/data-files/${req.params.token}/${req.params.file}.mp4`;
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
  
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
  
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
  
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
});

app.post('/video-trash', async(req, res) => {
    try {
        await pool.query(`DELETE FROM videos WHERE id = $1'`, [req.body.id])
        .then(() => {
            fs.unlinkSync(`/data-files/${req.body.path}/${req.body.name}.mp4`);
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/video-edit', async(req, res) => {
    try {
        await pool.query(`UPDATE videos SET is_active = ${req.body.active == 1 ? 'TRUE' : 'FALSE'} WHERE id='${req.body.id}';`)
        .then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/video-record/', upload_record.single('file'), (req, res) => res.sendStatus( req.file ? 200 : 400));

app.post('/add-profile/', upload_profile.single('file'), (req, res) => res.sendStatus( req.file ? 200 : 400));

app.post('/add-resume/', upload_resume.single('file'), (req, res) => res.sendStatus( req.file ? 200 : 400));

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