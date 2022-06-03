const { prefix } = require('./config.json');


function sendBoop(member, channel){
    channel.send(`welcome <@${member.id}>`);
    channel.send({files: ["./images/benboop.gif"]});
}
function boop(channel){
    channel.send({files: ["./images/benboop.gif"]});
}

module.exports= { sendBoop, boop };