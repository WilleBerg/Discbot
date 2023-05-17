const {
    findAssumedWord,
    findByDate,
    findStartDateByBinarySearch,
    compareTime,
    findByType,
    getPrefix,
} = require("./commands/schedule");
const { currentDirectory } = require("./commands/commandConfig.json");
const schedule = require(`${currentDirectory}/schedules/schedule.json`);
const scheduleTypes = require(`${currentDirectory}/schedules/scheduleTypes.json`);
const { MessageEmbed } = require("discord.js");

let currentEventIndex = 0;
var firstTime = true;

function getNextScheduleEvent() {
    let nmbr = 0;

    nmbr = getNextEventIndex();

    currentEventIndex = nmbr;

    const { Startdatum, Starttid, Sluttid, Kurs__1, Lokal, Typ } =
        schedule[nmbr];

    console.log(`Event course: ${Kurs__1}!`);
    console.log(`Event type: ${Typ}`);

    const testEmbed = new MessageEmbed()
        .setColor("#0099FF")
        .setTitle(`${Typ}`)
        .setDescription(`${Lokal}`)
        .addFields(
            { name: `Kurs:`, value: `${Kurs__1}`, inline: true },
            { name: `Startar:`, value: `${Starttid}`, inline: true },
            { name: `Slutar:`, value: `${Sluttid}`, inline: true },
            { name: `Datum`, value: `${Startdatum}`, inline: true }
        );
    return testEmbed;
}

function getNextEventIndex() {
    var now = new Date();
    for (let i = 0; i < schedule.length; i++) {
        const { Startdatum, Starttid } = schedule[i];
        var then = getTimeInMilli(Startdatum, Starttid);
        if (
            then.getDate == now.getDate &&
            then.getMonth == now.getMonth &&
            then.getFullYear == now.getFullYear
        ) {
            if (then > now) {
                return i;
            }
        } else if (then > now) {
            return i;
        }
    }
    return -1;
}

function getTimeInMilli(startDate, startTime) {
    startDate = startDate.split("-");
    startTime = startTime.split(":");

    let startYear = startDate[0];
    let startMonth = startDate[1];
    let startDay = startDate[2];

    let startHours = startTime[0];
    let startMinutes = startTime[1];

    var then = new Date(
        startYear,
        startMonth - 1,
        startDay,
        startHours,
        startMinutes
    );

    return then;
}

function getNextTime(channel) {
    console.log("Getting next time");

    if (currentEventIndex < schedule.length) {
        currentEventIndex++;
    } else {
        console.log("Schdule is empty");
        return null;
    }

    const { Startdatum, Starttid } = schedule[currentEventIndex];

    var now = new Date();
    now.setHours(now.getHours() + 2);
    var then = getTimeInMilli(Startdatum, Starttid);
    then.setHours(then.getHours() + 2);
    console.log(now);
    console.log(then);

    var nextTime = then - now - 1000 * 60 * 15;
    if (nextTime < 0) {
        var aEvent = getAScheduleEvent(currentEventIndex);
        channel.send("And");
        channel.send({ embeds: [aEvent] });
        nextTime = getNextTime(channel);
    }
    return nextTime;
}

function getAScheduleEvent(number) {
    const { Startdatum, Starttid, Sluttid, Kurs__1, Lokal, Typ } =
        schedule[number];

    console.log(`Event course: ${Kurs__1}!`);
    console.log(`Event type: ${Typ}`);

    const testEmbed = new MessageEmbed()
        .setColor("#0099FF")
        .setTitle(`${Typ}`)
        .setDescription(`${Lokal}`)
        .addFields(
            { name: `Kurs:`, value: `${Kurs__1}`, inline: true },
            { name: `Startar:`, value: `${Starttid}`, inline: true },
            { name: `Slutar:`, value: `${Sluttid}`, inline: true },
            { name: `Datum`, value: `${Startdatum}`, inline: true }
        );
    return testEmbed;
}

module.exports = { getNextScheduleEvent, getNextTime };
