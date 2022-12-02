const fetch = require('node-fetch');
const md5   = require("blueimp-md5");
const { apiKey, secret } = require('./config.json');
const fs = require('fs');

const LAST_FM_API_KEY = apiKey;
const LAST_FM_API_BASE = 'http://ws.audioscrobbler.com/2.0/';
const DEBUGGING = true;

async function scrobbleSong(songName, artistName, album, timestamp, sessionKey){
    var auth_sig = `album${album}api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.scrobblesk${sessionKey}timestamp${timestamp}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    try {
        const url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&timestamp=${timestamp}&format=json&api_sig=${auth_sig_md5Hex}`;
        const response = await fetch(url, {'method': 'POST'});
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from scrobbleSong: ${error}`);
        return 'error';
    }
}

async function getRecentTracks(username, limit, page){
    var url = `${LAST_FM_API_BASE}?method=user.getrecenttracks&user=${username}&api_key=${LAST_FM_API_KEY}&format=json&limit=${limit}&page=${page}`;
    return await fetch(url).then(response => response.json());
}

async function updateNowPlaying(songName, artistName, album, sessionKey){
    var auth_sig = `album${album}api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.updateNowPlayingsk${sessionKey}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    const url = `${LAST_FM_API_BASE}?method=track.updateNowPlaying&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&format=json&api_sig=${auth_sig_md5Hex}`;
    try {
        const response = await fetch(url, {'method': 'POST'});
        const data = await response.json();
        log(`Data from updateNowPlaying: ${JSON.stringify(data)}`);
        return data;
    } catch (error) {
        log(`Error from updateNowPlaying: ${error}`);
        return 'error';
    }
}

function log(message){
    if(!DEBUGGING) return;
    var toSave = `[${new Date().toLocaleString()}] ${message}`;
    console.log(toSave);
    try {
        fs.appendFile("./log/lastfmLog.log", toSave + "\n", (err) => {
            if(err) log(`ERROR: currently inside callback: ${err}`);
        });
    } catch (error) {
        console.error(error);
        log("Error writing to log file");
    }
}

module.exports = {scrobbleSong, getRecentTracks, updateNowPlaying};

