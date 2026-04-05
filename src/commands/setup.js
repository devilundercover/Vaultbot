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
    .setName('setup')
    .setDescription('Postet das Shop-Panel im aktuellen Channel (nur Admin)'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.adminRoleId)) {
      return interaction.reply({
        content: '❌ Nur Admins können diesen Command verwenden!',
        ephemeral: true,
      });
    }

    // Preisliste dynamisch aufbauen
    const half  = Math.ceil(config.schematics.length / 2);
    const col1  = config.schematics.slice(0, half).map((s) => `${s.emoji} **${s.label}** — \`${s.priceFormatted}\``).join('\n');
    const col2  = config.schematics.slice(half).map((s) => `${s.emoji} **${s.label}** — \`${s.priceFormatted}\``).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏪 Minecraft Schematics Shop')
      .setDescription(
        '**Willkommen im offiziellen Schematics Shop!**\n\n' +
        'Kaufe hochwertige Minecraft Schematics und erhalte sofort Zugriff auf alle Baupläne.\n\n' +
        '**🛒 Direkt kaufen:**\n' +
        '1. Klicke auf **🛒 Jetzt kaufen**\n' +
        '2. Wähle deine Schematic aus\n' +
        '3. Gib deinen Minecraft-Namen ein\n' +
        '4. Bezahle ingame & klicke bestätigen\n' +
        '5. Admin bestätigt → du erhältst Zugriff! 🎉\n\n' +
        '**🎫 Fragen oder Probleme?**\n' +
        'Klicke auf **„Ticket öffnen"** um direkt mit uns zu schreiben!'
      )
      .addFields(
        { name: '📋 Verfügbare Schematics & Preise', value: col1, inline: true },
        { name: '\u200B', value: col2 || '\u200B', inline: true },
      )
      .setColor(0x2ECC71)
      .setFooter({ text: 'HugoSMP Schematics Shop • Wähle eine Option unten' })
      .setTimestamp();

    const buyBtn = new ButtonBuilder()
      .setCustomId('shop_buy')
      .setLabel('🛒 Jetzt kaufen')
      .setStyle(ButtonStyle.Success);

    const ticketBtn = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🎫 Ticket öffnen')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(buyBtn, ticketBtn);

    await interaction.reply({ content: '✅ Shop-Panel wurde gepostet!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};
