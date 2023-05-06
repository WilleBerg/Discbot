
function sendBoop(member, channel) {
    channel.send(`welcome <@${member.id}>`);
    channel.send({ files: ["./images/benboop.gif"] });
}
function boop(channel) {
    channel.send({ files: ["./images/benboop.gif"] });
}

export { sendBoop, boop }
