const fetch = require('node-fetch');

const { apiKey, secret } = require('./config.json');

const LAST_FM_API_KEY = apiKey;
const LAST_FM_API_BASE = 'http://ws.audioscrobbler.com/2.0/';

async function scrobbleSong(songName, artistName, album, timestamp, sessionKey){
    var auth_sig = `api_key${LAST_FM_API_KEY}artist${artistName}album${album}methodtrack.scrobblesk${sessionKey}timestamp${timestamp}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    const url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&timestamp=${timestamp}&format=json&api_sig=${auth_sig_md5Hex}`;
    const response = await fetch(url, {'method': 'POST'});
    const data = await response.json();
    console.log(data);
}

async function getRecentTracks(username, limit, page){
    var url = `${LAST_FM_API_BASE}?method=user.getrecenttracks&user=${username}&api_key=${LAST_FM_API_KEY}&format=json&limit=${limit}&page=${page}`;
    return await fetch(url).then(response => response.json());
}

async function updateNowPlaying(songName, artistName, album, sessionKey){
    var auth_sig = `api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.updatenowplayingsk${sessionKey}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    const url = `${LAST_FM_API_BASE}?method=track.updateNowPlaying&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&format=json&api_sig=${auth_sig_md5Hex}`;
    const response = await fetch(url, {'method': 'POST'});
    const data = await response.json();
    console.log(data);
}

module.exports = {scrobbleSong, getRecentTracks, updateNowPlaying};

