import logging

###############################################################################
#                          LOGGING CONFIGURATION                              #
###############################################################################

# DEBUGGING = 10
# INFO = 20
# WARNING = 30
# ERROR = 40
# CRITICAL = 50

def setName(name):
    global __name__
    __name__ = name

def setLevel(level):
    logger.setLevel(level)

def setup(name, level):
    setName(name)
    logging.basicConfig(filename=__name__,
                    format='%(asctime)s %(message)s',
                    filemode='a')
    global logger
    logger = logging.getLogger()
    setLevel(level)
    logger.debug("\n\n\n\nNEW LOGGING SESSION \n\n\n\n")

def recLog(s, tabs):
    if type(s) != dict and type(s) != list:
       logger.debug(tabs + str(s)) 
       return
    if type(s) == list:
        logger.debug(tabs + "[")
        for item in s:
            recLog(item, tabs + "    ")
        logger.debug(tabs + "]")
    if type(s) == dict:
        logger.debug(tabs + "{")
        for key, value in s.items():
            logger.debug(tabs + str(key) + " : ")
            recLog(value, tabs + "    ")
        logger.debug(tabs + "}")



def log(s):
    recLog(s, "")

