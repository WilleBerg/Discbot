const fetch = require('node-fetch');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('urban')
		.setDescription('Replies with urban definition!')
		.addStringOption(option => option.setName('term').setDescription('Search')),
	async execute(interaction) {
        await interaction.deferReply();
		const term = interaction.options.getString('term');
		const query = new URLSearchParams({ term });
		const { list } = await fetch(`https://api.urbandictionary.com/v0/define?${query}`)
			.then(response => response.json());
        if (!list.length) {
            return interaction.editReply(`No results found for ${term}`);
        }
        interaction.editReply(`${term}: \n${list[0].definition}`);
	},
};
