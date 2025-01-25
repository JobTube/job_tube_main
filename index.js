const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extend: true }));

const pool = require('./connection');
// const sendConfirmationCode = require('./send_confirmation_code');
const generateMd5 = require('./generate_code');
const generate_resume = require('./generate_resume');
const generate_content_ai = require('./generate_content_ai');
const generate_questions_ai = require('./generate_questions_ai');
const upload_profile = require('./upload_profile');
const upload_record = require('./upload_record');
const upload_resume = require('./upload_resume');

app.use(cors());

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
            search_arr_query += ' THEN 1 ELSE 2 END DESC ';
        }
        else{
            search_arr_query += ' ELSE 1 END DESC ';
        }

        search_arr_query += ', active DESC';

        if(search.trim() != ''){
            search_query = ` AND ( users.username ILIKE '%${search.trim()}%' OR 
            videos.types && (SELECT ARRAY[code] FROM job_categories WHERE EXISTS (SELECT 1 FROM UNNEST(titles) AS title WHERE title ILIKE '%${search.trim().toLowerCase()}%') LIMIT 1)::TEXT[] ) `;
        }

        var data = JSON.parse('{}');

        if(req.params.token == "Guest"){
            data.user = JSON.parse(`{"id": 0, "index": 0, "username": "Guest", "phone": "", "token": "", "employment": "", "email": "", "address": "", "permission": 0, "premium": false, "resume": false}`);
            data.videos = JSON.parse(`[]`);
            data.followers = JSON.parse(`[]`);
            data.followings = JSON.parse(`[]`);
            data.likes = JSON.parse(`[]`);
            data.views = JSON.parse(`[]`);
        }else{
            await pool.query(`SELECT id, index, username, phone, token, employment, email, address, permission, premium, resume FROM users WHERE token='${req.params.token}'`)
            .then(users =>{
                if(users.rows.length){
                    data.user = users.rows[0];
                    search_arr_query.replace('ELSE 1', `WHEN EXISTS (SELECT 1 FROM follows WHERE user_id = users.id AND follower_id = ${users.rows[0].id}) THEN 1 ELSE 2`);
                }
            });

            await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.description, videos.publish_date, videos.end_date, videos.countries, videos.types, videos.is_active, videos.confirm,
                (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
                (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
                (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
                (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
                FROM videos INNER JOIN users ON videos.user_id = users.id 
                WHERE users.token = '${req.params.token}'`)
            .then(videos =>{
                data.videos = videos.rows;
            });

            await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.countries, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active
            FROM videos INNER JOIN users ON videos.user_id = users.id 
            WHERE users.id = ANY(SELECT follows.follower_id as id FROM follows INNER JOIN users ON follows.user_id = users.id WHERE users.token ='${req.params.token}') 
            AND 
            videos.is_active=TRUE 
            AND videos.confirm=TRUE`)
            .then(follower_videos =>{
                data.followers = follower_videos.rows;
            });

            await pool.query(`SELECT id as user_id, username, phone, email, address, resume, employment, token FROM users 
            WHERE users.id = ANY(SELECT follows.follower_id as id FROM follows INNER JOIN users ON follows.user_id = users.id WHERE users.token ='${req.params.token}') 
            AND (SELECT COUNT(*) FROM videos WHERE user_id = users.id)::int = 0`)
            .then(follower_users =>{
                data.followers = data.followers.concat(follower_users.rows);
            });

            await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.countries, videos.types, 
                (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
                (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
                (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
                (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active
                FROM videos INNER JOIN users ON videos.user_id = users.id 
                WHERE users.id = ANY(SELECT follows.user_id as id FROM follows INNER JOIN users ON follows.follower_id = users.id WHERE users.token ='${req.params.token}') 
                AND 
                videos.is_active=TRUE 
                AND videos.confirm=TRUE`)
            .then(followings_videos =>{
                data.followings = followings_videos.rows;
            });
            
            await pool.query(`SELECT id as user_id, username, phone, email, address, resume, employment, token FROM users 
            WHERE users.id = ANY(SELECT follows.user_id as id FROM follows INNER JOIN users ON follows.follower_id = users.id WHERE users.token ='${req.params.token}') 
            AND (SELECT COUNT(*) FROM videos WHERE user_id = users.id)::int = 0`)
            .then(following_users =>{
                data.followings = data.followings.concat(following_users.rows);
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

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.countries, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id 
            WHERE videos.index = 0 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
            ${search_arr_query} `)
        .then(job_seekers =>{
            data.job_seekers = job_seekers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.description, videos.publish_date, videos.end_date, videos.countries, videos.types, 
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id 
            WHERE videos.index = 1 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
            ${search_arr_query} `)
        .then(vacancies =>{
            data.vacancies = vacancies.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.countries, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id 
            WHERE videos.index = 2 
            AND videos.is_active=TRUE 
            AND videos.confirm=TRUE 
            ${search_query}
            ${search_arr_query} `)
        .then(freelancers =>{
            data.freelancers = freelancers.rows;
        });

        await pool.query(`SELECT videos.id, videos.index, videos.user_id, users.username, users.phone, users.email, users.address, users.resume, users.employment, videos.name, users.token, videos.countries, videos.types,
            (SELECT COUNT(id) FROM likes WHERE video_id = videos.id )::int as likes, 
            (SELECT COUNT(id) FROM views WHERE video_id = videos.id )::int as views, 
            (SELECT COUNT(*) FROM likes WHERE video_id = videos.id) + 
            (SELECT COUNT(*) FROM views WHERE video_id = videos.id) AS active 
            FROM videos INNER JOIN users ON videos.user_id = users.id 
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
        // let sendMessage = false;
        const check = await pool.query(`SELECT index, username, password, employment, email, address, confirm FROM users WHERE phone = '${req.body.phone}'`);
        if (!check.rows.length) {
            res.json({"name": "successful", "code": "0"});
            await pool.query(
                `INSERT INTO users (index, username, phone, token, password, email, address, employment, permission) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
                [req.body.index, req.body.user, req.body.phone, req.body.token, generateMd5(`SET_USER_DATA_${req.body.password}`), req.body.email, req.body.address, req.body.employment, parseInt(req.body.index) == 1 ? 3 : 1]
            );
            sendMessage = true;
        } else {
            if(
                check.rows[0].index == parseInt(req.body.index)
                && check.rows[0].username == req.body.user
                && check.rows[0].password == generateMd5(`SET_USER_DATA_${req.body.password}`)
                && check.rows[0].employment == req.body.employment 
                && check.rows[0].email == req.body.email 
                && check.rows[0].address == req.body.address 
                && !check.rows[0].confirm
            ){
                res.json({"name": "successful", "code": "1"});
                sendMessage = true;
            }else{
                res.json({"name": "successful", "code": "2"});
            }
        }
        /* Send confirm code: req.body.code */
        // if(sendMessage) sendConfirmationCode("e1000.tavakkulov@gmail.com", req.body.code).catch(console.error);
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-login', async(req, res) => {
    try {
        const check = await pool.query(`SELECT username, token FROM users WHERE password='${generateMd5(`SET_USER_DATA_${req.body.password}`)}' AND phone='${req.body.phone}' AND confirm = TRUE;`);
        if (check.rows.length) {
            res.json({"name": "successful", "user": check.rows[0].username, "code": check.rows[0].token});
        } else {
            res.json({"name": "inaccessible", "code": "3"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.post('/get-user', async(req, res) => {
    try {
        const check = await pool.query(`SELECT username, token FROM users WHERE phone='${req.body.phone}';`);
        if (check.rows.length) {
            /* Send confirm code: req.body.code */
            res.json({"name": "successful", "user": check.rows[0].username, "code": check.rows[0].token});
        } else {
            res.json({"name": "inaccessible", "code": "3"});
        }
    }catch (err) {
        res.json(err);
    }
});

app.post('/user-update', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET username='${req.body.user}', email='${req.body.email}', address='${req.body.address}' WHERE token='${req.body.token}';`)
        .then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/change-pass', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET password='${generateMd5(`SET_USER_DATA_${req.body.password}`)}' WHERE token='${req.body.token}';`)
        .then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/user-confirm', async(req, res) => {
    try {
        await pool.query(`UPDATE users SET confirm = TRUE WHERE password='${req.body.password}' AND phone='${req.body.phone}';`)
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

app.post('/generate-resume', async(req, res) => {
    try{
        if(req.body.description == ''){
            res.json({"name": "inaccessible", "code": "1"});
        }else{
            const generatedContent = await generate_content_ai(req.body.description, req.body.title);
            const json = JSON.parse(generatedContent);
            if (!fs.existsSync(`/data-files/${req.body.path}/`)) fs.mkdirSync(`/data-files/${req.body.path}/`);
            await generate_resume[parseInt(req.body.index)]
                (req.body.user, req.body.title, req.body.path, req.body.phone, req.body.email, req.body.address, json);
            await pool.query(`UPDATE users SET resume = TRUE WHERE token='${req.body.path}';`);
    
            let questions = [];
            if(req.body.title != ''){
                const generate_questions = await generate_questions_ai(json.headers.head_question, req.body.title);
                const json_question = JSON.parse(generate_questions);
                questions = [json_question.header];
                json_question.questions_answers.forEach((item, index) => {
                    questions.push(`${index+1}.   ${item.question}\n•   ${item.answer}\n\n`);
                });
            }
    
            res.json({"name": "successful", "code": "0", "data": questions });
        }
    }catch (err) {
        res.json({"name": "inaccessible", "code": "3"});
    }
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

app.post('/admin-login', async(req, res) => {
    var data = JSON.parse('{}');
    const check = await pool.query(`SELECT index, username FROM supervisors WHERE password='${generateMd5(`SET_ADMIN_DATA_${req.body.password}`)}'`);
    console.log(`pass: ${generateMd5(`SET_ADMIN_DATA_${req.body.password}`)}`)
    if (check.rows.length) {
        data.name = "successful";
        data.supervisor = check.rows[0];

        await pool.query(`SELECT EXTRACT(MONTH FROM date) AS month, 
            (SELECT COUNT(*) FROM likes WHERE date >= NOW() - INTERVAL '12 months') +
            (SELECT COUNT(*) FROM follows WHERE date >= NOW() - INTERVAL '12 months') + 
            (SELECT COUNT(*) FROM views WHERE date >= NOW() - INTERVAL '12 months') AS active 
            FROM views WHERE date >= NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month`)
        .then(active => {
            data.active = active.rows;
        });

        await pool.query(`SELECT id, index, username, phone, token, employment, email, address, premium, resume FROM users WHERE confirm = TRUE ORDER BY id DESC;`)
        .then(users =>{
            data.users = users.rows;
        });
    
        await pool.query(`SELECT videos.id, videos.index, videos.name, videos.description, videos.user_id, videos.countries, videos.types, videos.publish_date, videos.end_date, users.token 
            FROM videos INNER JOIN users ON videos.user_id = users.id WHERE videos.confirm = FALSE ORDER BY videos.id DESC;`)
        .then(video =>{
            data.video = video.rows;
        });
    
        await pool.query(`SELECT videos.id, videos.index, videos.name, videos.description, videos.user_id, videos.countries, videos.types, videos.publish_date, videos.end_date, users.token 
            FROM videos INNER JOIN users ON videos.user_id = users.id WHERE videos.confirm = TRUE ORDER BY videos.id DESC;`)
        .then(videos =>{
            data.videos = videos.rows;
        });
    } else {
        data.name = "inaccessible";
    }

    res.json(data);
});

app.post('/admin-confirm-video', async(req, res) => {
    try {
        await pool.query(`UPDATE videos SET confirm = TRUE WHERE id=${req.body.id};`)
        .then(() => {
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/admin-delete-video', async(req, res) => {
    try {
        await pool.query(`DELETE FROM videos WHERE id=$1`, [req.body.id])
        .then(() => {
            fs.unlinkSync(`/data-files/${req.body.path}`);
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

app.post('/admin-delete-user', async(req, res) => {
    try {
        await pool.query(`DELETE FROM videos WHERE user_id=$1`, [req.body.id]);
        await pool.query(`DELETE FROM follows WHERE follower_id=$1 OR user_id=$1`, [req.body.id]);
        await pool.query(`DELETE FROM likes WHERE user_id=$1`, [req.body.id]);
        await pool.query(`DELETE FROM views WHERE user_id=$1`, [req.body.id]);

        await pool.query(`DELETE FROM users WHERE id=$1`, [req.body.id])
        .then(() => {
            if(fs.existsSync(`/data-files/${req.body.path}/`)){
                if(fs.readdirSync(`/data-files/${req.body.path}/`).length){
                    fs.readdirSync(`/data-files/${req.body.path}/`).forEach(file=>{
                        fs.unlinkSync(`/data-files/${req.body.path}/${file}`);
                    });
                }
                fs.rmdirSync(`/data-files/${req.body.path}`);
            }
            res.json({"name": "successful", "code": "0"});
        });
    } catch (err) {
        res.json(err);
    }
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
/*
    git add .
    git commit -m "restore JobTube API"
    git push origin master
    
*/