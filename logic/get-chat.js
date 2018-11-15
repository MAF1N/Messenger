function getChat(db, nickname1, nickname2, newTitle, callback){
    const collection = db.collection('chats');
    collection.find().toArray(
        function(err, docs) {
            var result = docs.filter(x => x.users.find(u => u.nickname == nickname1))
                .filter(x => x.users.find(u => u.nickname == nickname2));
            if (result && result.length == 0){
                db.collection('users').findOne({nickname: nickname1}, function(err1, user1){
                    if (err1){
                        console.info("error was found while searching fisrt user.");
                    } 
                    if (user1){
                        db.collection('users').findOne({nickname: nickname2}, function(err2, user2){
                            if (err2){
                                console.info("error was found while searching second user.");
                            }
                            if (user2){
                                collection.insertOne({
                                    users: [user1, user2],
                                    messages: []
                                }, function (err, res) {
                                    console.info(res);
                                    if (res && res.insertedCount == 1){
                                        console.log("Created new chat")
                                        result = fixChat(res.ops);
                                    }
                                    result[0].title = user2.nickname;
                                    callback(result);
                                });
                            }
                            else {
                                console.info("user2 is undefined");
                            }
                        });
                    }
                    else {
                        console.info("user1 is undefined");
                    }
                    
                });   
            } else {
                console.info('found results: ');
                console.info(result);
                result = fixChat(result);
                result[0].title = user2.nickname;
                callback(result);
            }
        }
    )
}
function fixChat(val){
    if (!val){
        return;
    }
    var result = [...val];
    result.forEach(chat => {
        chat.users = chat.users.map(u => {
            return {
                _id: u._id,
                nickname: u.nickname,
                image: u.image ? u.image : 0
            }; 
        });
    });
    return result;
}
module.exports = getChat;