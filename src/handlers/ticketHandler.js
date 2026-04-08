const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../../config');

const ticketSelections = new Map();
// Speichert welche Tickets noch auf Mod-Antwort warten
// channelId → userId des Ticket-Erstellers
const waitingForMod = new Map();

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

    const modal = new ModalBuilder()
      .setCustomId('ticket_open_modal')
      .setTitle('🎫 Ticket öffnen');

    const problemInput = new TextInputBuilder()
      .setCustomId('ticket_problem')
      .setLabel('Beschreibe kurz dein Anliegen')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('z.B. Ich habe ein Problem mit... / Ich habe eine Frage zu...')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(problemInput));
    await interaction.showModal(modal);
  },

  // ── Schritt 2: Modal → Ticket erstellen ──────
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
          // User kann SEHEN aber noch NICHT schreiben (wartet auf Mod)
          {
            id:    user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
            ],
            deny: [PermissionFlagsBits.SendMessages],
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

      // Ticket als "wartet auf Mod" markieren
      waitingForMod.set(channel.id, user.id);

      // ── Problem-Embed ─────────────────────────
      const problemEmbed = new EmbedBuilder()
        .setTitle('📋 Anliegen des Users')
        .setDescription(`${user} schreibt:\n\n> ${problem}`)
        .setColor(0xF0A500)
        .setFooter({ text: `Ticket von ${user.tag}` })
        .setTimestamp();

      // ── Info für User ─────────────────────────
      const waitEmbed = new EmbedBuilder()
        .setTitle('⏳ Bitte hab etwas Geduld!')
        .setDescription(
          `Hallo ${user}! 👋\n\n` +
          'Dein Anliegen wurde übermittelt. Ein **Mod oder Admin** wird sich so schnell wie möglich um dich kümmern.\n\n' +
          '**Du kannst noch keine Nachricht schreiben** — sobald ein Mod antwortet wirst du automatisch freigeschaltet und gepingt! 🔔'
        )
        .setColor(0x2ECC71)
        .setTimestamp();

      // ── Staff-Buttons ─────────────────────────
      const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Ticket schließen')
        .setStyle(ButtonStyle.Danger);

      const helpBtn = new ButtonBuilder()
        .setCustomId('ticket_need_help')
        .setLabel('🆘 Hilfe holen')
        .setStyle(ButtonStyle.Secondary);

      const startBtn = new ButtonBuilder()
        .setCustomId('ticket_start_handling')
        .setLabel('✅ Ticket annehmen')
        .setStyle(ButtonStyle.Success);

      const staffRow = new ActionRowBuilder().addComponents(startBtn, helpBtn, closeBtn);

      await channel.send({
        content:    `${user}`,
        embeds:     [problemEmbed, waitEmbed],
        components: [staffRow],
      });

      await interaction.editReply({
        content: `✅ Dein Ticket wurde erstellt: ${channel}\nBitte hab etwas Geduld — ein Mod oder Admin meldet sich bald!`,
      });

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Tickets:', error);
      await interaction.editReply({
        content: '❌ **Fehler beim Erstellen des Tickets!**\nBitte versuche es erneut oder kontaktiere einen Admin.',
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

  // ── Ticket annehmen → User freischalten ──────
  async startHandling(interaction) {
    const { channel, member, user, guild } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Nur Mods oder Admins können das Ticket annehmen!',
        ephemeral: true,
      });
    }

    const ticketOwnerId = waitingForMod.get(channel.id);
    if (!ticketOwnerId) {
      return interaction.reply({
        content: '❌ Dieses Ticket wurde bereits angenommen!',
        ephemeral: true,
      });
    }

    // User Schreibrechte geben
    try {
      await channel.permissionOverwrites.edit(ticketOwnerId, {
        ViewChannel:        true,
        SendMessages:       true,
        ReadMessageHistory: true,
        AttachFiles:        true,
      });
    } catch (e) {
      console.error('Fehler beim Freischalten des Users:', e);
    }

    waitingForMod.delete(channel.id);

    // Buttons updaten — startBtn entfernen
    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Ticket schließen')
      .setStyle(ButtonStyle.Danger);

    const helpBtn = new ButtonBuilder()
      .setCustomId('ticket_need_help')
      .setLabel('🆘 Hilfe holen')
      .setStyle(ButtonStyle.Secondary);

    await interaction.update({ components: [new ActionRowBuilder().addComponents(helpBtn, closeBtn)] });

    // User im Ticket pingen
    const ticketOwner = await guild.members.fetch(ticketOwnerId).catch(() => null);
    if (ticketOwner) {
      await channel.send({
        content: `${ticketOwner} — 🎉 Ein Mod ist jetzt für dich da! Du kannst jetzt schreiben.`,
      });
    }
  },

  // ── Hilfe holen (privater Ping an andere Staff) ──
  async needHelp(interaction) {
    const { channel, member, guild } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Nur Mods oder Admins können Hilfe anfordern!',
        ephemeral: true,
      });
    }

    // Ephemeral ping — nur Staff sieht es
    const adminCh = guild.channels.cache.get(config.adminTicketChannelId);
    if (adminCh) {
      const linkBtn = new ButtonBuilder()
        .setLabel('📂 Zum Ticket')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${channel.id}`);

      await adminCh.send({
        content:    `<@&${config.adminRoleId}> <@&${config.modRoleId}> — 🆘 **${interaction.user.tag}** braucht Hilfe im Ticket ${channel}!`,
        components: [new ActionRowBuilder().addComponents(linkBtn)],
      });
    }

    await interaction.reply({
      content:   '✅ Die anderen Mods und Admins wurden privat benachrichtigt!',
      ephemeral: true,
    });
  },

  // ── Ticket schließen (nur Staff) ─────────────
  async closeTicket(interaction) {
    const { member, channel, user, guild } = interaction;

    // Nur Staff darf schließen
    if (!isStaff(member)) {
      return interaction.reply({
        content:   '❌ Nur ein Mod oder Admin kann dieses Ticket schließen!',
        ephemeral: true,
      });
    }

    // Ticket-Ersteller herausfinden für DM
    const channelName    = channel.name;
    const usernameRaw    = channelName.replace(/^ticket-/, '');
    await guild.members.fetch().catch(() => {});
    const ticketOwner    = guild.members.cache.find(
      (m) => m.user.username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80) === usernameRaw
    );

    ticketSelections.delete(channel.id);
    waitingForMod.delete(channel.id);

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket wird geschlossen...')
      .setDescription(`Geschlossen von ${user}\nDer Channel wird in **5 Sekunden** gelöscht.`)
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // DM an Ticket-Ersteller
    if (ticketOwner && ticketOwner.id !== user.id) {
      await ticketOwner.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔒 Dein Ticket wurde geschlossen')
            .setDescription(
              `Dein Support-Ticket wurde von **${user.tag}** geschlossen.\n\n` +
              `Falls du noch Fragen oder Probleme hast, öffne einfach ein neues Ticket im Shop! 💚`
            )
            .setColor(0xFF5555)
            .setTimestamp(),
        ],
      }).catch(() => {});

      // Feedback anfragen
      const feedbackHandler = require('./feedbackHandler');
      setTimeout(() => {
        feedbackHandler.sendFeedbackRequest(ticketOwner.user, null, 'ticket');
      }, 2000);
    }

    setTimeout(() => {
      channel.delete(`Ticket geschlossen von ${user.tag}`).catch(console.error);
    }, 5000);
  },
};
