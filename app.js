const express = require('express');
const app = express();
const port = 3000;
const expressWs = require('express-ws')(app);
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const MongoClient = require('mongodb').MongoClient;
const mongodbConnectionString = 'mongodb+srv://Nekit:Ytrbn@clouddevelopmentmessenger-y3bqw.mongodb.net/test?retryWrites=true';
//const assert = require('assert');
const dbName = 'CloudDevelopmentMessenger';
const client = MongoClient(mongodbConnectionString);
const jwt = require('jsonwebtoken');

var clients = {};

var createNicknameIndex = require('./logic/create-nickname-index');
var createUser = require('./logic/user');
var tokenchecker = require('./logic/tokenchecker');
var findByNickName = require('./logic/find-by-nickname');
var getChat = require('./logic/get-chat');
var getCurrentUserChats = require('./logic/current-user-chats');
var addChatMessage = require('./logic/add-chat-message');

app.use(jsonParser);

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

//app.get('/', (req, res) => res.send('Hello World!'));

app.post('/register', (req, res) =>{
    try {
        client.connect(function(err) {
            if (!err){
                console.log("Connected successfully to server");
                const db = client.db(dbName);
                const user = createUser(req.body);
                if (user == null){
                    console.log("User wasn`t created.");
                    return;
                }
                db.collection('users').find(user).limit(1).toArray((err, docs) => {
                    if(!docs && err!=null || err == null && docs.length == 0){
                        db.collection('users').insertOne(user, function(err, r) {
                            if(err && r.insertedCount == 1){
                                console.log("Successfully added user");
                            }
                        });
                    } else if (docs.length > 0){
                        console.log("user already exists");
                        console.log(docs);
                        client.close();
                        res.status(200).send("User already exists");
                    } else if (err){
                        console.log(err);
                    }
    
                    db.close();
                });
            }
        });
        res.status(200).send();
    }
    catch(ex){
        res.status(400).send(ex);
    }
});

app.post('/login', (req, res) => {
    const user = createUser(req.body);
    client.connect(function(err) {
        const db = client.db(dbName);
        db.collection('users').find(user).limit(1).toArray(function(err, docs) {         
            if(err){
                console.log(err);
            }else {
                if (docs.length == 1){
                    res.status(200).send(jwt.sign(user, "supersecret"));
                } else {
                    res.status(400).send();
                }
            }
            db.close();
        });
    });
    
});

app.use('/user/info', tokenchecker);
app.get('/user/info',(req, res) => {
    let searchQuery = jwt.verify(req.get('token'), "supersecret").nickname;
    client.connect(function(err) {
        const db = client.db(dbName);
        findByNickName(db, searchQuery, function(docs) {
            if (docs && docs.length > 0){
                let retVal = docs.find(x => x.nickname == searchQuery);
                res.status(200).json(retVal).send();
            } else {
                res.status(200).send("Noone with such nickname was found.");
            }
            db.close();          
        });    
    });
})

app.use('/users/search', tokenchecker);
app.get('/users/search', (req, res) => {
    const searchQuery = req.query.query;
    console.log("Searching user with "+ searchQuery);
    client.connect(function(err) {
        const db = client.db(dbName);
        let decoded = jwt.verify(req.get('token'), "supersecret").nickname;
        findByNickName(db, searchQuery, function(docs) {
            if (docs && docs.length > 0){
                docs = docs.filter(x => x.nickname.toLowerCase() != decoded.toLowerCase());
                res.status(200).json(docs).send();
            } else {
                res.status(200).send("Noone with such nickname was found.");
            }   
            db.close();       
        });    
    });
});

app.use('/chat', tokenchecker);
app.post('/chat', function(req, res){
    client.connect((err)=> {
        const db = client.db(dbName);
        const decoded = jwt.verify(req.get('token'), "supersecret");
        
        getChat(db, decoded.nickname, req.body.nickname, req.body.title, (result) => {
            res.json(result[0]).send();
            db.close();
        });
    });
});

app.use('/chats', tokenchecker);
app.get('/chats', function(req, res) {
    client.connect((err)=> {
        const db = client.db(dbName);
        const decoded = jwt.verify(req.get('token'), "supersecret");
        
        getCurrentUserChats(db, decoded.nickname, (result) => {
            res.json(result).send();
            db.close();
        });
    });
});

app.use('/send/message', tokenchecker);
app.use('/send/message', function(req, res){
    client.connect((err)=> {
        const db = client.db(dbName);
        const decoded = jwt.verify(req.get('token'), "supersecret");

        addChatMessage(db, decoded.nickname, req.body.nickname, req.body.message, (result) => {
            if (result){
                clients[req.body.nickname].send(result);
                res.json(result).send();
            }
            db.close();
        });
    });
});

app.ws('/chat-ws', function(ws, req) {
    ws.on('authenticate', function(msg) {
        token = JSON.parse(msg).token;
        let decoded = jwt.decode(token);
        clients[decoded.nickname] = ws;
    });

    ws.on('close', function(){
        for (const key in clients) {
            if (clients.hasOwnProperty(key)) {
                const element = clients[key];
                if (ws == element){
                    delete clients[key];
                }
            }
        }
    });
    console.log('socket');
});

app.listen(port, () => console.log(`Messenger listening on port ${port}!`));