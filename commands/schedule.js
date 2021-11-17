const fetch = require('node-fetch');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { GuildEmoji, MessageEmbed } = require('discord.js');
const { currentDirectory } = require('./commandConfig.json');
const schedule = require(`${currentDirectory}/schedules/schedule.json`);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedule')
		.setDescription('Replies with schedule!')
		.addStringOption(option => option.setName('type').setDescription('Search'))
        .addStringOption(option => option.setName('time').setDescription('Specific time you want to look at PS (tomorrow works here) PPS (not implemented yet)')),
	async execute(interaction) {
        await interaction.deferReply();
        const type = interaction.options.getString('type');
        const time = interaction.options.getString('time');


        if(type != null){
            console.log(`Starting search for ${type}`);
        }
        if(time != null){
            console.log(`Starting search at ${time}`);
            console.log("Still not implemented btw");
        }

        let currentDate = new Date();
        let cDay = currentDate.getDate();
        let cMonth = currentDate.getMonth() + 1;
        let cYear = currentDate.getFullYear();
        let cMinutes = currentDate.getMinutes();
        let cHours = currentDate.getHours();
        let todayDate = `${cYear}-${cMonth}-${cDay}`;
        let nmbr = 0;
        // Maybe implement two functions:
        // search by date and search by type
        // search by date is used when type is null and only looks for
        // the next lecture
        // search by type looks for the next event with matching type as type
        // starts at todays date
        if(type != null){
            nmbr = findByType(cHours, cMinutes, todayDate, type);
        } else {
            nmbr = findByDate(cDay,cHours,cMinutes,todayDate);
        }
        if(nmbr >= schedule.length){
            await interaction.editReply({ content: `Found no event in schedule with type ${type}`, ephemeral: true});
            console.log("We've gone to far :(");
        } else { //bad solution!! find how to end with reply
            // Kurs => Course ID, Kurs__1 => Course name 
            const { Startdatum, Starttid, Slutdatum, Sluttid, Kurs,
                Kurs__1, Lokal, Typ, Egen_text,  Bokningskommentar, 
                Personal, Klass, Undergrupp } = schedule[nmbr];
            
            
            console.log(Kurs__1);
            console.log(Typ);
            
            const testEmbed = new MessageEmbed()
                        .setColor('#0099FF')
                        .setTitle(`${Typ}`)
                        .setDescription(`${Lokal}`)
                        .addFields(
                            {name : `Kurs:`, value : (`${Kurs__1}`), inline : true},
                            {name : `Startar:` , value: `${Starttid}`, inline : true},
                            {name : `Slutar:`, value: `${Sluttid}`, inline: true},
                            {name : `Datum`, value : (`${Startdatum}`), inline : true}
                        );
            interaction.editReply({embeds: [testEmbed]});
        }
	},
};

function findByType(hours, minutes, todays, type){
    for(let i = 0 ; i < 140; i++){
        const { Startdatum, Typ } = schedule[i];
        const thisDate = Startdatum.split("-");
        const todaysDate = todays.split("-");
        const todayOrOlder = [
            thisDate[0] == todaysDate[0], //Same year?
            thisDate[1] >= todaysDate[1], //Same month or more?
            thisDate[2] >= todaysDate[2], //Same day or more?
            thisDate[0] > todaysDate[0] //Larger year?
        ]
        const requirments = [
            todayOrOlder[0] && todayOrOlder[1] && todayOrOlder[2],
            todayOrOlder[3]
        ]
        if(requirments[0] || requirments[1]){
            console.log("Found potential event!");
            console.log("Comparing types...");
            if(type.toLowerCase() === Typ.toLowerCase()){
                console.log("Matching types!");
                if(requirments[0] && thisDate[2] == todaysDate[2]){
                    const { Starttid } = schedule[i];
                    console.log(`Time for event: ${Starttid}`);
                    console.log(`Current time: ${hours}:${minutes}`);
                    console.log("Comparing time...");
                    const splitTime = Starttid.split(":");
                    if(splitTime[0] === hours){
                        if(splitTime[1] > minutes){
                            console.log("Found the next event!");
                            console.log();
                            return i;
                        }
                    } else if(splitTime[0] > hours){
                        console.log("Found the next event!");
                        console.log();
                        return i;
                    }
                    console.log("This event is in the past!");
                    console.log();
                } else {
                    console.log("Found the next event!")
                    return i;
                }
            } else {
                console.log("Wrong type!\n");
            }
        }    
    }
    return 140;
}

function findByDate(day, hours, minutes, todayDate){
    for(let i = 0; i < 140; i++){
        const { Startdatum } = schedule[i];
        console.log(Startdatum);
        const thisDate = Startdatum.split("-");
        if(thisDate[2] > day){
            console.log("Almost went too far!");
            break;
        }
        if(Startdatum === todayDate){
            console.log("Found matching date!");
            const { Starttid } = schedule[i];
            console.log(`Time for event: ${Starttid}`);
            console.log(`Current time: ${hours}:${minutes}`);
            console.log("Comparing time...");
            const splitTime = Starttid.split(":");
            if(splitTime[0] === hours){
                if(splitTime[1] > minutes){
                    console.log("Found the next event!");
                    console.log();
                    return i;
                }
            } else if(splitTime[0] > hours){
                console.log("Found the next event!");
                console.log();
                return i;
            }
            console.log("This event is in the past!");
            console.log();
        }
    }
    return 140;
}
