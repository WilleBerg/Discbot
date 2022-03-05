const fs = require('fs');
const { Client, Collection, Intents, VoiceChannel } = require('discord.js');
const { token, prefix } = require('./config.json');
const ytdl = require('ytdl-core');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const {
	AudioPlayerStatus,
	StreamType,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
} = require('@discordjs/voice');


client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for(const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const queue = new Map();

client.once('ready', () => {
	console.log('Ready!');});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
   client.once('disconnect', () => {
    console.log('Disconnect!');
});


client.on('messageCreate', async message => {
    if(message.author.bot) return;
    
    if(!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);


    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}queue`)){
        let songList = queue.get(message.guild.id);
        if(songList != undefined){
          let songString;
          for(const song in songList.songs) {
            songString += "\n" + song.title;
          }
          message.channel.send("Song queue: \n" + songString);
        } else {
          message.channel.send("Song queue empty or bot is broken <:Sadge:852903092315357204>");
        }
        
    } else {
        message.channel.send("You need to enter a valid command!");
    }
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	const command = client.commands.get(interaction.commandName);

    if(!command) return;

    try {
        await command.execute(interaction);
    } catch(error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true});
    }
});





async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }
    let songInfo;
    try { songInfo = await ytdl.getInfo(args[1]); } catch (error) {
        console.error(error);
        return message.channel.send("Could not find video");
    }
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    console.log("im here");
    if (!serverQueue) {
        const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
          var connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.channel.guild.id,
            adapterCreator: message.channel.guild.voiceAdapterCreator,
          });
          queueContruct.connection = connection;
          play(message.guild, queueContruct.songs[0], connection);
          } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }

  function skip(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
    if (!serverQueue)
      return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.destroy();
  }
  
  function stop(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
      
    if (!serverQueue)
      return message.channel.send("There is no song that I could stop!");
      
    serverQueue.songs = [];
    serverQueue.connection.destroy();
  }
  
  function play(guild, song, connection) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    
    const stream = ytdl(song.url, {filter: 'audioonly'});
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    const player = createAudioPlayer();

    try {
      player.play(resource);
      connection.subscribe(player);
      
      player.on(AudioPlayerStatus.Idle, () => connection.destroy());
      serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    } catch(err) {
      console.error(err);
      serverQueue.textChannel.send(`mb g, bot broken @sylt @sylt`);
    }
  }



client.login(token);
