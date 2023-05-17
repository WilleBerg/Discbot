// PACKAGES
const fs = require("fs");

const USER_E = '536906681570033664';
const USER_W = '70999889231753216';

const WO_SERVER_ID = '982289016672120852';
const WO_SERVER_WELCOME_CHANNEL_ID = '982300142726156399';

const RAINDANCE_URL = 'https://www.youtube.com/watch?v=aMTLs4qfJtI';
const SOVIET_URL = 'https://www.youtube.com/watch?v=U06jlgpMtQs';
const KACHOW_URL = 'https://tenor.com/view/' + 
                   'kachow-cars-insane-kachow-gif-20913646';

const GIGACHAD_EMOTE = '<:gigachad:852944386816081990>';
const PEPELAUGH_EMOTE = '<:pepeLaugh2:852905715676872765>';
const SADGE_EMOTE = '<:Sadge:852903092315357204>';

const TIMER_TIME = 1000 * 10;

const LOG_PATH = './log/log.log';

const LFMHELP_STRING = (
    "Setup:\n1. **!register** - to register your discord on " +
    "this bots database.\nThe bot only saves your username " +
    "and id from your discord account.\n" +
    "2. **!allowaccess** - to allow the bot to scrobble your " +
    "songs. Follow the link provided and accept before next " +
    "step\n" +
    "3. **!setuplastfm** - to setup your lastfm account " +
    "with the bot.\n" +
    "After setup you can use the following commands:\n" +
    '**!duoscrobble "lastFmUser"** to scrobble songs from ' +
    'that user to your account\n' +
    "**!scrobblestop** to stop scrobbling songs from that user " +
    "to your account\n"
);

const HELP_STRING = (
    "**!play** songName or Url - to play song\n" +
    "**!skip** - to skip current song\n" +
    "**!stop** - to stop bot completely\n" +
    "**!q** to get current queue\n" +
    "**!clearq** - to clear the queue\n" +
    "**!remove** number - to remove specific song from queue\n" +
    "**!lfmhelp** - to get help with last.fm commands and setup\n" +
    "**!credits**"
)

// DISCORDJS
const {
    Client,
    Collection,
    Intents,
} = require("discord.js");

const {
    token,
    prefix
} = require("./config.json");

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    ],
    partials: ["CHANNEL"],
});

const {
} = require("@discordjs/voice");

// IMPORTED FUNCTIONS
const { sendBoop, boop } = require("./src/welcomeMessage");

const {
    connect,
    close,
} = require("./src/userHandler.js");

const {
    execute,
    skip,
    stop,
    clearQueue,
    removeFromQueue
} = require('./src/musicHandler.js');

const {
    duoscrobble,
    stopscrobbling,
    multiScrobbler,
    latestScrobbles,
    updateScrobblers,
    getScrobblers
} = require('./src/scrobbler.js');

const { register } = require('./src/userHandler.js')

const { log, alwaysLog } = require('./src/logging.js');

let timer = 0;
let updateTimer = 0;
var sendMessage = false;

client.commands = new Collection();

const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const queue = new Map();

client.once("ready", async () => {
    await connect();
    fs.appendFile(LOG_PATH, "Bot started!\n", (err) => {
        if (err) console.log("error", err);
    });
    alwaysLog(`Bot is ready!`);
    setInterval(() => {
        if (timer > 0) {
            timer -= 1000;
        } else {
            updateScrobblers();
            timer = TIMER_TIME;
        }
        if (updateTimer > 0) {
            updateTimer -= 1000;
        } else {
            updateTimer = 1000 * 60 * 5;
            if (getScrobblers().length > 0) {
                // Add these to function instead
                sendMessage = true;
                alwaysLog("");
                alwaysLog("UPDATE MESSAGE");
                alwaysLog("");
                alwaysLog("Current scrobblers: " + getScrobblers().length);
                var message = createUpdateMessage(getScrobblers());
                for (let i = 0; i < message.length; i++) {
                    alwaysLog(message[i]);
                }
                alwaysLog("");
            } else {
                if (sendMessage) {
                    alwaysLog("No scrobblers");
                    sendMessage = false;
                }
            }
        }
    }, 1000);
});


client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("guildMemberAdd", (member) => {
    if (member.guild.id == WO_SERVER_ID) {
        sendBoop(member, 
            member.guild.channels.cache.get(WO_SERVER_WELCOME_CHANNEL_ID));
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    log(
        `Message received: ${message.content} : ` + 
        `${message.author.username} : ${message.channel.type}`
    );
    if (!message.content.startsWith(prefix)) return;
    // respond to private message
    if (message.channel.type == "DM") {
        try {
            handleMessage(message, null);
        } catch (error) {
            alwaysLog("Error in private message: ");
            alwaysLog(error);
        }
    } else {
        const serverQueue = queue.get(message.guild.id);
        handleMessage(message, serverQueue);
    }
});
// Responed to private message

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});


function handleMessage(message, serverQueue) {
    // TODO: Redo this please
    // Perhaps a for-loop, just looping through commands?
    // But how to call correct function?
    alwaysLog(
        `Will try to handle ${message.content} from ` + 
            `user ${message.author.username}`
    );
    if (serverQueue == null) {
        alwaysLog("Server queue is null, assuming private message");
    }
    // !play
    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue, queue);
        return;
    } // !skip
    else if (
        message.content.startsWith(`${prefix}skip`) &&
        serverQueue != null
    ) {
        skip(message, serverQueue);
        return;
    } // !stop
    else if (
        message.content.startsWith(`${prefix}stop`) &&
        serverQueue != null
    ) {
        stop(message, serverQueue, queue);
        return;
    } // !queue
    else if (message.content.startsWith(`${prefix}q`) && serverQueue != null) {
        printQueue(message, serverQueue);
    } // !raindance
    else if (
        message.content.startsWith(`${prefix}raindance`) &&
        serverQueue != null
    ) {
        message.content = "!play " + RAINDANCE_URL;
        execute(message, serverQueue);
    } // !soviet
    else if (
        message.content.startsWith(`${prefix}soviet`) &&
        serverQueue != null
    ) {
        message.content = "!play " + SOVIET_URL;
        execute(message, serverQueue);
    } // !credits
    else if (message.content.startsWith(`${prefix}credits`)) {
        message.channel.send(
            GIGACHAD_EMOTE + "@sylt" + GIGACHAD_EMOTE
        );
    } // !help
    else if (message.content.startsWith(`${prefix}help`)) {
        message.channel.send(HELP_STRING);
    } // !lfmhelp
    else if (message.content.startsWith(`${prefix}lfmhelp`)) {
        message.channel.send(LFMHELP_STRING);
    } // !clearq
    else if (message.content.startsWith(`${prefix}clearq`)) {
        clearQueue(serverQueue);
    } // !remove
    else if (message.content.startsWith(`${prefix}remove`)) {
        removeFromQueue(message, serverQueue);
    } // !kill
    else if (message.content.startsWith(`${prefix}kill`)) {
        if (message.author.id == USER_W) {
            exit(message);
        } else {
            message.channel.send(
                "You don't have permission to do that!" + PEPELAUGH_EMOTE
            );
        }
    } // !scrobblestatus
    else if (message.content.startsWith(`${prefix}scrobblestatus`)) {
        if (message.author.id == USER_W) {
            var message0 = createUpdateMessage(getScrobblers());
            var message1 = "```";
            for (let i = 0; i < message0.length; i++) {
                message1 += message0[i] + "\n";
            }
            message1 += "```";
            message.channel.send(message1);
        } else {
            message.channel.send(
                "You don't have permission to do that!" + PEPELAUGH_EMOTE
            );
        }
    } // !boop
    else if (message.content.startsWith(`${prefix}boop`)) {
        boop(message.channel);
    } // !register
    else if (message.content.startsWith(`${prefix}register`)) {
        register(message);
    } // !allowaccess
    else if (message.content.startsWith(`${prefix}allowaccess`)) {
        allowAccess(message);
    } // !setuplastfm
    else if (message.content.startsWith(`${prefix}setuplastfm`)) {
        setupLastFM(message);
    } // !duoscrobble
    else if (message.content.startsWith(`${prefix}duoscrobble`)) {
        duoscrobble(message);
    } // !scrobblestop
    else if (message.content.startsWith(`${prefix}scrobblestop`)) {
        stopscrobbling(message);
    } // !ems
    else if (message.content.startsWith(`${prefix}ems`)) {
        if (
            message.author.id != USER_E &&
            message.author.id != USER_W 
        ) {
            return;
        }
        var mess = message.content.split(" ");
        var content = "";
        if (mess.length != 1 || mess.length > 2) {
            content = "!duoscrobble sylt_-";
        } else {
            content = "!duoscrobble sylt_- " + mess[1];
        }
        var newMessage = {
            author: { id: USER_E, username: "emmy" },
            content: content,
            channel: message.channel,
        };
        duoscrobble(newMessage);
    } // !wbs
    else if (message.content.startsWith(`${prefix}wbs`)) {
        if (
            message.author.id != USER_E &&
            message.author.id != USER_W 
        ) {
            return;
        }
        var mess = message.content.split(" ");
        var content = "";
        if (mess.length != 1 || mess.length > 2) {
            content = "!duoscrobble teitan-";
        } else {
            content = "!duoscrobble teitan- " + mess[1];
        }
        var newMessage = {
            author: { id: USER_W, username: "sylt" },
            content: content,
            channel: message.channel,
        };
        duoscrobble(newMessage);
    } // !es
    else if (message.content.startsWith(`${prefix}es`)) {
        if (
            message.author.id == USER_E ||
            message.author.id == USER_W 
        ) {
            var newMessage = {
                author: { id: USER_E, username: "emmy" },
                content: message.content,
                channel: message.channel,
            };
            stopscrobbling(newMessage);
        }
    } // !ws
    else if (message.content.startsWith(`${prefix}ws`)) {
        if (
            message.author.id != USER_E ||
            message.author.id != USER_W 
        ) {
            var newMessage = {
                author: { id: USER_W, username: "sylt" },
                content: message.content,
                channel: message.channel,
            };
            stopscrobbling(newMessage);
        }
    } // !multiscrobble
    else if (message.content.startsWith(`${prefix}multiscrobble`)) {
        multiScrobbler(message);
    } // !latestscrobbles
    else if (message.content.startsWith(`${prefix}ls`)) {
        latestScrobbles(message);
    } // !kachow
    // ty copilot
    else if (message.content.startsWith(`${prefix}kachow`)) {
        message.channel.send(
            KACHOW_URL 
        );
    } else {
        message.channel.send("You need to enter a valid command!");
    }
}

async function exit(message) {
    alwaysLog("Exiting...");
    await close();
    await message.channel.send("You killed me! " + SADGE_EMOTE);
    client.destroy();
    process.exit();
}

function createUpdateMessage(scrobblers) {
    if (scrobblers.length == 0) return ["No scrobblers"];
    var space = " ";
    var numberSign = "#";
    var longestMessage = 0;
    for (let i = 0; i < scrobblers.length; i++) {
        var currentMessage = `${i + 1}${space}${
            scrobblers[i]["user"].username
        }${space}is scrobbling${space}${
            scrobblers[i]["userToListen"]
        }'s songs. Time left: ${
            scrobblers[i]["timeout"] / 1000
        } seconds until timeout.`;
        if (currentMessage.length > longestMessage) {
            longestMessage = currentMessage.length;
        }
    }
    var numberSignRow = "#";
    for (let i = 0; i < longestMessage + 4; i++) {
        numberSignRow += numberSign;
    }
    var message = [numberSignRow];
    for (let i = 0; i < scrobblers.length; i++) {
        var currentMessage = `${i + 1}.${space}${
            scrobblers[i]["user"].username
        }${space}is scrobbling${space}${
            scrobblers[i]["userToListen"]
        }'s songs. Time left: ${
            scrobblers[i]["timeout"] / 1000
        } seconds until timeout.`;
        var spaces = longestMessage - currentMessage.length;
        for (let j = 0; j < spaces; j++) {
            currentMessage += space;
        }
        if (spaces > 0) currentMessage += space;
        message.push(numberSign + space + currentMessage + space + numberSign);
    }
    message.push(numberSignRow);
    return message;
}

function printQueue(message, serverQueue) {
    alwaysLog("Printing queue");
    if (serverQueue != undefined) {
        let songString = "";
        let counter = 1;
        for (let i = 1; i < serverQueue.songs.length; i++) {
            if (serverQueue.songs[i].title != undefined) {
                songString +=
                    "\n**" + counter + ". " + serverQueue.songs[i].title + "**";
                counter++;
            }
        }
        if (songString == "") serverQueue.textChannel.send("Song queue empty!");
        else message.channel.send("Song queue:" + songString);
    } else {
        message.channel.send(
            "Song queue empty or bot is broken " + SADGE_EMOTE
        );
    }
}

client.login(token);
