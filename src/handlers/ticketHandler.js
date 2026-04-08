const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../../config');

const ticketSelections = new Map();

function safeChannelName(username) {
  return `ticket-${username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80)}`;
}

function isStaff(member) {
  return (
    member.roles.cache.has(config.adminRoleId) ||
    member.roles.cache.has(config.modRoleId)
  );
}

module.exports = {
  ticketSelections,
  isStaff,

  // ── Schritt 1: Modal anzeigen ────────────────
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

    // Modal anzeigen
    const modal = new ModalBuilder()
      .setCustomId('ticket_open_modal')
      .setTitle('🎫 Ticket öffnen');

    const problemInput = new TextInputBuilder()
      .setCustomId('ticket_problem')
      .setLabel('Beschreibe kurz dein Anliegen')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('z.B. Ich möchte die Bamboo Farm kaufen / Ich habe ein Problem mit...')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(problemInput));
    await interaction.showModal(modal);
  },

  // ── Schritt 2: Modal abgeschickt → Ticket erstellen ──
  async handleTicketModal(interaction) {
    const { guild, user } = interaction;
    const problem = interaction.fields.getTextInputValue('ticket_problem');

    await interaction.deferReply({ ephemeral: true });

    let channel;

    try {
      const expectedName = safeChannelName(user.username);

      channel = await guild.channels.create({
        name:   expectedName,
        type:   ChannelType.GuildText,
        parent: config.ticketCategoryId || null,
        topic:  `Ticket von ${user.tag} | User-ID: ${user.id}`,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id:    guild.members.me.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id:    user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
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

      // ── Problem-Embed ganz oben ───────────────
      const problemEmbed = new EmbedBuilder()
        .setTitle('📋 Anliegen des Users')
        .setDescription(`${user} schreibt:\n\n> ${problem}`)
        .setColor(0xF0A500)
        .setFooter({ text: `Ticket von ${user.tag}` })
        .setTimestamp();

      // ── Willkommens-Embed ─────────────────────
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 Support-Ticket')
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
        .setTimestamp();

      await channel.send({
        content:    `${user}`,
        embeds:     [problemEmbed, welcomeEmbed],
        components: [
          new ActionRowBuilder().addComponents(selectMenu),
          new ActionRowBuilder().addComponents(closeBtn),
        ],
      });

      await interaction.editReply({
        content: `✅ Dein Ticket wurde erstellt: ${channel}\nEin Admin oder Mod wird sich bald bei dir melden!`,
      });

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Tickets:', error);
      await interaction.editReply({
        content:
          '❌ **Fehler beim Erstellen des Tickets!**\n' +
          '• Bot hat keine `Channels verwalten` Berechtigung?\n' +
          '• Kategorie-ID falsch?\n' +
          '• Rollen-IDs falsch?',
      });
      return;
    }

    // ── Admin-Benachrichtigung ────────────────────
    try {
      const adminCh = guild.channels.cache.get(config.adminTicketChannelId);
      if (adminCh && channel) {
        const adminEmbed = new EmbedBuilder()
          .setTitle('🎫 Neues Ticket geöffnet!')
          .setDescription(
            `**${user.tag}** hat ein neues Ticket geöffnet!\n\n` +
            `👤 **User:** ${user} (${user.tag})\n` +
            `📋 **Channel:** ${channel}\n` +
            `💬 **Anliegen:** ${problem}\n` +
            `🕐 **Zeitpunkt:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xF0A500)
          .setTimestamp();

        const linkBtn = new ButtonBuilder()
          .setLabel('📂 Zum Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${channel.id}`);

        await adminCh.send({
          content:    `<@&${config.adminRoleId}> <@&${config.modRoleId}> — Neues Ticket von ${user}!`,
          embeds:     [adminEmbed],
          components: [new ActionRowBuilder().addComponents(linkBtn)],
        });
      }
    } catch (e) {
      console.error('Admin-Ticket Benachrichtigung fehlgeschlagen:', e);
    }
  },

  // ── Ticket schließen ─────────────────────────
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

    // Feedback anfragen — nur an den Ticket-Ersteller (nicht den Admin der schließt)
    const ticketOwnerName = channel.name.replace(/^ticket-/, '');
    const feedbackHandler = require('./feedbackHandler');
    setTimeout(async () => {
      try {
        await interaction.guild.members.fetch();
        const ticketOwner = interaction.guild.members.cache.find(
          (m) => m.user.username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80) === ticketOwnerName
        );
        // Nur Feedback anfragen wenn der Ticket-Ersteller jemand anderes als der Schließende ist
        if (ticketOwner && ticketOwner.id !== user.id) {
          feedbackHandler.sendFeedbackRequest(ticketOwner.user, null, 'ticket');
        }
      } catch (e) {
        console.error('Feedback nach Ticket-Schließung fehlgeschlagen:', e);
      }
    }, 2000);

    // Ticket schließen wird NICHT mehr in logs gepostet
    setTimeout(() => {
      channel.delete(`Ticket geschlossen von ${user.tag}`).catch(console.error);
    }, 5000);
  },
};
