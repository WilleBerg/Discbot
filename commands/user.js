// const { SlashCommandBuilder } = require("@discordjs/builders");
import { SlashCommandBuilder } from '@discordjs/builders';

export const user = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Replies with user info!"),
    async execute(interaction) {
        await interaction.reply(
            `Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`
        );
    },
};
