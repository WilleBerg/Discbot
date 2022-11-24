#################################################################################
#                                                                               #
# TODO: Use command line inputs, then perhaps bash script                       #
# TODO: Use different params for getrecenttracks (maybe)                        #
# TODO: Use try catch pls                                                       #  
# TODO: Save user's session key to file (if usable still)                       #
# TODO: Fix updateNowPlaying for when the same song is on repeat                #
# TODO: Maybe constantly send updateNowPlaying requests, or every other loop    #
#       iteration.                                                              #
# TODO: Check if GET request works on user authentication, instead of waiting   #
#       for user to press enter                                                 #
# TODO: Write code to translate Last.fm API error codes to human readable       #
#       error messages                                                          #
# TODO: Maybe write failsafe for when user hasnt listened to anything in the    #
#       last 5 minutes, quit program                                            #
#                                                                               #
#################################################################################

import json
import requests
import logging
import hashlib
import time
import sys
import s_logging

# Create and configure logger

s_logging.setup("./scripts/log/lfmdsLog.log", 10) # 10 == DEBUG
log = s_logging.log
logger = s_logging.logger

log("Log setup complete starting lfmds.py")

configObj = json.load(open('./scripts/scriptConfig.json', 'r'))

sessionKey = sys.argv[1] 
USER_TO_LISTEN = sys.argv[2]

# Fun api stuff
LAST_FM_API_KEY = configObj["apiKey"]  #Get from config.json, but first get a key 
LAST_FM_API_BASE = "http://ws.audioscrobbler.com/2.0/"

# The user which is currently listening to music/is scrobbling

GET_RECENT_TRACKS_URL = "%s?method=user.getrecenttracks&user=%s&api_key=%s&format=json&limit=5" % (LAST_FM_API_BASE, USER_TO_LISTEN, LAST_FM_API_KEY)


def scrobbleSong(songName, artistName, album, timestamp, sessionKey):
    auth_sig = "album" + album + "api_key" + LAST_FM_API_KEY + "artist" + artistName + "methodtrack.scrobblesk" + sessionKey + "timestamp" + timestamp + "track" + songName + configObj["secret"]
    md5String = hashlib.md5(auth_sig.encode('utf-8')).hexdigest()
    url = "%s?method=track.scrobble&api_key=%s&sk=%s&track=%s&artist=%s&album=%s&timestamp=%s&api_sig=%s&format=json" % (LAST_FM_API_BASE, LAST_FM_API_KEY, sessionKey, songName, artistName, album, timestamp, md5String)
    resp = requests.post(url)
    try:
        respContent = resp.json()
        log(respContent)
    except Exception as e:
        log(e)

def updateNowPlaying(songName, artistName, album, sessionKey):
    auth_sig = "album" + album + "api_key" + LAST_FM_API_KEY + "artist" + artistName + "methodtrack.updateNowPlaying" + "sk" + sessionKey + "track" + songName + configObj["secret"]
    md5String = hashlib.md5(auth_sig.encode('utf-8')).hexdigest()
    resp = requests.post("%s?method=track.updateNowPlaying&api_key=%s&sk=%s&track=%s&artist=%s&album=%s&api_sig=%s&format=json" % (LAST_FM_API_BASE, LAST_FM_API_KEY, sessionKey, songName, artistName, album, md5String))
    try:
        respContent = resp.json()
        log(respContent)
    except Exception as e:
        log(e)
    
def getLastTwoTracks(respContent):
    # Get the last two tracks
    tracks = respContent["recenttracks"]["track"]
    if len(tracks) == 1:
        log("Only one track in list")
        return tracks[0], None
    else:
        log("Two tracks in list")
        # Return the last two tracks as objects
        # with the following attributes:
        #   name
        #   artist
        #   album
        
        return [{
            "name": tracks[0]["name"],
            "artist": tracks[0]["artist"]["#text"],
            "album": tracks[0]["album"]["#text"]
        }, {
            "name": tracks[1]["name"],
            "artist": tracks[1]["artist"]["#text"],
            "album": tracks[1]["album"]["#text"]
        }]

def main():

    currentlyPlayingProgram = {
        "name" : "",
        "artist" : "",
        "album" : "",
    }
    lastPlayedSongProgram = {
        "name" : "",
        "artist" : "",
        "album" : "",
        "timestamp" : ""
    }

    log("Getting recent tracks first time")
    resp = requests.get(GET_RECENT_TRACKS_URL)
    respCode = resp.status_code

    # Just some error handling
    if respCode != 200:
        log("Bad response")
        exit()
    # Logging for debugging purposes
    log("Status code for GET_RECENT_TRACKS %s" % (str(respCode)))
    try:
        respContent = resp.json()
    except Exception as e:
        log(e)

    log("Getting last two tracks")
    lastTwoTracks = getLastTwoTracks(respContent)
    log("Last two tracks: \n")
    log(lastTwoTracks)


    latestTrackOnLastFm = respContent["recenttracks"]["track"][0] 
    try:
        isPlaying = respContent["recenttracks"]["track"][0]["@attr"]["nowplaying"]
    except KeyError as e:
        log("Could not find nowplaying")
        log("%s is probably not currently listening" % USER_TO_LISTEN)
        log(e)
        isPlaying = "false"

    

    timestamp = str(int(time.time()))

    if isPlaying == "true":
        currentlyPlayingProgram["name"] = latestTrackOnLastFm["name"]
        currentlyPlayingProgram["artist"] = latestTrackOnLastFm["artist"]["#text"]
        currentlyPlayingProgram["album"] = latestTrackOnLastFm["album"]["#text"]
        updateNowPlaying(currentlyPlayingProgram["name"], currentlyPlayingProgram["artist"], currentlyPlayingProgram["album"], sessionKey)
    else:
        lastPlayedSongProgram["name"] = latestTrackOnLastFm["name"]
        lastPlayedSongProgram["artist"] = latestTrackOnLastFm["artist"]["#text"]
        lastPlayedSongProgram["album"] = latestTrackOnLastFm["album"]["#text"]
        lastPlayedSongProgram["timestamp"] = latestTrackOnLastFm["date"]["uts"]
        
    # Bad code i know
    counter = 0
    while True:

        log("Getting recent tracks inside while loop")
        resp = requests.get(GET_RECENT_TRACKS_URL)
        respCode = resp.status_code

        # Just some error handling
        if respCode != 200:
            log("Bad response")
            log(resp.json())
            #logger.critical("Bad response from get recent tracks")
            time.sleep(10)
            continue
        # Logging for debugging purposes
        log("Status code for GET_RECENT_TRACKS %s" % (str(respCode)))
        try:
            respContent = resp.json()
        except Exception as e:
            log(e)

        log("Getting last two tracks")
        lastTwoTracks = getLastTwoTracks(respContent)
        log("Last two tracks: \n")
        log(lastTwoTracks)

        latestTrackOnLastFm = respContent["recenttracks"]["track"][0] 
        try:
            isPlaying = respContent["recenttracks"]["track"][0]["@attr"]["nowplaying"]
            log("Currently playing")
        except KeyError as e:
            log("Could not find nowplaying")
            log("%s is probably not currently listening" % USER_TO_LISTEN)
            log(e)
            isPlaying = "false"

        currentlyPlayingOnLastFm = {
            "name" : "",
            "artist" : "",
            "album" : "",
        }
        lastPlayedSongOnLastFm = {
            "name" : "",
            "artist" : "",
            "album" : "",
            "timestamp" : ""
        }

        log("Currently playing on program")
        log(currentlyPlayingProgram)
        log("Last played song on program")
        log(lastPlayedSongProgram)

        if isPlaying == "true":
            # Could perhaps set objects to equal each other instead of setting each value
            # Does surely its a copy and not a reference
            currentlyPlayingOnLastFm["name"] = latestTrackOnLastFm["name"]
            currentlyPlayingOnLastFm["artist"] = latestTrackOnLastFm["artist"]["#text"]
            currentlyPlayingOnLastFm["album"] = latestTrackOnLastFm["album"]["#text"]
            lastPlayedSongOnLastFm["name"] = respContent["recenttracks"]["track"][1]["name"]
            lastPlayedSongOnLastFm["artist"] = respContent["recenttracks"]["track"][1]["artist"]["#text"]
            lastPlayedSongOnLastFm["album"] = respContent["recenttracks"]["track"][1]["album"]["#text"]
            lastPlayedSongOnLastFm["timestamp"] = respContent["recenttracks"]["track"][1]["date"]["uts"]
            # Ignore following comment for now
            # Commenting this out, if it works, can probably remove currentlyPlayingObjects
            log("Checking if currently playing is not equal to last played")
            log("if it is, then we have update the now playing")

            log("Is currently playing equal to last played?")
            log("" + str(currentlyPlayingProgram) + " == " + str(currentlyPlayingOnLastFm))
            log("or counter is >= 30 : " + str(counter))
            if currentlyPlayingProgram["name"] != currentlyPlayingOnLastFm["name"] or counter >= 30: #temporary >:(
                log("They were not equal")
                log("Updating now playing")
                updateNowPlaying(currentlyPlayingOnLastFm["name"], currentlyPlayingOnLastFm["artist"], currentlyPlayingOnLastFm["album"], sessionKey)
                currentlyPlayingProgram = currentlyPlayingOnLastFm
                counter = 0
                #logger.info("Updated now playing")
        else:
            lastPlayedSongOnLastFm["name"] = latestTrackOnLastFm["name"]
            lastPlayedSongOnLastFm["artist"] = latestTrackOnLastFm["artist"]["#text"]
            lastPlayedSongOnLastFm["album"] = latestTrackOnLastFm["album"]["#text"]
            lastPlayedSongOnLastFm["timestamp"] = latestTrackOnLastFm["date"]["uts"]
            #log("Is not playing, updating now playing anyway")
            #updateNowPlaying()

        if lastPlayedSongProgram != lastPlayedSongOnLastFm:
            if lastPlayedSongProgram["timestamp"] != lastPlayedSongOnLastFm["timestamp"]:
                scrobbleSong(lastPlayedSongOnLastFm["name"], lastPlayedSongOnLastFm["artist"], lastPlayedSongOnLastFm["album"], lastPlayedSongOnLastFm["timestamp"], sessionKey)
                lastPlayedSongProgram = lastPlayedSongOnLastFm

        time.sleep(1)
        counter += 1


main()
