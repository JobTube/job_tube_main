const { Pool } = require('pg');

const pool = new Pool({
    user: 'job_tube_rzpe_user',
    password: 'bAlgwePbcXQHP16SjmM3xSEPCiww3waG',
    host: 'dpg-csks5168ii6s73809gig-a.oregon-postgres.render.com',
    port: 5432,
    database: 'job_tube_rzpe',
    ssl: true,
});

module.exports = pool;