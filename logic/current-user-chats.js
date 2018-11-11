function getCurrentUserChats(db, nickname1, callback){
    const collection = db.collection('chats');
    collection.find().toArray(
        function(err, docs) {
            if (err){
                console.log("getCurrentUserChats");
                console.log(err);
            } else {
                var result = docs.filter(x => x.users.find(u => u.nickname == nickname1))
                    .map((value) => {
                        return {
                            users: value.users.map((value)=>{
                                return {
                                    _id: value._id,
                                    nickname: value.nickname,
                                    image: value.image ? value.image : 0
                                };
                            }), 
                            lastMessage: value.messages.length ? value.messages[value.messages.length - 1] : "",
                            title: value.title
                        }
                    });
                callback(result);
            }
        }
    )
}

module.exports = getCurrentUserChats;