function addChatMessage(db, nickname1, nickname2, message, callback){
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
                            messages: [message],
                            title: user2.nickname ? user2.nickname : "Default Chat Name"
                        }, function (res) {
                            if (res.insertedCount == 1){
                                console.log("Created new chat")
                            }
                            result = message;
                            callback(result);
                        });
                    });
                });   
            } else {
                let updValue = {
                    _id: result[0]._id,
                    users: result[0].users,
                    messages: [...result[0].messages].push(message),
                    title: result[0].title
                };
                collection.updateOne({_id: result[0]._id}, updValue, (err, item) =>{
                    if (err){
                        console.log(err);
                        callback(null);
                        return;
                    }
                    if (item){
                        callback(message);
                    }
                });
            }
        }
    )
}

module.exports = addChatMessage;