const fs = require('fs');
const fetch = require('node-fetch');
const { Client, Collection, Intents, VoiceChannel } = require('discord.js');
const { token, prefix, googleApi } = require('./config.json');
const { getNextScheduleEvent, getNextTime } = require('./scheduleMessage');
const ytdl = require('ytdl-core');
const ply = require('play-dl');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const {
	AudioPlayerStatus,
	StreamType,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
} = require('@discordjs/voice');

let timer = 0;

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for(const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const queue = new Map();

client.once('ready', () => {
	console.log('Ready!');
  setInterval( () => {
    if(timer > 0){
      timer -= 1000 * 60;
    } else {
      var channel = client.channels.cache.get("959114050275524728");
      channel.send({embeds: [getNextScheduleEvent()]});
      timer = getNextTime();
    }
  }, 1000 * 60);

});
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


    handleMessage(message, serverQueue);
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

function handleMessage(message, serverQueue){
  if (message.content.startsWith(`${prefix}play`)) {
      execute(message, serverQueue);
      return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
      skip(message, serverQueue);
      return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
      stop(message, serverQueue);
      return;
  } else if (message.content.startsWith(`${prefix}q`)){
      printQueue(message, serverQueue);
  } else if(message.content.startsWith(`${prefix}raindance`)){
      message.content = "!play https://www.youtube.com/watch?v=aMTLs4qfJtI";
      execute(message, serverQueue);
  } else if(message.content.startsWith(`${prefix}soviet`)){
      message.content = "!play https://www.youtube.com/watch?v=U06jlgpMtQs";
      execute(message, serverQueue);
  } else if(message.content.startsWith(`${prefix}credits`)){
      message.channel.send("<:gigachad:852944386816081990>@sylt<:gigachad:852944386816081990>");
  } else if(message.content.startsWith(`${prefix}help`)){
      message.channel.send("**!play** songName or Url - to play song\n**!skip** - to skip current song\n**!stop** - to stop bot completely\n**!q** to get current queue\n**!clearQ** - to clear the queue\n**!remove** number - to remove specific song from queue\n**!credits**");
  } else if(message.content.startsWith(`${prefix}clearQ`)){
      clearQueue(serverQueue);
  } else if(message.content.startsWith(`${prefix}remove`)){
      removeFromQueue(message, serverQueue);
  } else {
      message.channel.send("You need to enter a valid command!");
  }
}

function removeFromQueue(message, serverQueue){
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
      return message.channel.send(
          "You need to be in a voice channel to remove from the queue!"
      );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
          "I need the permissions to join and speak in your voice channel!"
      );
  }


  if(!isNaN(args[1]) && serverQueue != undefined && serverQueue.songs.length > (args[1]) && args[1] > 0){
    console.log("Current queue length" + serverQueue.songs.length);
    let emptyList = [];
    let songToRemove = serverQueue.songs[args[1]];
    for(let i = 0; i < serverQueue.songs.length; i++){
      if(serverQueue.songs[i].title != songToRemove.title){
        emptyList.push(serverQueue.songs[i]);
      }
    }
    serverQueue.songs = emptyList;
    message.channel.send(`Removed **${songToRemove.title}** from queue!`);
  } else {
    message.channel.send("Invalid number!");
  }
}

function clearQueue(serverQueue){
  if(serverQueue != undefined){
    serverQueue.songs = [];
    serverQueue.textChannel.send("Queue has been cleared!");
  }
}

function printQueue(message, serverQueue){
  if(serverQueue != undefined){
    let songString = "";
    let counter = 1;
    for(let i = 1; i < serverQueue.songs.length; i++) {
      if(serverQueue.songs[i].title != undefined) {
        songString += "\n**" + counter + ". " + serverQueue.songs[i].title + "**";
        counter++;
      }
    }
    if(songString == "") serverQueue.textChannel.send("Song queue empty!");
    else message.channel.send("Song queue:" + songString);
  } else {
      message.channel.send("Song queue empty or bot is broken <:Sadge:852903092315357204>");
    }
}

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
	
  let tmp = "";
	for(let i = 0; i < args.length; i++){
		if(i != 0) tmp += args[i] + " "	;
	}
	let args2 = await getVideoUrl(tmp);
  console.log(args2);
  let songInfo;
  try { songInfo = await ytdl.getInfo(args2); } catch (error) {
      console.error(error);
      return message.channel.send("Could not find video");
  }
  const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
  };
  
  if (!serverQueue) {
      const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
      player: null,
      guild: message.guild
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
        return message.channel.send(`**${song.title}** has been added to the queue!`);
    }
}

async function skip(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
    if (!serverQueue)
      return message.channel.send("There is no song that I could skip!");
    let rec = await getNextResource(serverQueue);
    if(rec != undefined) {
      serverQueue.player.play(rec);
      serverQueue.textChannel.send(`Skipping song.\nNext up is **${serverQueue.songs[0].title}**<a:pepeJAM:852902332164603935>`);
    }
    else {
      serverQueue.connection.destroy();
      serverQueue.textChannel.send(`Queue empty!\nIm leaving<a:peepoLeave:852903257256755250>`);
      queue.delete(serverQueue.guild.id);
    }
}
  
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
    
    serverQueue.connection.destroy();
    queue.delete(serverQueue.voiceChannel.guild.id);
    return message.channel.send("Stopping!\nQueue has been emptied.");
}

async function play(guild, song, connection) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    
    const stream = await ply.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);
    serverQueue.player = player;



    player.on(AudioPlayerStatus.Idle, async () => {
      const rec = await getNextResource(serverQueue);
      
      if(rec != undefined) {
        player.play(rec); 
        serverQueue.textChannel.send(`Now playing: **${serverQueue.songs[0].title}**<a:pepeJAM:852902332164603935>`);
      }
      else {
        connection.destroy();
        serverQueue.textChannel.send(`Queue empty!\nIm leaving<a:peepoLeave:852903257256755250>`);
        queue.delete(guild.id);
      }
      
    });
    player.on('error', error => {
      console.error(error.message);
      connection.destroy();
      serverQueue.textChannel.send(`Error: **${error.message}** <:Sadge:852903092315357204> \nDestroying connection`);
      queue.delete(serverQueue.voiceChannel.guild.id);
      return;
    });
    serverQueue.textChannel.send(`Start playing: **${song.title}**<a:pepeJAM:852902332164603935>`);

}

async function getNextResource(serverQueue){
    console.log("shifting queue...");
    serverQueue.songs.shift();
    console.log("creating stream...");
    if(serverQueue.songs[0] != undefined) {
      console.log("inside if statement ffs");
      const stream = await ply.stream(serverQueue.songs[0].url);
      console.log("creating audio resource...");
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      console.log("returning resource, will try playing...");
      return resource;
    } else return undefined;
    
}

async function getVideoUrl(searchValue){
    const { items } = await fetch(`https://www.googleapis.com/youtube/v3/search?q=${searchValue}&key=${googleApi}`).then(respone => respone.json());
    return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
}

client.login(token);
