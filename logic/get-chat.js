function getChat(db, nickname1, nickname2, newTitle, callback){
    const collection = db.collection('chats');
    collection.find().toArray(
        function(err, docs) {
            var result = docs.filter(x => x.users.find(u => u.nickname == nickname1))
                .filter(x => x.users.find(u => u.nickname == nickname2));
            if (!result || result.length == 0){
                db.collection('users').findOne({nickname: nickname1}, function(err1, user1){
                    if (err1){
                        console.log("error was found while searching fisrt user.");
                    } 
                    db.collection('users').findOne({nickname: nickname2}, function(err2, user2){
                        if (err2){
                            console.log("error was found while searching second user.");
                        }
                        collection.insertOne({
                            users: [user1, user2],
                            messages: [],
                            title: newTitle ? newTitle : user2.nickname
                        }, function (res) {
                            if (res.insertedCount == 1){
                                console.log("Created new chat")
                            }
                            result = fixChat(res);
                            callback(result);
                        });
                    });
                });   
            } else {
                result = fixChat(result);
                callback(result);
            }
        }
    )
}
function fixChat(val){
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