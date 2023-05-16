/*
Code in here is not optimized, and is not meant to be. This bot is supposed to be used
by a small group of people.

To omptimize, checkuser should probably return the info of the user if it exists
on the database. This would enable the code to not call the database for each
seperate function, but instead just call it once.

*/

// TODO: Add child check function

const { MongoClient, ServerApiVersion } = require("mongodb");
const { mongoUsername, mongoPassword, mongoUrl } = require("./config.json");
const uri = `mongodb+srv://${mongoUsername}:${mongoPassword}@${mongoUrl}/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
const { PythonShell } = require("python-shell");

const {
    log,
    alwaysLog
} = require('./logging.js');



async function connect() {
    try {
        await client.connect();
        alwaysLog("Connected correctly to database");
        return true;
    } catch (err) {
        alwaysLog("Error connecting to database");
        console.log(err.stack);
        log(err.stack);
    }
}

async function close() {
    try {
        await client.close();
        alwaysLog("Closed connection");
    } catch (err) {
        alwaysLog("Error closing connection to database");
        console.log(err.stack);
        log(err.stack);
    }
}

// These functions should be called with message.author as the argument
// from index.js

async function searchForUser(query, db) {
    // Search for user
    try {
        const resp = await db.collection("users").findOne(query);
        log(typeof resp);
        return resp;
    } catch (err) {
        alwaysLog("Error searching for user");
        log(err.stack);
    }
    // Return user
}

async function checkUser(user) {
    // Check if user is registered
    try {
        const db = client.db("Discbot");
        const collection = db.collection("users");
        log(user.id);
        var query = { _id: user.id };
        const userQueryResp = await searchForUser(query, db);
        log(userQueryResp);
        log(typeof userQueryResp);
        if (userQueryResp == null) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        alwaysLog("Error checking user");
        alwaysLog(error.stack);
        return "error";
    }
}

async function registerUser(user) {
    newUser = createUserObject(user);
    try {
        const db = client.db("Discbot");
        const collection = db.collection("users");
        const resp = await collection.insertOne(newUser);
        log(typeof resp);
        log(JSON.stringify(resp));
        try {
            if (resp["acknowledged"] == true) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            log(error.stack);
            return false;
        }
    } catch (err) {
        alwaysLog("Error registering user");
        alwaysLog(err.stack);
        return false;
    }
}

function createUserObject(user) {
    // Create user obj
    // return user obj

    // All of this depends on how discord handles users
    let newUser = {
        _id: user.id,
        username: user.username,
        hasAllowedAccess: false,
        hasSessionKey: false,
        sessionKey: null,
        lastFMToken: null,
    };

    return newUser;
}

async function hasAllowedAccess(user) {
    try {
        const db = client.db("Discbot");
        query = { _id: user.id };
        var userInfo = await searchForUser(query, db);
        if (userInfo["hasAllowedAccess"] == true) {
            return true;
        } else return false;
    } catch (error) {
        alwaysLog(error.stack);
        return false;
    }
}

async function hasSessionKey(user) {
    try {
        const db = client.db("Discbot");
        query = { _id: user.id };
        var userInfo = await searchForUser(query, db);
        if (userInfo["hasSessionKey"] == true) {
            return true;
        } else return false;
    } catch (error) {
        alwaysLog("Error checking if user has session key");
        alwaysLog(error.stack);
        return false;
    }
}

async function getToken(user) {
    try {
        const db = client.db("Discbot");
        query = { _id: user.id };
        var userInfo = await searchForUser(query, db);
        log(JSON.stringify(userInfo));
        return userInfo["lastFMToken"];
    } catch (error) {
        alwaysLog("Error getting token");
        alwaysLog(error.stack);
        return false;
    }
}

async function runLinkScript() {
    let options = {
        mode: "text",
        pythonOptions: ["-u"], // get print results in real-time
        scriptPath: "./scripts", //If you are having python_test.py script in same folder, then it's optional.
    };
    log("Running get link script");
    const {
        success,
        err = "",
        results,
    } = await new Promise((resolve, reject) => {
        PythonShell.run("createAccessLink.py", options, function (err, result) {
            if (err) reject({ success: false, err });

            // result is an array consisting of messages collected
            //during execution of script.
            resolve({ success: true, results: result });
        });
    });
    log(
        `Results: \nSuccess? ${success} \n Error: ${err} \n Results: ${results}`
    );
    return results;
}

async function userAllowAccess(message) {
    link = "";
    try {
        link = await runLinkScript();
    } catch (error) {
        alwaysLog("Error running link script");
        log(error.stack);
        return false;
    }
    log(link);
    await message.channel.send(
        `Here is your access link: \n\n ${link[1]} \n\n\n` +
            "Please use this link to allow access to your account. \n" +
            "After you have allowed access, type **!setupLastfm** to finish setup."
    );

    try {
        const db = client.db("Discbot");
        var query = { _id: message.author.id };
        var newValues = {
            $set: { hasAllowedAccess: true, lastFMToken: link[0] },
        };
        const resp = await db.collection("users").updateOne(query, newValues);
        log(JSON.stringify(resp));
        if (resp["acknowledged"] == true) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        alwaysLog("Error updating user");
        alwaysLog(error.stack);
        return false;
    }
}

async function runSessionKeyScript(token) {
    let options = {
        mode: "text",
        pythonOptions: ["-u"], // get print results in real-time
        scriptPath: "./scripts", //If you are having python_test.py script in same folder, then it's optional.
        args: [token],
    };

    log("Running session key script");
    const {
        success,
        err = "",
        results,
    } = await new Promise((resolve, reject) => {
        PythonShell.run("pask.py", options, function (err, result) {
            if (err) reject({ success: false, err });
            // result is an array consisting of messages collected
            //during execution of script.
            try {
                if (result === null) {
                    resolve({ success: false, results: "None" });
                }
            } catch (error) {
                alwaysLog(error.stack);
            }
            resolve({ success: true, results: result[0] });
        });
    });
    log("Session key script finished");
    log(
        `Results: \nSuccess? ${success} \n Error: ${err} \n Results: ${results}`
    );
    return results;
}

async function setSessionKey(user) {
    try {
        log("Getting token");
        token = await getToken(user);
        log(`Token for user ${user.username}: ${token}`);
        var sessionKey = await runSessionKeyScript(token);
        if (sessionKey == "None") {
            return false;
        }
        const db = client.db("Discbot");
        var query = { _id: user.id };
        var newValues = { $set: { sessionKey: sessionKey } };
        const resp = await db.collection("users").updateOne(query, newValues);
        log(JSON.stringify(resp));
        if (resp["acknowledged"] == true) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        alwaysLog("Error setting session key");
        alwaysLog(error.stack);
        return false;
    }
}

async function getSessionKey(user) {
    try {
        const db = client.db("Discbot");
        query = { _id: user.id };
        log("Getting session key");
        var userInfo = await searchForUser(query, db);
        log("Got session key");
        log(JSON.stringify(userInfo));
        return userInfo["sessionKey"];
    } catch (error) {
        alwaysLog("Error getting session key");
        alwaysLog(error.stack);
        return false;
    }
}

async function register(message) {
    var userCheck = await checkUser(message.author);
    if (userCheck == true) {
        log("User exists!");
        await message.channel.send("User exists!");
    } else if (userCheck == false) {
        log("User doesn't exist!");
        await message.channel.send("User doesn't exist, will try registering!");
        var userRegistrationResult = await registerUser(message.author);
        if (userRegistrationResult == true) {
            alwaysLog("User registered!");
            await message.channel.send("User registered!");
        } else {
            alwaysLog("User registration failed!");
            await message.channel.send("User registration failed!");
        }
    } else {
        alwaysLog("Error!");
        await message.channel.send("Error!");
    }
}

module.exports = {
    checkUser,
    registerUser,
    hasSessionKey,
    setSessionKey,
    connect,
    close,
    userAllowAccess,
    getSessionKey,
    register
};
