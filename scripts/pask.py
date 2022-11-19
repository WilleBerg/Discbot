#Permission and session key script

import json
import requests
import hashlib
import s_logging
import sys

s_logging.setup("./scripts/log/paskLog.log", 10) # 10 = DEBUG
log = s_logging.log

log("Log setup complete")

configObj = json.load(open('./scripts/scriptConfig.json', 'r'))



LAST_FM_API_KEY = configObj["apiKey"]  #Get from config.json, but first get a key 
LAST_FM_API_BASE = "http://ws.audioscrobbler.com/2.0/"

###############################################################################
#                                  MAIN                                       #
###############################################################################


def getSessionKey(token):
    auth_sig = "api_key" + LAST_FM_API_KEY + "methodauth.getSessiontoken" + token + configObj["secret"]
    md5String = hashlib.md5(auth_sig.encode('utf-8')).hexdigest()
    url = "%s?method=auth.getSession&api_key=%s&token=%s&format=json&api_sig=%s" % (LAST_FM_API_BASE, LAST_FM_API_KEY, token, md5String)
    resp = requests.get(url)
    try:
        respContent = resp.json()
        log(respContent)
    except Exception as e:
        log(e)

    try:
        sessionKey = respContent["session"]["key"]
        return sessionKey
    except KeyError:
        log("Could not get session key")
        return None

def main():
    token = sys.argv[1]
    log("Token: %s" % token)
    print(getSessionKey(sys.argv[1]))
main()
    
