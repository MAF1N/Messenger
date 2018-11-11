function createNicknameIndex(db, callback){
    const collection = db.collection('users');
    collection.createIndex(
        { nickname : "text" }, function(err, result) {
        console.log(result);
        callback(result);
    });
}
module.exports = createNicknameIndex;