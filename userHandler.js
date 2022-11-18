
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
        id: user.id,
        username: user.username,
        hasAllowedAccess: false,
        hasSessionKey : false,
        sessionKey: null
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