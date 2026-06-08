const express = require('express');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits
} = require('discord.js');

// Render port fix
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is online!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'announce') {

    if (!interaction.member.permissions.has(
      PermissionFlagsBits.Administrator
    )) {
      return interaction.reply({
        content: 'Only admins can use this command.',
        ephemeral: true
      });
    }

    const message =
      interaction.options.getString('message');

    const channel = interaction.channel;

    await channel.send({
      content:
        `📢 @everyone\n**Announcement**\n${message}`
    });

    await interaction.reply({
      content: 'Announcement sent!',
      ephemeral: true
    });
  }
});

client.login(TOKEN);

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Announcement text')
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({
  version: '10'
}).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log('Slash command registered');
  } catch (error) {
    console.error(error);
  }
})();
