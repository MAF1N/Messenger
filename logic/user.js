var md5 = require('js-md5');

function createUser(body){
    return { 
        nickname: body.nickname,
        password: md5(body.password)
    }
}
module.exports = createUser;