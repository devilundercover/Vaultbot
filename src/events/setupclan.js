const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupclan')
    .setDescription('Postet das Clan-Bewerbungs-Panel (nur Admin)'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.adminRoleId)) {
      return interaction.reply({ content: '❌ Nur Admins!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Clan Bewerbung — HugoSMP')
      .setDescription(
        '**Du möchtest unserem Clan beitreten?**\n\n' +
        'Klicke auf den Button unten um dich zu bewerben!\n\n' +
        '⚠️ **Wichtiger Hinweis:**\n' +
        'Mit deiner Bewerbung bestätigst du, dass du:\n' +
        '• **Nicht** in Minecraft cheatest\n' +
        '• Keine illegalen Dinge tust die gegen die **HugoSMP Regeln** verstoßen\n' +
        '• Ehrliche Angaben in deiner Bewerbung machst\n\n' +
        '*Falsche Angaben führen zum sofortigen Ausschluss!*'
      )
      .setColor(0xE74C3C)
      .setFooter({ text: 'HugoSMP Clan • Viel Erfolg!' })
      .setTimestamp();

    await interaction.reply({ content: '✅ Clan-Panel gepostet!', ephemeral: true });
    await interaction.channel.send({
      embeds:     [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('clan_apply')
            .setLabel('⚔️ Für Clan bewerben')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },
};
