const fetch = require('node-fetch');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { GuildEmoji, MessageEmbed } = require('discord.js');
const { currentDirectory } = require('./commandConfig.json');
const { schedule } = require(`${currentDirectory}/schedules/schedule.json`);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedule')
		.setDescription('Replies with schedule!')
		.addStringOption(option => option.setName('type').setDescription('Search')),
	async execute(interaction) {
        await interaction.deferReply();
        let nowDate = new Date();
        console.log(nowDate.getDate);
        console.log(nowDate.getMonth +  1);
        console.log(nowDate.getFullYear);
        console.log(`${nowDate.getFullYear}-${nowDate.getMonth + 1}-${nowDate.getDate}`);
		const term = interaction.options.getString('type');
        // Kurs => Course ID, Kurs__1 => Course name 
        const { Startdatum, Starttid, Slutdatum, Sluttid, Kurs,
            Kurs__1, Lokal, Typ, Egen_text,  Bokningskommentar, 
            Personal, Klass, Undergrupp } = schedule[0];


        interaction.editReply('Command still under development!');
	},
};
