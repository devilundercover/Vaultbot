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
    .setName('setupverify')
    .setDescription('Postet den Regelakzeptanz-Button (nur Admin)'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.adminRoleId)) {
      return interaction.reply({ content: '❌ Nur Admins!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📜 Willkommen auf HugoSMP Schematics!')
      .setDescription(
        '**Bevor du den Server nutzen kannst, lies bitte folgende Regeln:**\n\n' +
        '**📌 Serverregeln:**\n' +
        '1. Sei respektvoll gegenüber allen Mitgliedern\n' +
        '2. Kein Spam oder unerwünschte Werbung\n' +
        '3. Keine Beleidigungen oder Diskriminierung\n' +
        '4. Halte dich an die Discord-Nutzungsbedingungen\n' +
        '5. Käufe sind endgültig — kein Refund nach Erhalt der Schematic\n\n' +
        '**🛒 Shop-Regeln:**\n' +
        '6. Zahle nur den angegebenen Preis\n' +
        '7. Gib deinen korrekten Minecraft-Namen an\n' +
        '8. Bei Problemen → Ticket öffnen\n\n' +
        '**Wenn du alle Regeln gelesen und verstanden hast, klicke auf den Button unten!** ✅'
      )
      .setColor(0x2ECC71)
      .setFooter({ text: 'HugoSMP Schematics • Regelakzeptanz' })
      .setTimestamp();

    await interaction.reply({ content: '✅ Verify-Panel gepostet!', ephemeral: true });
    await interaction.channel.send({
      embeds:     [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('verify_accept')
            .setLabel('✅ Ich habe alle Infos und Regeln gelesen und akzeptiert')
            .setStyle(ButtonStyle.Success),
        ),
      ],
    });
  },
};
