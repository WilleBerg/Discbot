// Require the necessary discord.js classes
const fetch = require('node-fetch');
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply('Server info.');
	} else if (commandName === 'user') {
		await interaction.reply('User info.');
	} else if (commandName === 'urban'){
        await interaction.deferReply();
		const term = interaction.options.getString('term');
		const query = new URLSearchParams({ term });


		const { list } = await fetch(`https://api.urbandictionary.com/v0/define?${query}`)
			.then(response => response.json());
        console.log(list.length);
        if (!list.length) {
            return interaction.editReply(`No results found for ${term}`);
        }
        console.log(list[0].definition);
        interaction.editReply(`${term}: ${list[0].definition}`);
    }
});
// Login to Discord with your client's token
client.login(token);
