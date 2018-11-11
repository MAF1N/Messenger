var jwt = require('jsonwebtoken');
function tokenChecker(req, res, next){
    try{
        console.log("Token: ")
        console.log(req.get('token'));
        const decoded = jwt.verify(req.get('token'), "supersecret");
        next();
    }
    catch(ex){
        console.log(ex);     
    }
}
module.exports = tokenChecker;