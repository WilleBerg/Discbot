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
