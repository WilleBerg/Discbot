import requests
import hashlib
import json
import s_logging

s_logging.setup("./scripts/log/createAccessLinkLog.log", 10) # 10 = DEBUG
log = s_logging.log

log("Log setup complete")

configObj = json.load(open('./scripts/scriptConfig.json', 'r'))

LAST_FM_API_KEY = configObj["apiKey"]  #Get from config.json, but first get a key 
LAST_FM_API_BASE = "http://ws.audioscrobbler.com/2.0/"

def getTokenSignature():
    signatureString = "api_key" + LAST_FM_API_KEY + "methodauth.getToken" + configObj["secret"]
    md5String = hashlib.md5(signatureString.encode('utf-8')).hexdigest()
    return md5String

def getToken():
    signature = getTokenSignature()
    url = "%s?method=auth.getToken&api_key=%s&api_sig=%s&format=json" % (LAST_FM_API_BASE, LAST_FM_API_KEY, signature)
    resp = requests.get(url)
    try:
        respContent = resp.json()
        log(respContent)
    except:
        log("Could not get token")
    return respContent["token"]

def getUserPermissionLink(token):
    return "http://www.last.fm/api/auth/?api_key=%s&token=%s" % (LAST_FM_API_KEY, token)

def main():
    token = getToken()
    print(token)
    print(getUserPermissionLink(token))

main()