const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { currentDirectory } = require('./commandConfig.json');
const schedule = require(`${currentDirectory}/schedules/schedule.json`);
const scheduleTypes = require(`${currentDirectory}/schedules/scheduleTypes.json`)

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedule')
		.setDescription('Replies with schedule!')
		.addStringOption(option => option.setName('type').setDescription('Search for specific type of lesson. Lecture is default if type left blank')),
        //.addStringOption(option => option.setName('time').setDescription('Specific time you want to look at PS (tomorrow works here) PPS (not implemented yet)')),
	async execute(interaction) {
        await interaction.deferReply();
        let type = interaction.options.getString('type');
        //let time = interaction.options.getString('time');

        let assumed = findAssumedWord(scheduleTypes, type);
        

        if(type != null){
            console.log(`\nStarting search for ${type}`);
        } else {
            type = "föreläsning";
            console.log("Type was left blank.\nLooking for next lecture");
        }

        let currentDate = new Date();
        let cDay = currentDate.getDate();
        let cMonth = currentDate.getMonth() + 1;
        let cYear = currentDate.getFullYear();
        let cMinutes = currentDate.getMinutes();
        let cHours = currentDate.getHours();
        let todayDate = `${cYear}-${cMonth}-${cDay}`;
        let nmbr = 0;

        console.log("\nFinding matching date....");
        const firstIndex = findStartDateByBinarySearch(todayDate);
        console.log("Found date closest to todays date at index " + firstIndex + "!\n");

        //Maybe make lecture the one to search for if type left blank
        //Find by date should perhaps be used if type is "next"
        if(type.toLowerCase() != "next"){
            nmbr = findByType(cHours, cMinutes, todayDate, assumed, firstIndex);
        } else {
            nmbr = findByDate(cHours,cMinutes, firstIndex, todayDate);
            
        }
        console.log(`Looked at ${nmbr - firstIndex} different objects!`);
        if(nmbr >= schedule.length){
            if(type != null){
                await interaction.editReply({ content: `Found no event in schedule with type ${type}`, ephemeral: true});
            } else {
                await interaction.editReply({content: `Found no event! (This is a bug)`, ephemeral: true});
            }
            
            console.log("We've gone to far :(");
        } else { //bad solution!! find how to end with reply
            // Kurs => Course ID, Kurs__1 => Course name 
            const { Startdatum, Starttid, Slutdatum, Sluttid, Kurs,
                Kurs__1, Lokal, Typ, Egen_text,  Bokningskommentar, 
                Personal, Klass, Undergrupp } = schedule[nmbr];
            
            
            console.log(`Event course: ${Kurs__1}!`);
            console.log(`Event type: ${Typ}`);
            
            const testEmbed = new MessageEmbed()
                        .setColor('#0099FF')
                        .setTitle(`${Typ}`)
                        .setDescription(`${Lokal}`)
                        .addFields(
                            {name : `Kurs:`, value : (`${Kurs__1}`), inline : true},
                            {name : `Startar:` , value: `${Starttid}`, inline : true},
                            {name : `Slutar:`, value: `${Sluttid}`, inline: true},
                            {name : `Datum`, value : (`${Startdatum}`), inline : true}
                        ).setFooter(type != "next" ? `I assumed you meant ${assumed.nameTranslated}` : "");
            interaction.editReply({embeds: [testEmbed]});
        }
	}, getPrefix, findAssumedWord, findByDate, findStartDateByBinarySearch, compareTime, findByType,
};

function getPrefix(word, length){
    if(length > word.length){
        return word;
    } else {
        return word.substring(0, length);
    }
}

function findAssumedWord(searchValues, searchedValue){
    if(searchedValue == null){
        return { name : "föreläsning", type : "type" , nameTranslated : "föreläsning" };
    }
    for(let i = 0; i < searchValues.length; i++){
        let currPrefix = getPrefix(searchValues[i].name, searchedValue.length);
        if(currPrefix == searchedValue){
            return searchValues[i];
        }
    }
    return { name : "föreläsning", type : "type" , nameTranslated : "föreläsning" };
}

function findStartDateByBinarySearch(todays){
    let start = 0;
    let end = schedule.length;

    const todayDate = Date.parse(todays);
    
    let potentialFind = -1;
    
    let lastEnd = 0;
    let lastStart = 0;
    while(true){
        if(end == lastEnd && start == lastStart){
            return Math.round((start + end) / 2)
        }
        let middle = Math.round((start + end) / 2);;
        const { Startdatum } = schedule[middle];
        const thisDate = Date.parse(Startdatum);

        lastEnd = end;
        lastStart = start;

        if(todayDate > thisDate){
            start = middle;
        } else if (todayDate < thisDate){
            end = middle;
        } else{
            potentialFind = middle;
            end = middle;
        }
    }
}

function findByType(hours, minutes, todays, object, firstIndex){
    let {name, type, nameTranslated} = object;
    for(let i = firstIndex ; i < schedule.length; i++){
        const {Typ, Startdatum, Starttid, Kurs__1} = schedule[i];
        console.log("Comparing types...");
        if(nameTranslated.toLowerCase() === Typ.toLowerCase() || nameTranslated.toLowerCase() == Kurs__1.toLowerCase()){
            console.log("Matching types!");
            if(Date.parse(todays) == Date.parse(Startdatum)){
                console.log(`Time for event: ${Starttid}`);
                console.log(`Current time: ${hours}:${minutes}`);
                console.log("Comparing time...");
                const splitTime = Starttid.split(":");
                if (compareTime(splitTime, hours, minutes)){
                    return i;
                }
            } else {
                console.log("Found the next event!")
                return i;
            }
        } else {
            console.log("Wrong type!\n");
        } 
    }
    return schedule.length;
}

function findByDate(hours, minutes, firstEventIndex, todaysDate){
    for(let i = firstEventIndex; i < schedule.length; i++){
        const { Startdatum, Starttid } = schedule[i];
        if(Date.parse(todaysDate) == Date.parse(Startdatum)){
            console.log(Startdatum);
            console.log(`Time for event: ${Starttid}`);
            console.log(`Current time: ${hours}:${minutes}`);
            console.log("Comparing time...");
            const splitTime = Starttid.split(":");
            if(compareTime(splitTime, hours, minutes)){
                return i;
            }
        } else {
            return i;
        }
        
    }
    return schedule.length;  
}
function compareTime(splitTime, hours, minutes){
    if(splitTime[0] === hours){
        if(splitTime[1] > minutes){
            console.log("Found the next event!");
            console.log();
            return true;
        }
    } else if(splitTime[0] > hours){
        console.log("Found the next event!");
        console.log();
        return true;
    }
    console.log("This event is in the past!");
    console.log();
    return false;
}