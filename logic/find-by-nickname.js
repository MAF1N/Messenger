function findByNickname(db, query, callback) {
    const collection = db.collection('users');
    collection.find().toArray(function(err, docs) {
        let result = docs.filter(x=> x.nickname.toLowerCase().includes(query.toLowerCase()));
        console.log("Found the following records");
        console.log(result);
        callback(result);
    });
}
module.exports = findByNickname;