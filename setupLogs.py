# Run this script from the command line to setup the logs directory
# Make sure it is run from the root directory of the project
import os

# Get current working directory
cwd = os.getcwd()

LOG_DIR = "/log"
SCRIPT_LOG_DIR = "/scripts/log"

def setupLogs():
    print(cwd)
    #print(os.path.exists(cwd + LOG_DIR))
    #print(os.path.exists(cwd + SCRIPT_LOG_DIR))

    if(not os.path.exists(cwd + LOG_DIR)):
        os.mkdir(cwd + LOG_DIR)
        print("Created log directory")
    
    if (not os.path.exists(cwd + LOG_DIR + "/databaseLog.log")):
        print("Created database log file")
        logFiles = open(cwd + LOG_DIR + "/databaseLog.log", "w")
        logFiles.close()

    if (not os.path.exists(cwd + LOG_DIR + "/log.log")):
        print("Created log file")
        logFiles = open(cwd + LOG_DIR + "/log.log", "w")
        logFiles.close()

    if(not os.path.exists(cwd + SCRIPT_LOG_DIR)):
        os.mkdir(cwd + SCRIPT_LOG_DIR)
        print("Created scripts log directory")

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/createAccessLinkLog.log")):
        print("Created createAccessLinkLog file")
        logFiles = open(cwd + SCRIPT_LOG_DIR + "/createAccessLinkLog.log", "w")
        logFiles.close()

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/lfmdsLog.log")):
        print("Created lfmdsLog file")
        logFiles = open(cwd + SCRIPT_LOG_DIR + "/lfmdsLog.log", "w")
        logFiles.close()

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/pastLog.log")):
        print("Created pastLog file")
        logFiles = open(cwd + SCRIPT_LOG_DIR + "/pastLog.log", "w")
        logFiles.close()

    print("Log setup complete")


setupLogs()