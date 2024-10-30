const { Client } = require('pg');

const client = new Client({
    user: 'job_tube_p2m7_user',
    password: 'HGrQ76WcxAcAsUDuq1trpk3k6FrRVCcg',
    host: 'csej53dsvqrc73f4nkn0-a.oregon-postgres.render.com',
    port: 5432,
    database: 'job_tube_p2m7',
    ssl: true,
});

module.exports = client;