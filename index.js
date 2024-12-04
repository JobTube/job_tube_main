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

app.get('/data/:token/:counties?/:types?/:search?', async (req, res) => {
    try {
        const counties = req.params.counties || '_';
        const counties_arr = counties != '_' ? counties.split(',') : [];
        
        const types = req.params.types || '_';
        const types_arr = types != '_' ? types.split(',') : [];
        
        const search = req.params.search || '';

        let search_query = '';
        let search_arr_query = ' ORDER BY CASE WHEN users.premium = TRUE THEN 0 ';
        
        if(types_arr.length || counties_arr.length){
            search_arr_query += ' WHEN '
            if(counties_arr.length){
                let country_query = ' videos.countries && ARRAY['
                counties_arr.forEach(country => {
                    country_query += `'${country}',`
                });
                country_query = `${country_query.substring(0, country_query.length-1)}] `;
                search_arr_query += country_query;
            } 
            if(types_arr.length && counties_arr.length){
                search_arr_query += ' OR ';
            }
            if(types_arr.length){
                let type_query = ' videos.types && ARRAY['
                types_arr.forEach(type => {
                    type_query += `'${type}',`
                });
                type_query = `${type_query.substring(0, type_query.length-1)}] `;
                search_arr_query += type_query;
            }
            search_arr_query += ' OR videos.user_id = follows.user_id THEN 1 ELSE 2 END ASC ';
        }
        else{
            search_arr_query += ' WHEN videos.user_id = follows.user_id THEN 1 ELSE 2 END ASC ';
        }

        search_arr_query += ', active DESC';

        if(search.trim() != ''){
            search_query = ` AND ( users.username LIKE '%${search}%' OR 
            videos.types && (SELECT ARRAY[code] FROM job_categories WHERE EXISTS (SELECT 1 FROM UNNEST(titles) AS title WHERE title LIKE '%${search}%'))::TEXT[] )`;
        }

        var data = JSON.parse('{}');

        if(req.params.token == "Guest"){
            data.user = JSON.parse(`{"id": 0, "index": 0, "username": "Guest", "email": "", "token": "", "employment": "", "permission": 0, "premium": false, "resume": false}`);
            data.videos = JSON.parse(`[]`);
            data.followers = JSON.parse(`[]`);
            data.followings = JSON.parse(`[]`);
            data.likes = JSON.parse(`[]`);
            data.views = JSON.parse(`[]`);
        }else{
            await pool.query(`SELECT id, index, username, email, token, employment, permission, premium, resume FROM users WHERE token='${req.params.token}'`)
            .then(users =>{
                if(users.rows.length){
                    data.user = users.rows[0];
                }
            });

            await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.name, users.token, videos.description, videos.publish_date, videos.end_date, videos.countries, videos.types, videos.is_active, videos.confirm,
                (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
                (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
                (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
                (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
                FROM videos INNER JOIN users ON videos.user_id = users.id 
                WHERE users.token = '${req.params.token}'`)
            .then(videos =>{
                data.videos = videos.rows;
            });

            await pool.query(`SELECT users.id, (SELECT username FROM users WHERE id = follows.follower_id)::TEXT username, follows.follower_id as follow, users.index  
                FROM follows INNER JOIN users ON follows.user_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(followers =>{
                data.followers = followers.rows;
            });

            await pool.query(`SELECT  users.id, (SELECT username FROM users WHERE id = follows.user_id)::TEXT username, follows.user_id as follow, users.index  
                FROM follows INNER JOIN users ON follows.follower_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(followings =>{
                data.followings = followings.rows;
            });

            await pool.query(`SELECT likes.id, likes.video_id as video 
                FROM likes INNER JOIN users ON likes.user_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(likes =>{
                data.likes = likes.rows;
            });

            await pool.query(`SELECT views.id, views.video_id as video 
                FROM views INNER JOIN users ON views.user_id = users.id
                WHERE users.token ='${req.params.token}'`)
            .then(views =>{
                data.views = views.rows;
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
        
        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.name, users.token, videos.countries, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id 
            INNER JOIN follows ON users.id = follows.follower_id 
            WHERE videos.index = 0 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
             ${search_arr_query} `)
        .then(job_seekers =>{
            data.job_seekers = job_seekers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.name, users.token, videos.description, videos.publish_date, videos.end_date, videos.countries, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id  
            INNER JOIN follows ON users.id = follows.follower_id 
            WHERE videos.index = 1 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
             ${search_arr_query} `)
        .then(vacancies =>{
            data.vacancies = vacancies.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.name, users.token, videos.countries, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id  
            INNER JOIN follows ON users.id = follows.follower_id 
            WHERE videos.index = 2 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
             ${search_arr_query} `)
        .then(freelancers =>{
            data.freelancers = freelancers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.email, users.employment, videos.name, users.token, videos.countries, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id  
            INNER JOIN follows ON users.id = follows.follower_id 
            WHERE videos.index = 3 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
             ${search_arr_query} `)
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
        const check = await pool.query(`SELECT index, username, password, employment, confirm FROM users WHERE email = '${req.body.email}'`);
        if (!check.rows.length) {
            res.json({"name": "successful", "code": "0"});
            await pool.query(
                `INSERT INTO users (index, username, password, email, token, employment, permission) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
                [req.body.index, req.body.user, generateMd5(`SET_USER_DATA_${req.body.password}`), req.body.email, req.body.token, req.body.employment, parseInt(req.body.index) == 1 ? 3 : 1]
            );
            sendMail = true;
        } else {
            if(
                check.rows[0].index == parseInt(req.body.index)
                && check.rows[0].username == req.body.user
                && check.rows[0].password == generateMd5(`SET_USER_DATA_${req.body.password}`)
                && check.rows[0].employment == req.body.employment 
                && !check.rows[0].confirm
            ){
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

app.post('/user-update', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET username='${req.body.user}' WHERE token='${req.body.token}';`)
        .then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/user-confirm', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET confirm = TRUE WHERE password='${req.body.password}' AND email='${req.body.email}';`)
        .then(() => {
            fs.mkdirSync(`/data-files/${req.body.path}/`);
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
        await pool.query(`DELETE FROM videos WHERE id = $1`, [req.body.id])
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

app.post('/user-follow', async(req, res) => {
    try {
        await pool.query(
            `INSERT INTO follows (follower_id, user_id) VALUES ($1, $2);`,
            [req.body.follower, req.body.user,]
        ).then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/user-unfollow', async(req, res) => {
    try {
        await pool.query(`DELETE FROM follows WHERE follower_id = $1 AND user_id = $2`,
            [req.body.follower, req.body.user,]
        ).then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/video-view', async(req, res) => {
    try {
        await pool.query(
            `INSERT INTO views (video_id, user_id) VALUES ($1, $2);`,
            [req.body.video, req.body.user,]
        ).then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/video-like', async(req, res) => {
    try {
        await pool.query(
            `INSERT INTO likes (video_id, user_id) VALUES ($1, $2);`,
            [req.body.video, req.body.user,]
        ).then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/video-dislike', async(req, res) => {
    try {
        await pool.query(`DELETE FROM likes WHERE video_id = $1 AND user_id = $2`,
            [req.body.video, req.body.user,]
        ).then(() => {
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