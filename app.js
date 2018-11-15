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
var db;
client.connect(function(err) {
    db = client.db(dbName);
    app.listen(port, () => console.log(`Messenger listening on port ${port}!`));
});

var createNicknameIndex = require('./logic/create-nickname-index');
var createUser = require('./logic/user');
var tokenchecker = require('./logic/tokenchecker');
var findByNickName = require('./logic/find-by-nickname');
var getChat = require('./logic/get-chat');
var getCurrentUserChats = require('./logic/current-user-chats');
var addChatMessage = require('./logic/add-chat-message');
var formatDate = require('./logic/format-date');
app.use(jsonParser);

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.post('/register', (req, res) =>{
    try {
        console.info(`[${formatDate(new Date())}] Registering new user`);
        const user = createUser(req.body);
        if (user == null){
            console.info(`[${formatDate(new Date())}] User was not created`);
            return;
        }
        db.collection('users').find(user).limit(1).toArray((err, docs) => {
            console.info(`[${ formatDate(new Date())}] Searching for exact user`);
            if(!docs && err!=null || err == null && docs.length == 0){
                db.collection('users').insertOne(user, function(err, r) {
                    if(err && r.insertedCount == 1){
                        console.log("Successfully added user");
                    }
                });
            } else if (docs.length > 0){
                console.info(`[${ formatDate(new Date())}] User already exists`);
                client.close();
                res.status(200).send("User already exists");
            } else if (err){
                console.log(err);
            }
        });
        res.status(200).send();
    }
    catch(ex){
        console.error(`[${ formatDate(new Date())}] Register issue: ${ex}`);
        res.status(400).send(ex);
    }
});

app.post('/login', (req, res) => {
    console.info(`[${ formatDate(new Date())}] Login`);
    const user = createUser(req.body);
    db.collection('users').find(user).limit(1).toArray(function(err, docs) {         
        if(err){
            console.error(err);
        }else {
            if (docs.length == 1){
                console.info(`[${ formatDate(new Date())}] User was found`);
                res.status(200).send(jwt.sign(user, "supersecret"));
            } else {
                console.info(`[${ formatDate(new Date())}] User was not found`);
                res.status(400).send();
            }
        }
    });
});

app.use('/user/info', tokenchecker);
app.get('/user/info',(req, res) => {
    console.info(`[${ formatDate(new Date())}] User info called`);
    let searchQuery = jwt.verify(req.get('token'), "supersecret").nickname;
    findByNickName(db, searchQuery, function(docs) {
        if (docs && docs.length > 0){
            let retVal = docs.find(x => x.nickname == searchQuery);
            console.info(`[${ formatDate(new Date())}] returning user info: ${retVal}`);
            res.status(200).json(retVal).send();
        } else {
            console.info(`[${ formatDate(new Date())}] There is no such a user`);
            res.status(404).send("Noone with such nickname was found.");
        }            
    });    
})

app.use('/users/search', tokenchecker);
app.get('/users/search', (req, res) => {
    const searchQuery = req.query.query;
    console.info("Searching user with "+ searchQuery);
    let decoded = jwt.verify(req.get('token'), "supersecret").nickname;
    console.info(`[${ formatDate(new Date())}] Requested by ${decoded}`);
    findByNickName(db, searchQuery, function(docs) {
        if (docs && docs.length > 0){
            docs = docs.filter(x => x.nickname.toLowerCase() != decoded.toLowerCase());
            res.status(200).json(docs).send();
        } else {
            console.info(`[${ formatDate(new Date())}] [user/search] There is noone with such nickname `);
            res.status(404).send("Noone with such nickname was found.");
        }        
    });    
});

app.use('/chat', tokenchecker);
app.post('/chat', function(req, res){
    const decoded = jwt.verify(req.get('token'), "supersecret");
    console.info(`[${ formatDate(new Date())}] Chat`);
    console.info(`[${ formatDate(new Date())}] Requested by ${decoded.nickname} with ${req.body.nickname}`);
    getChat(db, decoded.nickname, req.body.nickname, req.body.title, (result) => {
        res.json(result[0]).send();
         
    });
});

app.use('/chats', tokenchecker);
app.get('/chats', function(req, res) {
    const decoded = jwt.verify(req.get('token'), "supersecret");
    console.info(`[${ formatDate(new Date())}] Chats`);
    console.info(`[${ formatDate(new Date())}] Requsted by ${decoded.nickname}`);
    getCurrentUserChats(db, decoded.nickname, (result) => {
        res.json(result).send();
         
    });
});

app.use('/send/message', tokenchecker);
app.use('/send/message', function(req, res){
    const decoded = jwt.verify(req.get('token'), "supersecret");
    console.info(`[${ formatDate(new Date())}] Sending a message by ${decoded.nickname} to ${req.body.nickname}`);
    addChatMessage(db, decoded.nickname, req.body.nickname, req.body.message, (result) => {
        if (result){
            if(clients[req.body.nickname]){
                console.info(`[${ formatDate(new Date())}] The client with such nickname is currently online`);
                console.info(`[${ formatDate(new Date())}] Sending a message via WS`);
                console.info(`[${ formatDate(new Date())}] Client: ${req.body.nickname}.`);
                console.info(`[${ formatDate(new Date())}] Message: ${result}`);
                clients[req.body.nickname].send(JSON.stringify(result));
            }
            res.status(200).json(result).send();
        }
         
    });
});

app.ws('/chat-ws', function(ws, req) {

    ws.on('message', function(msg) {
        console.info(`[${ formatDate(new Date())}] WS: Authenticated`);
        token = JSON.parse(msg).token;
        if (token) {
            console.info(`[${ formatDate(new Date())}] WS: token: ${token}`);
            let decoded = jwt.decode(token);
            clients[decoded.nickname] = ws;
        }
    });

    ws.on('close', function(){ 
        console.info(`[${ formatDate(new Date())}] WS: Closed`);
        // for (const key in clients) {
        //     if (clients.hasOwnProperty(key)) {
        //         const element = clients[key];
        //         if (ws == element){
        //             delete clients[key];
        //         }
        //     }
        // }
    });
    console.log('socket');
});

process.on('uncaughtException', (error) =>{
    console.error(`[${ formatDate(new Date())}] UncaughtException: ${error}`);
    app.removeAllListeners();
});