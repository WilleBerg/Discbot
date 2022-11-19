

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://carlwilliamberg:<password>@cluster0.2medxb5.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});


// These functions should be called with message.author as the argument
// from index.js

function checkUser(user) {
    // Check if user is registered
}

function registerUser(user) {
    // Create user obj
    // Save user obj
    newUser = createUserObject(user);


    // Maybe stringify the user obj and save it to a file using python?
    // Or just try and save using js
}

function createUserObject(user) {
    // Create user obj
    // return user obj

    // All of this depends on how discord handles users
    let newUser = {
        "_id": user.id,
        "username": user.username,
        "hasAllowedAccess": false,
        "hasSessionKey" : false,
        "sessionKey": null
    }

    return newUser;
}

function hasSessionKey(user) {
    // Check if user has session key
}

function createSessionKey(user) {
    // Create session key
    // Save session key to user
}


  