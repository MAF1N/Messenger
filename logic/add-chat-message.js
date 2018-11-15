function addChatMessage(db, nickname1, nickname2, message, callback){
    const collection = db.collection('chats');
    collection.find().toArray(
        function(err, docs) {
            var result = docs.filter(x => x.users.find(u => u.nickname == nickname1))
                .filter(x => x.users.find(u => u.nickname == nickname2));
            if (result && result.length == 0){
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
                            messages: [message]
                        }, function (err, res) {
                            console.info(res);
                            if (res && res.insertedCount == 1){
                                console.log("Created new chat and added message");
                            }
                            result = message;
                            callback(result);
                        });
                    });
                });   
            } else {
                collection.update({_id: result[0]._id}, {$push: {messages: message}}, (err, item) =>{
                    console.info(`[${ formatDate(new Date())}] Updating collection`);
                    if (err){
                        console.error(err);
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