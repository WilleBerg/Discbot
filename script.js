import fetch from "node-fetch";

const { Client, Intents, MessageEmbed } = require('discord.js');
const { token } = require("./config.json");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	// ...
});

client.login(token);

//fetch('https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/Harry%20Potter%20Jr?api_key=RGAPI-a8afbb5f-2e08-47ab-8a16-7ce79649ccc4')
//    .then(res => res.json())
//    .then(data => console.log(data));