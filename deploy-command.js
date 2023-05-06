// const fs = require("fs");
import fs from 'fs';
// const { REST } = require("@discordjs/rest");
import { REST } from '@discordjs/rest';
// const { Routes } = require("discord-api-types/v9");
import { Routes } from 'discord-api-types/v9';
// const { clientId, guildId, token } = require("./config.json");
import config from './config.json' assert { type: "json" };
var clientId = config.clientId;
var guildId = config.guildId;
var token = config.token;

const commands = [];

const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });

        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
})();
