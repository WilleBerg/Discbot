const fetch = require("node-fetch");
const md5 = require("blueimp-md5");
const { apiKey, secret } = require("./config.json");
const fs = require("fs");
const { lastfmDebug } = require("./config.json");

const LAST_FM_API_KEY = apiKey;
const LAST_FM_API_BASE = "http://ws.audioscrobbler.com/2.0/";
const DEBUGGING = lastfmDebug;

const {
    userAllowAccess,
    setSessionKey,
} = require("./userHandler.js");

async function scrobbleSong(
    songName,
    artistName,
    album,
    timestamp,
    sessionKey
) {
    log(`\n\n\n\n\n`);
    log("scrobbleSong called");
    log(`\n\n\n\n\n`);

    var auth_sig =
        `album${album}` +
        `api_key${LAST_FM_API_KEY}` +
        `artist${artistName}` +
        `methodtrack.scrobblesk${sessionKey}` +
        `timestamp${timestamp}` +
        `track${songName}` +
        `${secret}`;
    log(auth_sig);
    var auth_sig_md5Hex = md5(auth_sig);
    songName = encodeURIComponent(songName);
    album = encodeURIComponent(album);
    artistName = encodeURIComponent(artistName);
    try {
        const url =
            `${LAST_FM_API_BASE}?method=track.scrobble` +
            `&api_key=${LAST_FM_API_KEY}` +
            `&sk=${sessionKey}` +
            `&artist=${artistName}` +
            `&track=${songName}` +
            `&album=${album}` +
            `&timestamp=${timestamp}` +
            `&format=json&api_sig=${auth_sig_md5Hex}`;
        log(url);
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        log(JSON.stringify(data));
        return data;
    } catch (error) {
        log(`Error from scrobbleSong: ${error}`);
        return "error";
    }
}

async function scrobbleSongs(
    songNames,
    artistNames,
    albums,
    timestamps,
    sessionKey
) {
    var msg = "";
    msg += `\n\n\n\n\n`;
    msg += "scrobbleSongs called\n";
    msg += `songNames: ${songNames}\n`;
    msg += `artistNames: ${artistNames}\n`;
    msg += `albums: ${albums}\n`;
    msg += `timestamps: ${timestamps}\n`;
    msg += `sessionKey: ${sessionKey}\n`;
    var tmpstring = "";
    var albumList = [];
    for (var i = 0; i < albums.length; i++) {
        tmpstring += "album";
        tmpstring += `[${i}]`;
        tmpstring += changeToUtf8(albums[i]);
        albumList.push(tmpstring);
        log(tmpstring);
        tmpstring = "";
    }
    // TODO: remake into fucntion please
    var artistList = [];
    for (var i = 0; i < artistNames.length; i++) {
        tmpstring += "artist";
        tmpstring += `[${i}]`;
        tmpstring += changeToUtf8(artistNames[i]);
        artistList.push(tmpstring);
        log(tmpstring);
        tmpstring = "";
    }
    var timestampList = [];
    for (var i = 0; i < timestamps.length; i++) {
        tmpstring += "timestamp";
        tmpstring += `[${i}]`;
        tmpstring += timestamps[i];
        timestampList.push(tmpstring);
        log(tmpstring);
        tmpstring = "";
    }
    var trackList = [];
    for (var i = 0; i < songNames.length; i++) {
        tmpstring += "track";
        tmpstring += `[${i}]`;
        tmpstring += changeToUtf8(songNames[i]);
        trackList.push(tmpstring);
        log(tmpstring);
        tmpstring = "";
    }
    var auth_sig = "";
    albumList.sort();
    artistList.sort();
    timestampList.sort();
    trackList.sort();

    var albumString = "";
    var artistString = "";
    var timestampString = "";
    var trackString = "";

    for (var i = 0; i < albumList.length; i++) {
        albumString += albumList[i];
        artistString += artistList[i];
        timestampString += timestampList[i];
        trackString += trackList[i];
    }
    auth_sig =
        `${albumString}api_key${LAST_FM_API_KEY}` +
        `${artistString}methodtrack.scrobblesk${sessionKey}` +
        `${timestampString}` +
        `${trackString}` +
        `${secret}`;
    msg += `auth_sig: ${auth_sig}\n`;
    // auth_sig = changeToUtf8(auth_sig);
    msg += `auth_sig post utf8 fix: ${auth_sig}\n`;
    var auth_sig_md5Hex = md5(auth_sig);
    msg += `auth_sig_md5Hex: ${auth_sig_md5Hex}\n`;
    var urlTrackString = "";
    var urlArtistString = "";
    var urlAlbumString = "";
    var urlTimestampString = "";
    for (var i = 0; i < songNames.length; i++) {
        urlTrackString += `track[${i}]=${changeToUtf8(songNames[i])}`;
        if (i != songNames.length - 1) urlTrackString += "&";
        urlArtistString += `artist[${i}]=${changeToUtf8(artistNames[i])}`;
        if (i != songNames.length - 1) urlArtistString += "&";
        urlAlbumString += `album[${i}]=${changeToUtf8(albums[i])}`;
        if (i != songNames.length - 1) urlAlbumString += "&";
        urlTimestampString += `timestamp[${i}]=${timestamps[i]}`;
        if (i != songNames.length - 1) urlTimestampString += "&";
    }
    try {
        var url =
            `${LAST_FM_API_BASE}` +
            `?method=track.scrobble&api_key=${LAST_FM_API_KEY}` +
            `&sk=${sessionKey}` +
            `&${urlArtistString}` +
            `&${urlTrackString}` +
            `&${urlAlbumString}` +
            `&${urlTimestampString}` +
            `&format=json&api_sig=${auth_sig_md5Hex}`;
        url = encodeURI(url);
        msg += `url: ${url}\n`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        log(msg);
        log(JSON.stringify(data));
        if (data.error != undefined) return "error";
        else return 1;
    } catch (error) {
        log(`Error from testScrobbles: ${error}`);
        return "error";
    }
}

function changeToUtf8(s) {
    let returnString = s;
    for (var i = 0; i < s.length; i++) {
        if (s[i] === "&") {
            returnString = s.replace("&", "%26");
        }
        if (s[i] === "#") {
            returnString = s.replace("#", "%23");
        }
        if (s[i] === "â") {
            returnString = s.replace("â", "%C3%A2");
        }
    }
    return returnString;
}

// Will stay as a memory of the time I spent trying to figure out how to scrobble a batch of songs
async function testScrobbles(
    songNames,
    artistNames,
    albums,
    timestamps,
    sessionKey,
    isReverse,
    hasBracketsInMD5,
    hasBracketsInLink,
    ismd5Encoded,
    isUrlEncoded
) {
    var msg = "";
    msg += `\n\n\n\n\n`;
    msg += "testScrobbles called\n";
    msg += `songNames: ${songNames}\n`;
    msg += `artistNames: ${artistNames}\n`;
    msg += `albums: ${albums}\n`;
    msg += `timestamps: ${timestamps}\n`;
    msg += `sessionKey: ${sessionKey}\n`;
    msg +=
        `isReverse: ${isReverse}` +
        `, hasBracketsInMD5: ${hasBracketsInMD5}` +
        `, hasBracketsInLink: ${hasBracketsInLink}` +
        `, ismd5Encoded: ${ismd5Encoded}` +
        `, isUrlEncoded: ${isUrlEncoded}\n`;
    if (hasBracketsInMD5) var auth_sig = "";
    else var auth_sig = "album";
    var tmpstring = "";
    var albumList = [];
    if (isReverse) {
        for (var i = albums.length - 1; i >= 0; i--) {
            auth_sig += "album";
            if (hasBracketsInMD5) auth_sig += `[${i}]`;
            auth_sig += albums[i];
        }
    } else {
        for (var i = 0; i < albums.length; i++) {
            tmpstring += "album";
            if (hasBracketsInMD5) tmpstring += `[${i}]`;
            tmpstring += albums[i];
            albumList.push(tmpstring);
            tmpstring = "";
        }
    }
    auth_sig += tmpstring + `api_key${LAST_FM_API_KEY}`;
    tmpstring = "";
    if (hasBracketsInMD5) auth_sig += "";
    else auth_sig += "artist";
    var artistList = [];
    if (isReverse) {
        for (var i = artistNames.length - 1; i >= 0; i--) {
            auth_sig += "artist";
            if (hasBracketsInMD5) auth_sig += `[${i}]`;
            auth_sig += artistNames[i];
        }
    } else {
        for (var i = 0; i < artistNames.length; i++) {
            tmpstring += "artist";
            if (hasBracketsInMD5) tmpstring += `[${i}]`;
            tmpstring += artistNames[i];
            artistList.push(tmpstring);
            tmpstring = "";
        }
    }
    auth_sig += tmpstring + `methodtrack.scrobblesk${sessionKey}`;
    tmpstring = "";
    if (hasBracketsInMD5) auth_sig += "";
    else auth_sig += "timestamp";
    var timestampList = [];
    if (isReverse) {
        for (var i = timestamps.length - 1; i >= 0; i--) {
            auth_sig += "timestamp";
            if (hasBracketsInMD5) auth_sig += `[${i}]`;
            auth_sig += timestamps[i];
        }
    } else {
        for (var i = 0; i < timestamps.length; i++) {
            tmpstring += "timestamp";
            if (hasBracketsInMD5) tmpstring += `[${i}]`;
            tmpstring += timestamps[i];
            timestampList.push(tmpstring);
            tmpstring = "";
        }
    }
    auth_sig += tmpstring;
    tmpstring = "";
    if (hasBracketsInMD5) auth_sig += "";
    else auth_sig += "track";
    var trackList = [];
    if (isReverse) {
        for (var i = songNames.length - 1; i >= 0; i--) {
            auth_sig += "track";
            if (hasBracketsInMD5) auth_sig += `[${i}]`;
            auth_sig += songNames[i];
        }
    } else {
        for (var i = 0; i < songNames.length; i++) {
            tmpstring += "track";
            if (hasBracketsInMD5) tmpstring += `[${i}]`;
            tmpstring += songNames[i];
            trackList.push(tmpstring);
            tmpstring = "";
        }
    }
    auth_sig += tmpstring + secret;
    auth_sig = "";
    log("albumList: " + albumList);
    albumList.sort();
    log("albumList: " + albumList);
    artistList.sort();
    timestampList.sort();
    trackList.sort();

    var albumString = "";
    var artistString = "";
    var timestampString = "";
    var trackString = "";

    for (var i = 0; i < albumList.length; i++) {
        albumString += albumList[i];
        artistString += artistList[i];
        timestampString += timestampList[i];
        trackString += trackList[i];
    }
    auth_sig =
        `${albumString}` +
        `api_key${LAST_FM_API_KEY}` +
        `${artistString}` +
        `methodtrack.scrobblesk${sessionKey}` +
        `${timestampString}` +
        `${trackString}` +
        `${secret}`;

    msg += `auth_sig: ${auth_sig}\n`;
    if (ismd5Encoded) auth_sig = encodeURI(auth_sig);
    var auth_sig_md5Hex = md5(auth_sig);
    msg += `auth_sig_md5Hex: ${auth_sig_md5Hex}\n`;
    var urlTrackString = "";
    var urlArtistString = "";
    var urlAlbumString = "";
    var urlTimestampString = "";
    if (hasBracketsInLink) {
        if (isReverse) {
            for (var i = songNames.length - 1; i >= 0; i--) {
                urlTrackString += `track[${i}]=${songNames[i]}`;
                if (i != 0) urlTrackString += "&";
                urlArtistString += `artist[${i}]=${artistNames[i]}`;
                if (i != 0) urlArtistString += "&";
                urlAlbumString += `album[${i}]=${albums[i]}`;
                if (i != 0) urlAlbumString += "&";
                urlTimestampString += `timestamp[${i}]=${timestamps[i]}`;
                if (i != 0) urlTimestampString += "&";
            }
        } else {
            for (var i = 0; i < songNames.length; i++) {
                urlTrackString += `track[${i}]=${songNames[i]}`;
                if (i != songNames.length - 1) urlTrackString += "&";
                urlArtistString += `artist[${i}]=${artistNames[i]}`;
                if (i != songNames.length - 1) urlArtistString += "&";
                urlAlbumString += `album[${i}]=${albums[i]}`;
                if (i != songNames.length - 1) urlAlbumString += "&";
                urlTimestampString += `timestamp[${i}]=${timestamps[i]}`;
                if (i != songNames.length - 1) urlTimestampString += "&";
            }
        }
    } else {
        urlTrackString = `track=${songNames}`;
        urlArtistString = `artist=${artistNames}`;
        urlAlbumString = `album=${albums}`;
        urlTimestampString = `timestamp=${timestamps}`;
    }
    try {
        if (hasBracketsInLink) {
            var url =
                `${LAST_FM_API_BASE}` +
                `?method=track.scrobble&api_key=${LAST_FM_API_KEY}` +
                `&sk=${sessionKey}` +
                `&${urlArtistString}` +
                `&${urlTrackString}` +
                `&${urlAlbumString}` +
                `&${urlTimestampString}` +
                `&format=json&api_sig=${auth_sig_md5Hex}`;
        } else {
            var url =
                `${LAST_FM_API_BASE}` +
                `?method=track.scrobble&api_key=${LAST_FM_API_KEY}` +
                `&sk=${sessionKey}` +
                `&artist=${artistNames}` +
                `&track=${songNames}` +
                `&album=${albums}` +
                `&timestamp=${timestamps}` +
                `&format=json&api_sig=${auth_sig_md5Hex}`;
        }
        if (isUrlEncoded) url = encodeURI(url);
        msg += `url: ${url}\n`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        log(msg);
        log(JSON.stringify(data));
        if (data["error"] != undefined && data.error == 13) {
            return 0;
        } else {
            //log(msg);
            return data;
        }
    } catch (error) {
        log(`Error from testScrobbles: ${error}`);
        return "error";
    }
}

async function getRecentTracks(username, limit, page) {
    try {
        var url =
            `${LAST_FM_API_BASE}` +
            `?method=user.getrecenttracks&user=${username}` +
            `&api_key=${LAST_FM_API_KEY}` +
            `&format=json&limit=${limit}` +
            `&page=${page}`;
        return await fetch(url).then((response) => response.json());
    } catch (error) {
        log(`Error from getRecentTracks: ${error}`);
        return "error";
    }
}

async function updateNowPlaying(songName, artistName, album, sessionKey) {
    var auth_sig =
        `album${album}` +
        `api_key${LAST_FM_API_KEY}` +
        `artist${artistName}` +
        `methodtrack.updateNowPlayingsk${sessionKey}` +
        `track${songName}` +
        `${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    songName = encodeURIComponent(songName);
    album = encodeURIComponent(album);
    artistName = encodeURIComponent(artistName);
    const url =
        `${LAST_FM_API_BASE}` +
        `?method=track.updateNowPlaying&api_key=${LAST_FM_API_KEY}` +
        `&sk=${sessionKey}` +
        `&artist=${artistName}` +
        `&track=${songName}` +
        `&album=${album}` +
        `&format=json&api_sig=${auth_sig_md5Hex}`;
    try {
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from updateNowPlaying: ${error}`);
        return "error";
    }
}

// just import logging
function log(message) {
    if (!DEBUGGING) return;
    var toSave = `[${new Date().toLocaleString()}] ${message}`;
    console.log(toSave);
    try {
        fs.appendFile("./log/lastfmLog.log", toSave + "\n", (err) => {
            if (err) log(`ERROR: currently inside callback: ${err}`);
        });
    } catch (error) {
        console.error(error);
        log("Error writing to log file");
    }
}

async function setupLastFM(message) {
    const resp = await setSessionKey(message.author);
    if (resp == true) {
        message.channel.send(
            "You have successfully set up your LastFM account!\n" +
            'You should now be able to use ' +
            '**!duoscrobble** "**userToDuoScrobble**"'
        );
    } else {
        message.channel.send("Something went wrong");
    }
}

async function allowAccess(message) {
    var allowAccessResult = await userAllowAccess(message);
    if (!allowAccessResult) {
        message.channel.send("Something went wrong!");
    }
}

module.exports = {
    scrobbleSong,
    getRecentTracks,
    updateNowPlaying,
    scrobbleSongs,
    testScrobbles,
    setupLastFM,
    allowAccess
};
