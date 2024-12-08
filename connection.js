const { Pool } = require('pg');

const pool = new Pool({
    user: 'job_tube_wjar_user',
    password: '72TmmtvoKHVhGBl8UqptI66qtIwGU4f1',
    host: 'dpg-ct9kkiq3esus73e984kg-a.oregon-postgres.render.com',
    port: 5432,
    database: 'job_tube_wjar',
    ssl: true,
});

module.exports = pool;