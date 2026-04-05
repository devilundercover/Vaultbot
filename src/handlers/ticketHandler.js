const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../../config');

const ticketSelections = new Map();

function safeChannelName(username) {
  return `ticket-${username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80)}`;
}

// Prüft ob ein Member Admin ODER Mod ist
function isStaff(member) {
  return (
    member.roles.cache.has(config.adminRoleId) ||
    member.roles.cache.has(config.modRoleId)
  );
}

module.exports = {
  ticketSelections,
  isStaff,

  async openTicket(interaction) {
    const { guild, user } = interaction;

    const expectedName = safeChannelName(user.username);
    const existing = guild.channels.cache.find(
      (c) => c.name === expectedName && c.type === ChannelType.GuildText,
    );
    if (existing) {
      return interaction.reply({
        content: `❌ Du hast bereits ein offenes Ticket: ${existing}`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await guild.channels.create({
        name:   expectedName,
        type:   ChannelType.GuildText,
        parent: config.ticketCategoryId || null,
        topic:  `Ticket von ${user.tag} | User-ID: ${user.id}`,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id:    user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          // Admin Rolle
          {
            id:    config.adminRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          // Mod Rolle
          {
            id:    config.modRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ],
      });

      const options = config.schematics.slice(0, 25).map((s) => ({
        label:       s.label,
        value:       s.key,
        emoji:       s.emoji,
        description: `${s.priceFormatted} • ${s.description}`,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_schematic')
        .setPlaceholder('📦 Wähle deine Schematic aus...')
        .addOptions(options);

      const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('❌ Ticket schließen')
        .setStyle(ButtonStyle.Danger);

      const priceList = config.schematics
        .map((s) => `${s.emoji} **${s.label}** — \`${s.priceFormatted}\``)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🎫 Dein Support-Ticket')
        .setDescription(
          `Hallo ${user}! 👋\n\n` +
          '**So läuft dein Kauf ab:**\n' +
          '1️⃣ Wähle deine Schematic unten im Dropdown\n' +
          '2️⃣ Warte auf den Admin/Mod — er meldet sich hier\n' +
          '3️⃣ Führe die Zahlung durch\n' +
          '4️⃣ Admin/Mod bestätigt → du erhältst Zugriff! 🎉'
        )
        .addFields({ name: '💰 Aktuelle Preisliste', value: priceList })
        .setColor(0x2ECC71)
        .setFooter({ text: `Ticket von ${user.tag}` })
        .setTimestamp();

      await channel.send({
        content:    `${user}`,
        embeds:     [embed],
        components: [
          new ActionRowBuilder().addComponents(selectMenu),
          new ActionRowBuilder().addComponents(closeBtn),
        ],
      });

      // ── Benachrichtigung in #admin-tickets ────────
      const adminTicketChannel = guild.channels.cache.get(config.adminTicketChannelId);
      if (adminTicketChannel) {
        const adminEmbed = new EmbedBuilder()
          .setTitle('🎫 Neues Ticket geöffnet!')
          .setDescription(
            `**${user.tag}** hat ein neues Ticket geöffnet!\n\n` +
            `👤 **User:** ${user} (${user.tag})\n` +
            `📋 **Channel:** ${channel}\n` +
            `🕐 **Zeitpunkt:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xF0A500)
          .setTimestamp();

        const linkBtn = new ButtonBuilder()
          .setLabel('📂 Zum Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${channel.id}`);

        await adminTicketChannel.send({
          content:    `<@&${config.adminRoleId}> <@&${config.modRoleId}> — Neues Ticket von ${user}!`,
          embeds:     [adminEmbed],
          components: [new ActionRowBuilder().addComponents(linkBtn)],
        });
      }

      await interaction.editReply({
        content: `✅ Dein Ticket wurde erstellt: ${channel}\nEin Admin oder Mod wird sich bald bei dir melden!`,
      });

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Tickets:', error);
      await interaction.editReply({
        content:
          '❌ **Fehler beim Erstellen des Tickets!**\n' +
          '• Bot hat keine `Channels verwalten` Berechtigung?\n' +
          '• Kategorie-ID in .env falsch?\n' +
          '• Rollen-IDs falsch?',
      });
    }
  },

  async closeTicket(interaction) {
    const { member, channel, user, guild } = interaction;

    const isOwner = channel.name === safeChannelName(user.username);

    if (!isStaff(member) && !isOwner) {
      return interaction.reply({
        content:   '❌ Nur der Ticket-Ersteller, ein Admin oder Mod kann dieses Ticket schließen!',
        ephemeral: true,
      });
    }

    ticketSelections.delete(channel.id);

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket wird geschlossen...')
      .setDescription(`Geschlossen von ${user}\nDer Channel wird in **5 Sekunden** gelöscht.`)
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔒 Ticket geschlossen')
            .addFields(
              { name: '📋 Channel',        value: `#${channel.name}`, inline: true },
              { name: '👤 Geschlossen von', value: `${user}`,          inline: true },
            )
            .setColor(0xFF5555)
            .setTimestamp(),
        ],
      });
    }

    setTimeout(() => {
      channel.delete(`Ticket geschlossen von ${user.tag}`).catch(console.error);
    }, 5000);
  },
};
