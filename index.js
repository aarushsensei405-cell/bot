const express = require('express');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

// Verify Role ID
const VERIFY_ROLE_ID =
  '1432277416109281371';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online`);
});

// AUTO REPLIES
client.on('messageCreate', async message => {

  // Ignore bot messages
  if (message.author.bot) return;

  const msg =
    message.content.toLowerCase();

  // IP reply
  if (msg === 'ip') {

    return message.reply(
`🚧 **The server IP has not been released yet!**

We're almost there — the IP will be shared here very soon. Stay tuned and keep an eye on this channel so you don't miss it!`
    );
  }

  // Rules reply
  if (msg === 'rules') {

    return message.reply(
`📜 **Rules Are Being Forged...**

⚒️ Our official server rules are currently being updated to make the experience fair, fun, and balanced for everyone.

🚧 **Rules will be released very soon!**

Until then:
✅ Use common sense  
✅ Respect all players & staff  
✅ Avoid unfair advantages or exploits

👀 Keep an eye on announcements — the full rulebook is coming soon!`
    );
  }
});

// INTERACTIONS
client.on(
  'interactionCreate',
  async interaction => {

    // Slash commands
    if (interaction.isChatInputCommand()) {

      // ANNOUNCE
      if (
        interaction.commandName ===
        'announce'
      ) {

        if (
          !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content:
              'Only admins can use this command.',
            ephemeral: true
          });
        }

        const message =
          interaction.options.getString(
            'message'
          );

        await interaction.channel.send({
          content:
`📢 @everyone
**Announcement**
${message}`
        });

        return interaction.reply({
          content:
            'Announcement sent!',
          ephemeral: true
        });
      }

      // VERIFY PANEL
      if (
        interaction.commandName ===
        'verifypanel'
      ) {

        if (
          !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content:
              'Admins only.',
            ephemeral: true
          });
        }

        const row =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'verify'
                )
                .setLabel(
                  '✅ Verify'
                )
                .setStyle(
                  ButtonStyle.Success
                )
            );

        await interaction.channel.send({
          content:
`🔐 **Verification Required**

Click the button below to verify yourself and gain access to the server.`,
          components: [row]
        });

        return interaction.reply({
          content:
            'Verify panel sent!',
          ephemeral: true
        });
      }
    }

    // VERIFY BUTTON
    if (interaction.isButton()) {

      if (
        interaction.customId ===
        'verify'
      ) {

        try {

          await interaction.member.roles.add(
            VERIFY_ROLE_ID
          );

          await interaction.reply({
            content:
              '✅ You are now verified!',
            ephemeral: true
          });

        } catch (error) {

          console.error(error);

          await interaction.reply({
            content:
              '❌ Failed to verify.',
            ephemeral: true
          });
        }
      }
    }
  }
);

client.login(TOKEN);

// Slash Commands
const commands = [

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription(
      'Send announcement'
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription(
          'Announcement text'
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('verifypanel')
    .setDescription(
      'Send verification panel'
    )

].map(command =>
  command.toJSON()
);

const rest = new REST({
  version: '10'
}).setToken(TOKEN);

(async () => {
  try {

    await rest.put(
      Routes.applicationCommands(
        CLIENT_ID
      ),
      { body: commands }
    );

    console.log(
      'Slash commands registered'
    );

  } catch (error) {
    console.error(error);
  }
})();
