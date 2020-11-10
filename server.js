/**
 * Mission:
 * thinking on the bot. Do you think the basic bot can be made faster. I think we should have one that makes 
 * the welcome page the landing page for all new members and assigns them the role new. I would like to restrict 
 * their access to only channels to get enrolled until their roles are changed, etc. we would probably want to have the bot send 
 * them basic instruction messages to get them started with enrolling.
 */

const Discord = require('discord.js');
const fs = require('fs');
const bot = new Discord.Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});
const prefix = `p>`

//setup dotenv
require('dotenv').config();

//on login trigget
bot.on('ready', () => {
    console.log('Bot logged in and ready for operation.');
});

//on message being sent to the discord
bot.on('message', (msg) => {
    //make sure the message is valid (starts with prefix and isn't from a bot)
    if (!msg.content.startsWith(prefix) || msg.author.bot) return;

    //parse args from the message
    const args = msg.content.slice(prefix.length).trim().split(/ +/);

    //get the command.
    const command = args.shift().toLowerCase();

    switch (command) {

        //setjoinchannel command
        case 'config':
            configChannel(msg, args);
    }
});


async function configChannel(msg, args) {
    //check if args are valid
    if (args.length === 0) {
        msg.channel.send("Incorrect syntax, correct syntax is p>configure #RULES_CHANNEL_NAME");
        return;
    }

    //if the user doesn't have the create permissions role, they can't use this command
    if (!msg.member.roles.cache.find(role => role.permissions.has('MANAGE_CHANNELS'))) {
        msg.channel.send(`You don't have permission to use this command.`);
        return;
    }

    //get the id from the message
    let id = args[0].substring(2, 20);

    //get the channel by the loaded id
    let rulesChannel = msg.guild.channels.cache.find(ch => ch.id === id);

    //if the channel is undefined or null, return
    if (rulesChannel == undefined || rulesChannel == null) {
        msg.channel.send('The rules channel you tagged came back as undefined, please try again.');
        return;
    }

    //Send the rules message
    rulesChannel.send(`
    Welcome to the PHEnix Robotics Discord server!\nReact with 👍 to get accesss to other channels!
    `)
        .then(msg => msg.react("👍"))


    //path to data files
    let path = `./data/${msg.guild.id}.json`;

    //Create our role if we haven't yet
    if (!fs.existsSync(path)) {

        //create the role
        await msg.guild.roles.create({
            data: {
                name: 'Member',
                permissions: ['READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'ADD_REACTIONS', 'CHANGE_NICKNAME']
            }
        });

        //get the role that we just created
        let role = msg.guild.roles.cache.find(role => role.name === 'Member')

        //if the roles are borked try again ig
        if (role == undefined || role == null) {
            msg.channel.send('Error creating roles, try again.')
            return;
        }

        //create data to store locally
        let data = {
            'guild': msg.guild.id,
            'channel': msg.channel.id,
            'rules': rulesChannel.id,
            'role': role.id
        }

        //write the data to json so we have persisting storage of the welcome channel
        fs.writeFileSync(path, JSON.stringify(data))

        //print that the command went well
        msg.channel.send(`Configured new member log on channel <#${msg.channel.id}>, and configured rules channel <#${id}>!`)
    }
}


//when a new member joins the guild
bot.on('guildMemberAdd', (member) => {
    let guildId = member.guild.id;

    let path = `./data/${guildId}.json`;

    //try some file reading operations
    try {

        //check if the file exists
        if (!fs.existsSync(path)) return;

        //read the data
        let data = fs.readFileSync(path, {
            encoding: 'utf8',
            flag: 'r'
        });
        let json = JSON.parse(data);

        //get the channel by the loaded id
        let channel = member.guild.channels.cache.find(ch => ch.id === json['channel']);

        //if the channel is undefined or null, return
        if (channel == undefined || channel == null) return;

        //send the welcome message
        let embed = new Discord.MessageEmbed()
            .setColor("#0099ff")
            .setTitle(`Welcome ${member.user.username}!`)
            .setDescription(`Welcome to ${member.guild.name}! To unlock access to other rooms please view the #rules channel and configure your interests!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setAuthor(bot.user.username, bot.user.displayAvatarURL());

        channel.send(embed);
    } catch (err) {
        console.error(err);
    }

});

/**
//when a message reaction is added
bot.on('messagereac', (reaction, user) => {

    console.log("REACT ANDY KEKW");

    let guildId = reaction.message.guild.id;
    let channelId = reaction.message.channel.id;

    let path = `./data/${guildId}.json`;
    if(!fs.existsSync(path)) return;

    let data = fs.readFileSync(path, {encoding:'utf8', flag:'r'});
    let json = JSON.parse(data);

    //if the channel id === the rules id
    if(channelId !== json['rules']){
        return;
    }

    //if they react with the green check mark, give them the new role
    if(reaction.emoji.id == 766807538271649804){
        
    }
});*/

//TODO check if it's in the help channel (where else could it be tho lol)
bot.on('messageReactionAdd', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }

    let path = `./data/${reaction.message.guild.id}.json`
    if (!fs.existsSync(path)) return;

    //get file from local stuff
    let data = fs.readFileSync(path, {
        encoding: 'utf8',
        flag: 'r'
    });
    let json = JSON.parse(data);

    //if the channel id === the rules id
    if (reaction.message.channel.id !== json['rules']) {
        return;
    }

    //TODO save role id and use that instead
    let roleToAdd = reaction.message.guild.roles.cache.find(role => role.id == json['role'])
    let member = reaction.message.guild.members.cache.find(member => member.id === user.id);

    //add the "new" role to the member which gives them access to the channels they might wnat
    member.roles.add(roleToAdd);
});
bot.login(process.env.token);