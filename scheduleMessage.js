const { findAssumedWord, findByDate, findStartDateByBinarySearch, compareTime, findByType, getPrefix } = require('./commands/schedule');
const { currentDirectory } = require('./commands/commandConfig.json');
const schedule = require(`${currentDirectory}/schedules/schedule.json`);
const scheduleTypes = require(`${currentDirectory}/schedules/scheduleTypes.json`)
const { MessageEmbed } = require('discord.js');

let currentEventIndex = 0;

function getNextScheduleEvent(){
    let currentDate = new Date();
    let cDay = currentDate.getDate();
    let cMonth = currentDate.getMonth() + 1;
    let cYear = currentDate.getFullYear();
    let cMinutes = currentDate.getMinutes();
    let cHours = currentDate.getHours();
    let todayDate = `${cYear}-${cMonth}-${cDay}`;
    let nmbr = 0;

    console.log(todayDate);
    console.log(`${cHours}:${cMinutes}`);


    const firstIndex = findStartDateByBinarySearch(todayDate);


    nmbr = findByDate(cHours,cMinutes, firstIndex, todayDate);


    currentEventIndex = nmbr;

    const { Startdatum, Starttid, Sluttid,
        Kurs__1, Lokal, Typ } = schedule[nmbr];
    
    
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
                        );
    return testEmbed;
}

function getNextTime(){
    console.log("Getting next time");
    const { Startdatum, Starttid } = schedule[currentEventIndex];

    let startDate = Startdatum.split('-');
    let startTime = Starttid.split(':');

    let startYear = startDate[0];
    let startMonth = startDate[1];
    let startDay = startDate[2];

    let startHours = startTime[0];
    let startMinutes = startTime[1];

    console.log(`Next event starts at ${startHours}:${startMinutes} on ${startDay}/${startMonth}/${startYear}`);

    var now = new Date();
    now.setHours(now.getHours() + 2);
    var then = new Date(startYear, startMonth - 1, startDay, startHours, startMinutes);
    then.setHours(then.getHours() + 2);
    console.log(now);
    console.log(then);

    console.log(then - now);

    return (then - now) - (1000 * 60 * 15);

}


module.exports = { getNextScheduleEvent, getNextTime };