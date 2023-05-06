// const fetch = require("node-fetch");
import fetch from 'node-fetch';
// const { SlashCommandBuilder } = require("@discordjs/builders");
import { SlashCommandBuilder } from '@discordjs/builders';
// const { GuildEmoji, MessageEmbed } = require("discord.js");
import { GuildEmoji, MessageEmbed } from 'discord.js';
// const { currentDirectory } = require("./commandConfig.json");
// import commandConfig from './commandConfig.json' assert { type: "json" };
// var currentDirectory = commandConfig.currentDirectory;
// const { riotApiKey } = require(`${currentDirectory}/config.json`);
import config from './config.json' assert { type: "json" };
var riotApiKey = config.riotApiKey;

export const summoner = {
    data: new SlashCommandBuilder()
        .setName("summoner")
        .setDescription("Replies with name, level and latest game stats!")
        .addStringOption((option) =>
            option.setName("name").setDescription("Search")
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const term = interaction.options.getString("name");
        const query = new URLSearchParams({ term });

        //Fetches summoner information, status if summoner does not exist on euw
        const { id, puuid, name, summonerLevel, status } = await fetch(
            `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${term}?api_key=${riotApiKey}`
        ).then((response) => response.json());

        console.log(status);
        if (typeof status !== "undefined") {
            console.log("status is defined");
            await interaction.editReply({
                content: `There is no user with the name "${term}"!`,
                ephemeral: true,
            });
            console.log("moving on");
        } else {
            //Fetches latest game
            const list = await fetch(
                `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${riotApiKey}`
            ).then((response) => response.json());
            if (list.length !== 0) {
                const { info, metadata } = await fetch(
                    `https://europe.api.riotgames.com/lol/match/v5/matches/${list[0]}?api_key=${riotApiKey}`
                ).then((response) => response.json());

                //console.log(info.gameType);

                //console.log(info.gameMode);
                var kills = 0;
                var deaths = 0;
                var assists = 0;
                var win = "";
                var champ;
                for (let i = 0; i < 10; i++) {
                    if (info.participants[i].summonerName === name) {
                        kills = info.participants[i].kills;
                        deaths = info.participants[i].deaths;
                        champ = info.participants[i].championName;
                        assists = info.participants[i].assists;
                        if (info.participants[i].win === true) {
                            win = `Win <:gigachad:852944386816081990> :+1:`;
                        } else {
                            win = `Lost <:Sadge:852903092315357204>`;
                        }
                    }
                }
                var gamemode;
                if (info.gameMode === "CLASSIC") {
                    gamemode = "5v5";
                } else {
                    gamemode = info.gameMode;
                }
                const testEmbed = new MessageEmbed()
                    .setColor("#0099FF")
                    .setTitle(`${name}`)
                    .setDescription(`Level: ${summonerLevel}`)
                    .addFields(
                        {
                            name: `Gamemode:`,
                            value: `${gamemode}`,
                            inline: true,
                        },
                        {
                            name: `Gametype:`,
                            value: `${info.gameType}`,
                            inline: true,
                        },
                        { name: `Result:`, value: `${win}`, inline: true }
                    )
                    .addFields(
                        { name: "Champion:", value: champ, inline: true },
                        {
                            name: "KDA:",
                            value:
                                deaths < 10
                                    ? `${kills}/${deaths}/${assists}`
                                    : `${kills}/${deaths}/${assists} <:pepeLaugh2:852905715676872765>`,
                            inline: true,
                        }
                    );
                interaction.editReply({ embeds: [testEmbed] });
            } else {
                await interaction.editReply({
                    content: `The user "${term}" has no latest game!`,
                    ephemeral: true,
                });
            }
        }
    },
};
