// const { SlashCommandBuilder } = require("@discordjs/builders");
import { SlashCommandBuilder } from '@discordjs/builders';

export const server = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Replies with server info!"),
    async execute(interaction) {
        await interaction.reply(
            `Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`
        );
    },
};
