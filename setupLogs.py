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
        log_files = open(cwd + LOG_DIR + "/databaseLog.log", "w")
        log_files.close()

    if (not os.path.exists(cwd + LOG_DIR + "/log.log")):
        print("Created log file")
        log_files = open(cwd + LOG_DIR + "/log.log", "w")
        log_files.close()

    if(not os.path.exists(cwd + SCRIPT_LOG_DIR)):
        os.mkdir(cwd + SCRIPT_LOG_DIR)
        print("Created scripts log directory")

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/createAccessLinkLog.log")):
        print("Created createAccessLinkLog file")
        log_files = open(cwd + SCRIPT_LOG_DIR + "/createAccessLinkLog.log", "w")
        log_files.close()

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/lfmdsLog.log")):
        print("Created lfmdsLog file")
        log_files = open(cwd + SCRIPT_LOG_DIR + "/lfmdsLog.log", "w")
        log_files.close()

    if (not os.path.exists(cwd + SCRIPT_LOG_DIR + "/pastLog.log")):
        print("Created pastLog file")
        log_files = open(cwd + SCRIPT_LOG_DIR + "/pastLog.log", "w")
        log_files.close()

    print("Log setup complete")


setupLogs()