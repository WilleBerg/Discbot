const { MongoClient, ServerApiVersion } = require("mongodb");
var { mongoUsername, mongoPassword, mongoUrl } = require("./config.json");
var monogDBuri = `mongodb+srv://${mongoUsername}:${mongoPassword}@${mongoUrl}/?retryWrites=true&w=majority`;
console.log(monogDBuri);
const client = new MongoClient(monogDBuri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function connect() {
    try {
        await client.connect();
        console.log("Connected correctly to server");
    } catch (err) {
        console.log(err.stack);
    }
}
connect();

async function createUserCollection() {
    try {
        const db = client.db("Discbot");
        const collection = db.collection("users");
        await collection.insertOne({
            _id: "123456789",
            username: "firstTestUser",
            hasAllowedAccess: false,
            hasSessionKey: false,
            sessionKey: null,
        });
        console.log("Created collection");
    } catch (err) {
        console.log(err.stack);
    }
}
createUserCollection();

async function close() {
    try {
        await client.close();
        console.log("Closed connection");
    } catch (err) {
        console.log(err.stack);
    }
}

close();
console.log("Setup complete");
