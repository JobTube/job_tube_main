const crypto = require('crypto');

function generateMd5(input) {
    const md5 = crypto.createHash('md5');
    md5.update(input, 'utf8');
    const hash = md5.digest('hex');
    return hash;
}

module.exports = generateMd5;