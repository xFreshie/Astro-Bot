// Load up the discord.js library
const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();
const ms = require("ms");
const send = require("quick.hook");
const superagent = require("superagent");
const fs = require("fs");
const economy = require('discord-eco');
const moment = require("moment");

const items = JSON.parse(fs.readFileSync('items.json', 'utf8'));
// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity(`on (IP)`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`on (IP)`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`on (IP)`);
});


client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if(command === "say") {
    if (!message.member.hasPermission("MANAGE_MESSAGES")) return message.reply("Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.");
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  if(command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit: 
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if (!message.member.hasPermission("KICK_MEMBERS")) return message.reply("Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.");
    
    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    // We can also support getting the member by ID, which would be args[0]
    let member = message.mentions.members.first() || message.guild.members.get(args[0]);
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.kickable) 
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");
    
    // slice(1) removes the first part, which here should be the user mention or ID
    // join(' ') takes all the various parts to make it a single string.
    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";
    
    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

  }
  
  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if (!message.member.hasPermission("BAN_MEMBERS")) return message.reply("Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.");
    
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.bannable) 
      return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";
    
    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
    message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
  }
  
  if(command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    if (!message.member.hasPermission("MANAGE_MESSAGES")) return message.reply("Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.");
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({limit: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }
  if (command === "mute") {
    if (!message.member.hasPermission("MANAGE_MESSAGES")) return message.reply("Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.");
    let tomute = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
    if (!tomute) return message.reply("Couldn't find user.");
    if (tomute.hasPermission("MANAGE_MESSAGES")) return message.reply("The user you are trying to mute is either the same, or higher role than you.");
    let muterole = message.guild.roles.find(`name`, "Muted");

    if (!muterole) {
        try {
            muterole = await message.guild.createRole({
                name: "Muted",
                color: "#000000",
                permissions: []
            })
            message.guild.channels.forEach(async (channel, id) => {
                await channel.overwritePermissions(muterole, {
                    SEND_MESSAGES: false,
                    ADD_REACTIONS: false
                });
            });
        } catch (e) {
            console.log(e.stack);
        }
    }

    let mutetime = args[1];
    if (!mutetime) return message.reply("You didn't specify a time!");

    await (tomute.addRole(muterole.id));
    message.reply(`<@${tomute.id}> has been muted for ${ms(ms(mutetime))}`);

    setTimeout(function() {
        tomute.removeRole(muterole.id);
        message.channel.send(`<@${tomute.id}> has been unmuted!`);
    }, ms(mutetime));

}
if(command === "serverinfo") {
  let online = message.guild.members.filter(member => member.user.presence.status !== 'offline');
  let day = message.guild.createdAt.getDate()
  let month = 1 + message.guild.createdAt.getMonth()
  let year = message.guild.createdAt.getFullYear()
   let sicon = message.guild.iconURL;
   let serverembed = new Discord.RichEmbed()
   .setAuthor(message.guild.name, sicon)
   .setFooter(`Server Created • ${day}.${month}.${year}`)
   .setColor("#7289DA")
   .setThumbnail(sicon)
   .addField("ID", message.guild.id, true)
   .addField("Name", message.guild.name, true)
   .addField("Owner", message.guild.owner.user.tag, true)
   .addField("Region", message.guild.region, true)
   .addField("Channels", message.guild.channels.size, true)
   .addField("Members", message.guild.memberCount, true)
   .addField("Humans", message.guild.memberCount - message.guild.members.filter(m => m.user.bot).size, true)
   .addField("Bots", message.guild.members.filter(m => m.user.bot).size, true)
   .addField("Online", online.size, true)
   .addField("Roles", message.guild.roles.size, true);
   message.channel.send(serverembed);

}
if(command === "lockdown") {
  if(!message.member.hasPermission("ADMINISTRATOR")) return message.channel.send("You can't use that command.");
  if (!client.lockit) client.lockit = [];
  let time = args.join(' ');
  let validUnlocks = ['release', 'unlock'];
  if (!time) return message.reply('You must set a duration for the lockdown in either hours, minutes or seconds');

  if (validUnlocks.includes(time)) {
    message.channel.overwritePermissions(message.guild.id, {
      SEND_MESSAGES: null
    }).then(() => {
      message.channel.sendMessage('Lockdown lifted.');
      clearTimeout(client.lockit[message.channel.id]);
      delete client.lockit[message.channel.id];
    }).catch(error => {
      console.log(error);
    });
  } else {
    message.channel.overwritePermissions(message.guild.id, {
      SEND_MESSAGES: false
    }).then(() => {
      message.channel.sendMessage(`Channel locked down for ${ms(ms(time), { long:true })}`).then(() => {

        client.lockit[message.channel.id] = setTimeout(() => {
          message.channel.overwritePermissions(message.guild.id, {
            SEND_MESSAGES: null
          }).then(message.channel.sendMessage('Lockdown lifted.')).catch(console.error);
          delete client.lockit[message.channel.id];
        }, ms(time));

      }).catch(error => {
        console.log(error);
      });
    });
  }
};
if(command === "warn") {
    if (!message.member.hasPermission("MANAGE_MESSAGES")) return message.reply("Sorry, but you don't have permission to use this!") 
   let warnedmember = message.guild.member(message.mentions.users.first()) || message.guild.members.get(args[0]);
    if (!warnedmember) return ("Please mention a user to warn.");
     let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";
   
    
      message.delete().catch(O_o=>{});
    message.channel.send(`***${warnedmember.user.tag} was warned!***`)
   await warnedmember.send(`You have been warned in ${message.guild.name} by ${message.author.username} for: ${reason}.`)
  
  }
if(command === "quiz") {
const quiz = [
  { q: "What color is the sky?", a: ["no color", "invisible"] },
  { q: "Name a soft drink brand.", a: ["pepsi", "coke", "rc", "7up", "sprite", "mountain dew"] },
  { q: "Name a programming language.", a: ["actionscript", "coffeescript", "c", "c++", "basic", "python", "perl", "javascript", "dotnet", "lua", "crystal", "go", "d", "php", "ruby", "rust", "dart", "java", "javascript"] },
  { q: "Who's a good boy?", a: ["you are", "whirl"] },
  { q: "Who created me?", a: ["Tea Cup", "Tea Cup#3343"] },
  { q: "What programming language am I made in?", a: ["javascript",] },
  { q: "Name the seventh planet from the Sun.", a: ["uranus"] },
  { q: "Name the World's biggest island.", a: ["greenland",] },
  { q: "What's the World's longest river?", a: ["amazon", "amazon river"] },
  { q: "Name the World's largest ocean.", a: ["pacific", "pacific ocean"] },
  { q: "Name one of the three primary colors.", a: ["blue", "red", "yellow"] },
  { q: "How many colors are there in a rainbow?", a: ["7", "seven"] },
  { q: "What do you call a time span of one thousand years?", a: ["millennium"] },
  { q: "How many squares are there on a chess board?", a: ["64", "sixty four"] },
  { q: "How many degrees are found in a circle?", a: ["360", "360 degrees", "three hundred sixty"] },
  { q: "The Dewey Decimal system is used to categorize what?", a: ["books"] },
  { q: "How many points does a compass have?", a: ["32", "thirty two"] },
  { q: "How many strings does a cello have?", a: ["4", "four"] },
  { q: "How many symphonies did Beethoven compose?", a: ["9", "nine"] },
  { q: "How many lines should a limerick have?", a: ["5", "five"] },
  { q: "What is the most basic language Microsoft made?", a: ["visual basic"] },
  { q: "What is the most complicated language?", a: ["binary"] },
  { q: "'OS' computer abbreviation usually means?", a: ["operating system"] }
];
const options = {
  max: 1,
  time: 30050,
  errors: ["time"],
};
  
  const item = quiz[Math.floor(Math.random() * quiz.length)];
    let serverembed = new Discord.RichEmbed()
   .setAuthor('Quiz')
   .setFooter('Provided by asteario')
   .setColor("RANDOM")
   .setThumbnail(`https://i1.wp.com/www.myandroidsolutions.com/wp-content/uploads/2016/12/Quiz-Time.png`)
   .addField(item.q, "30 seconds until timeout");
  await message.channel.send(serverembed);
  
  try {
    const collected = await message.channel.awaitMessages(answer => item.a.includes(answer.content.toLowerCase()), options);
    const winnerMessage = collected.first();
    return message.channel.send({embed: new Discord.RichEmbed()
                                 .setAuthor(`Winner: ${winnerMessage.author.tag}`, winnerMessage.author.displayAvatarURL)
                                 .setTitle(`Correct Answer: \`${winnerMessage.content}\``)
                                 .setFooter(`Question: ${item.q}`)
                                 .setColor(message.guild.me.displayHexColor)
                                })
  } catch (_) {
    return message.channel.send({embed: new Discord.RichEmbed()
                                 .setAuthor('No one got the answer in time!')
                                 .setTitle(`Correct Answer(s): \`${item.a}\``)
                                 .setFooter(`Question: ${item.q}`)
                                })
  }
}
if(command === "poll") {
if (!message.member.hasPermission('MANAGE_CHANNELS')) return message.channel.send(`Sorry, you don't have enough permissions.`);
if(!args[0]) return message.channel.send(`Proper Usage: -poll (question)`);
const embed = new Discord.RichEmbed()
.setColor('RANDOM')
.setFooter(`Please react to the following to vote.`)
.setDescription(args.join(' '))
.setTitle(`Poll by ${message.author.username}`);
let msg = await message.channel.send(embed);
await msg.react('✅');
await msg.react('❌');
message.delete({timeout: 1000});
}
if(command === "announce") {
       if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.send("You need the ADMINISTRATOR permission to run this comamnd!")
		   const color = args[0]
		   const text = args.slice(1).join(" ");
		   const author = message.author;
		   if (text.length < 1) return message.channel.send("Can not announce nothing");
		   //const colour = args.slice(2).join("");
		   const embed = new Discord.RichEmbed()
		   .setColor(message.guild.me.displayHexColor)
		   .setThumbnail(message.guild.iconURL)
		   .setDescription("**Announced by: " + message.author + "**\n\n" + text + "\n")
		   .setFooter("An announcment made at ")
		   .setTimestamp()
      send(message.channel, embed, {
        name: 'Announcment',
        icon: message.guild.iconURL
    });
	   
}
if(command === "help") {
message.react(client.emojis.get("474698341763252225"))
    .then(reaction => console.log(typeof reaction));
if(message.channel.type === "dm") {
message.author.send("**Please use that command in the asteario server.**");
}
   let emote1 = `http://www.emoji.co.uk/files/emoji-one/objects-emoji-one/1895-hammer-and-wrench.png`
   let emote2 = `https://media.giphy.com/media/Pwno8LO6ZWJ0c/giphy.gif`
   let emote3 = `https://i.gifer.com/23x6.gif`
   let sicon = message.guild.iconURL;
   let help1 = new Discord.RichEmbed()
   .setAuthor('Main Commands', sicon)
   .setFooter(`Provided by astro`)
   .setColor("#7289DA")
   .addField("a!help", "Shows you the help page")
   .addField("a!ping", "Shows you the ping of the bot")
   .addField("a!serverinfo", "Shows you the info about the server")
   message.author.send(help1);
	
   let help2 = new Discord.RichEmbed()
   .setAuthor('Admin & Moderation Commands', emote1)
   .setFooter(`Provided by astro`)
   .setColor("#7289DA")
   .addField("a!ban", "Bans the mentioned person with the given reason.")
   .addField("a!warn", "Warns the mentioned person with the given reason.")
   .addField("a!mute", "Mutes the mentioned person with the given reason.")
   .addField("a!purge", "Removes the given amount of messages from the channel.")
   .addField("a!kick", "Kicks the mentioned person with the given reason.")
   .addField("a!announce", "Announces the message in the channel.")
   .addField("a!poll", "Creates a poll with the given question.")
   message.author.send(help2);
	
   let help3 = new Discord.RichEmbed()
   .setAuthor("Fun Commands", emote2)
   .setFooter(`Provided by astro`)
   .setColor("#7289DA")
   .addField("a!quiz", "Starts a quiz game.")
   .addField("a!meme", "Sends a dank meme.")
   .addField("a!cat", "Sends a random cat image.")
   .addField("a!dog", "Sends a random dog image.")
   message.author.send(help3);
	
   let help4 = new Discord.RichEmbed()
   .setAuthor("Economy System [In Progress]", emote3)
   .setFooter(`Provided by astro`)
   .setColor("#7289DA")
   .addField("a!daily", "Claims the daily rewards")
   .addField("a!shop", "Opens up the shop menu.")
   .addField("a!work", "Works to earn money.")
   .addField("a!bal", "Checks your balance.")
   message.author.send(help4);
}
if(command === "cat") {
  let{body} = await superagent
  .get(`http://aws.random.cat/meow`);

  let catembed = new Discord.RichEmbed()
  .setColor("#7289DA")
  .setTitle("Meow 🐱")
  .setImage(body.file);

  message.channel.send(catembed);

}
if(command === "dog") {
    const { body } = await superagent
    .get('https://dog.ceo/api/breeds/image/random');
    const embed = new Discord.RichEmbed()
    .setColor(0x954D23)
    .setTitle("Woof :dog2:")
    .setImage(body.message)
    message.channel.send({embed})
    

}
if(command === "meme") {
  let{body} = await superagent
  .get(`https://api-to.get-a.life/meme`);

  let me = new Discord.RichEmbed()
  .setColor("#7289DA")
  .setTitle("lmAO!, funny.. right?")
  .setImage(body.url);

  message.channel.send(me);
}
if(command === "report") {
            if (!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send("**Sorry, but you do not have valid permissions! If you beleive this is a error, contact an owner.**");
            var rUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
            if (!rUser) return message.channel.send("**Couldn't find user.**");
            var rreason = args.join(" ").slice(22);
            if (!message.guild.member(client.user).hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) return message.channel.send('**I do not have the correct permissions.**').catch(console.error)

            var reportEmbed = new Discord.RichEmbed()
                .setDescription("Reports")
                .setColor("#ffffff")
                .addField("•Reported User", `${rUser} with ID: ${rUser.id}`)
                .addField("•Reported By", `${message.author} with ID: ${message.author.id}`)
                .addField("•Channel", message.channel)
                .addField("•Time", message.createdAt)
                .addField("•Reason", rreason);

            var reportschannel = message.guild.channels.find(`name`, "discord-reports");
            if (!reportschannel) return message.channel.send("**Can't find discord-reports channel.**");


            message.delete().catch(O_o => { });
            reportschannel.send(reportEmbed);
	message.channel.send("User successfuly reported.");
}
});
client.login(process.env.BOT_TOKEN);
