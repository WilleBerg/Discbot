// const { SlashCommandBuilder } = require("@discordjs/builders");
import { SlashCommandBuilder } from '@discordjs/builders';

export const pings = () => {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
        await interaction.reply("Pong!");
    },
};
