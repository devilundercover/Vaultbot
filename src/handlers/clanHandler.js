const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../../config');

// Laufende Bewerbungen: userId → data
const applications = new Map();
// Cooldowns: userId → timestamp (ms)
const cooldowns = new Map();

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function isOnCooldown(userId) {
  const ts = cooldowns.get(userId);
  if (!ts) return false;
  return Date.now() - ts < ONE_MONTH_MS;
}

function cooldownLeft(userId) {
  const ts = cooldowns.get(userId);
  if (!ts) return null;
  const ms = ONE_MONTH_MS - (Date.now() - ts);
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days;
}

module.exports = {
  applications,
  cooldowns,

  // ── Bewerben Button ──────────────────────────
  async startApplication(interaction) {
    const { user } = interaction;

    if (isOnCooldown(user.id)) {
      const days = cooldownLeft(user.id);
      return interaction.reply({
        content: `❌ Du hast dich erst kürzlich beworben! Du kannst dich erst in **${days} Tagen** wieder bewerben.`,
        ephemeral: true,
      });
    }

    // Reset/Init
    applications.set(user.id, { step: 1 });

    const modal = new ModalBuilder()
      .setCustomId('clan_modal_1')
      .setTitle('Clan Bewerbung — Teil 1/3');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('mc_name').setLabel('1. Dein Minecraft Ingame-Name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('banned').setLabel('2. Wurdest du schon mal auf HugoSMP gebannt?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(300).setPlaceholder('z.B. Ja/Nein, weil...')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('age').setLabel('3. Wie alt bist du?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('playtime').setLabel('5. Wie viel Spielzeit hast du auf HugoSMP?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50).setPlaceholder('z.B. 200 Stunden')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('money').setLabel('6. Wie viel Geld hast du? (inkl. Investments)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50).setPlaceholder('z.B. 5 Millionen Coins')
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Modal 1 submitted ────────────────────────
  async handleModal1(interaction) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};

    data.mc_name  = interaction.fields.getTextInputValue('mc_name');
    data.banned   = interaction.fields.getTextInputValue('banned');
    data.age      = interaction.fields.getTextInputValue('age');
    data.playtime = interaction.fields.getTextInputValue('playtime');
    data.money    = interaction.fields.getTextInputValue('money');
    data.step     = 2;
    applications.set(user.id, data);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Frage 4 — Spielversion')
          .setDescription('**Spielst du Bedrock oder Java?**')
          .setColor(0xF0A500),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('clan_bedrock').setLabel('📱 Bedrock').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('clan_java').setLabel('💻 Java').setStyle(ButtonStyle.Success),
        ),
      ],
      ephemeral: true,
    });
  },

  // ── Bedrock/Java ausgewählt ──────────────────
  async handleVersion(interaction, version) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};
    data.version = version;
    data.step    = 3;
    applications.set(user.id, data);

    const modal = new ModalBuilder()
      .setCustomId('clan_modal_2')
      .setTitle('Clan Bewerbung — Teil 2/3');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('role').setLabel('7. Deine Rolle im Clan (Builder, PVP...)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('time').setLabel('8. Wie viel Zeit kannst du investieren?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setPlaceholder('z.B. 2-3h täglich, Meetings möglich')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('prev_clan').setLabel('9. Warst du schon in einem Clan? Warum weg?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300).setPlaceholder('Nein / Ja, bei... weil...')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('progress').setLabel('10. Aktueller Fortschritt? (Gear, Base, Farms...)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('why_join').setLabel('11. Warum möchtest du unserem Clan beitreten?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Modal 2 submitted ────────────────────────
  async handleModal2(interaction) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};

    data.role      = interaction.fields.getTextInputValue('role');
    data.time      = interaction.fields.getTextInputValue('time');
    data.prev_clan = interaction.fields.getTextInputValue('prev_clan');
    data.progress  = interaction.fields.getTextInputValue('progress');
    data.why_join  = interaction.fields.getTextInputValue('why_join');
    data.step      = 4;
    applications.set(user.id, data);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Fragen 12 & 13')
          .setDescription('**12. Hast du ein funktionierendes Mikrofon?**')
          .setColor(0xF0A500),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('clan_mic_yes').setLabel('✅ Ja').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('clan_mic_no').setLabel('❌ Nein').setStyle(ButtonStyle.Danger),
        ),
      ],
      ephemeral: true,
    });
  },

  // ── Mikrofon Ja/Nein ─────────────────────────
  async handleMic(interaction, answer) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};
    data.mic  = answer;
    data.step = 5;
    applications.set(user.id, data);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Frage 13')
          .setDescription('**Bist du bereit, aktiv im Voicechat zu sein?**')
          .setColor(0xF0A500),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('clan_voice_yes').setLabel('✅ Ja').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('clan_voice_no').setLabel('❌ Nein').setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },

  // ── Voice Ja/Nein ────────────────────────────
  async handleVoice(interaction, answer) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};
    data.voice = answer;
    data.step  = 6;
    applications.set(user.id, data);

    const modal = new ModalBuilder()
      .setCustomId('clan_modal_3')
      .setTitle('Clan Bewerbung — Teil 3/3');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('screenshot')
          .setLabel('Screenshot-Link (HugoSMP Stats)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder('Link zu einem Screenshot mit Money & Spielzeit')
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Modal 3 submitted → Zusammenfassung ──────
  async handleModal3(interaction) {
    const { user } = interaction;
    const data = applications.get(user.id) || {};

    data.screenshot = interaction.fields.getTextInputValue('screenshot');
    data.step       = 7;
    applications.set(user.id, data);

    const summaryEmbed = new EmbedBuilder()
      .setTitle('📋 Deine Bewerbung — Zusammenfassung')
      .setDescription('Bitte überprüfe alles bevor du absendest!')
      .addFields(
        { name: '1. MC-Name',       value: data.mc_name,    inline: true },
        { name: '3. Alter',         value: data.age,         inline: true },
        { name: '4. Version',       value: data.version,     inline: true },
        { name: '2. Gebannt?',      value: data.banned,      inline: false },
        { name: '5. Spielzeit',     value: data.playtime,    inline: true },
        { name: '6. Geld',          value: data.money,       inline: true },
        { name: '7. Rolle',         value: data.role,        inline: true },
        { name: '8. Zeit',          value: data.time,        inline: false },
        { name: '9. Vorheriger Clan', value: data.prev_clan, inline: false },
        { name: '10. Fortschritt',  value: data.progress,    inline: false },
        { name: '11. Warum beitreten?', value: data.why_join, inline: false },
        { name: '12. Mikrofon',     value: data.mic,         inline: true },
        { name: '13. Voicechat',    value: data.voice,       inline: true },
        { name: '📸 Screenshot',    value: data.screenshot,  inline: false },
      )
      .setColor(0x2ECC71);

    await interaction.reply({
      embeds:     [summaryEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('clan_submit').setLabel('✅ Bewerbung absenden').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('clan_cancel').setLabel('❌ Abbrechen').setStyle(ButtonStyle.Danger),
        ),
      ],
      ephemeral: true,
    });
  },

  // ── Bewerbung absenden ───────────────────────
  async submitApplication(interaction, client) {
    const { user, guild } = interaction;
    const data = applications.get(user.id);

    if (!data) {
      return interaction.update({ content: '❌ Sitzung abgelaufen.', embeds: [], components: [] });
    }

    // Cooldown setzen
    cooldowns.set(user.id, Date.now());
    applications.delete(user.id);

    // DM an User
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Bewerbung eingegangen!')
          .setDescription(
            'Vielen Dank für deine Bewerbung! 🎉\n\n' +
            'Wir werden sie so schnell wie möglich prüfen und uns bei dir melden.\n\n' +
            '*Bitte hab etwas Geduld!* 💚'
          )
          .setColor(0x2ECC71)
          .setTimestamp(),
      ],
    }).catch(() => {});

    // Benachrichtigung im Admin-Ticket-Channel
    const adminCh = client.guilds.cache.get(config.guildId)?.channels.cache.get(config.adminTicketChannelId);
    if (adminCh) {
      const adminEmbed = new EmbedBuilder()
        .setTitle('📝 Neue Clan-Bewerbung!')
        .setDescription(
          `**${user.tag}** hat sich für den Clan beworben!\n\n` +
          `👤 **Discord:** ${user}\n` +
          `🎮 **MC-Name:** \`${data.mc_name}\`\n` +
          `🕐 **Zeitpunkt:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setThumbnail(user.displayAvatarURL())
        .setColor(0xF0A500)
        .setTimestamp();

      // Alle Antworten als JSON speichern für den "Anzeigen" Button
      const appId = `${user.id}_${Date.now()}`;
      // Temporär in Map speichern
      module.exports._pendingReviews = module.exports._pendingReviews || new Map();
      module.exports._pendingReviews.set(appId, { data, userId: user.id, userTag: user.tag });

      await adminCh.send({
        content:    `<@&${config.adminRoleId}> <@&${config.modRoleId}> — Neue Bewerbung!`,
        embeds:     [adminEmbed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`clan_review_${appId}`).setLabel('📋 Antworten anzeigen').setStyle(ButtonStyle.Primary),
          ),
        ],
      });
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎉 Bewerbung abgesendet!')
          .setDescription('Deine Bewerbung wurde erfolgreich eingereicht! Du bekommst eine DM wenn wir uns entschieden haben.')
          .setColor(0x00FF00),
      ],
      components: [],
    });
  },

  // ── Bewerbung abbrechen ──────────────────────
  async cancelApplication(interaction) {
    applications.delete(interaction.user.id);
    await interaction.update({
      embeds: [new EmbedBuilder().setTitle('❌ Abgebrochen').setDescription('Deine Bewerbung wurde abgebrochen.').setColor(0xFF0000)],
      components: [],
    });
  },

  // ── Admin: Antworten anzeigen ────────────────
  async reviewApplication(interaction, appId) {
    const { isStaff } = require('./ticketHandler');
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Nur Admins/Mods!', ephemeral: true });
    }

    const pending = module.exports._pendingReviews?.get(appId);
    if (!pending) {
      return interaction.reply({ content: '❌ Bewerbung nicht mehr verfügbar.', ephemeral: true });
    }

    const { data, userId, userTag } = pending;

    const detailEmbed = new EmbedBuilder()
      .setTitle(`📋 Bewerbung von ${userTag}`)
      .addFields(
        { name: '1. MC-Name',         value: data.mc_name,    inline: true },
        { name: '3. Alter',           value: data.age,         inline: true },
        { name: '4. Version',         value: data.version,     inline: true },
        { name: '2. Gebannt?',        value: data.banned,      inline: false },
        { name: '5. Spielzeit',       value: data.playtime,    inline: true },
        { name: '6. Geld',            value: data.money,       inline: true },
        { name: '7. Rolle',           value: data.role,        inline: true },
        { name: '8. Zeit',            value: data.time,        inline: false },
        { name: '9. Vorheriger Clan', value: data.prev_clan,   inline: false },
        { name: '10. Fortschritt',    value: data.progress,    inline: false },
        { name: '11. Warum?',         value: data.why_join,    inline: false },
        { name: '12. Mikrofon',       value: data.mic,         inline: true },
        { name: '13. Voicechat',      value: data.voice,       inline: true },
        { name: '📸 Screenshot',      value: data.screenshot,  inline: false },
      )
      .setColor(0x3498DB);

    await interaction.reply({
      embeds:     [detailEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`clan_accept_${appId}`).setLabel('✅ Weiterleiten').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`clan_deny_${appId}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger),
        ),
      ],
      ephemeral: true,
    });
  },

  // ── Admin: Ablehnen ──────────────────────────
  async denyApplication(interaction, appId) {
    const modal = new ModalBuilder()
      .setCustomId(`clan_deny_reason_${appId}`)
      .setTitle('Bewerbung ablehnen');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Ablehnungsgrund')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Admin: Ablehnen Grund abgeschickt ────────
  async handleDenyReason(interaction, appId, client) {
    const reason  = interaction.fields.getTextInputValue('reason');
    const pending = module.exports._pendingReviews?.get(appId);

    await interaction.update({ content: '✅ Bewerber wurde abgelehnt.', embeds: [], components: [] });

    if (!pending) return;

    const { userId } = pending;
    module.exports._pendingReviews.delete(appId);

    try {
      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Bewerbung abgelehnt')
            .setDescription(
              'Wir haben deine Clan-Bewerbung leider abgelehnt.\n\n' +
              `**Grund:** ${reason}\n\n` +
              'Vielleicht klappt es beim nächsten Mal! Du kannst dich in 30 Tagen erneut bewerben. 💚'
            )
            .setColor(0xFF0000)
            .setTimestamp(),
        ],
      });
    } catch (e) {
      console.error('DM konnte nicht gesendet werden:', e);
    }
  },

  // ── Admin: Weiterleiten → Terminabfrage ──────
  async acceptApplication(interaction, appId, client) {
    const pending = module.exports._pendingReviews?.get(appId);
    if (!pending) {
      return interaction.reply({ content: '❌ Bewerbung nicht mehr verfügbar.', ephemeral: true });
    }

    const { userId } = pending;
    module.exports._pendingReviews.delete(appId);

    await interaction.update({ content: '✅ Bewerber wurde weitergeleitet!', embeds: [], components: [] });

    try {
      const user = await client.users.fetch(userId);

      // DM an Bewerber mit Terminabfrage
      const modal_placeholder = new EmbedBuilder()
        .setTitle('🎉 Du bist in der nächsten Runde!')
        .setDescription(
          'Herzlichen Glückwunsch! Deine Bewerbung hat uns überzeugt! 🎉\n\n' +
          'Bitte nenne uns deine **verfügbaren Termine** für ein kurzes Gespräch im Voice.\n\n' +
          'Klicke auf den Button unten!'
        )
        .setColor(0x00FF00);

      const dmMsg = await user.send({
        embeds:     [modal_placeholder],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`clan_dates_${userId}`)
              .setLabel('📅 Termine angeben')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      });

    } catch (e) {
      console.error('DM konnte nicht gesendet werden:', e);
    }
  },

  // ── Bewerber: Termine angeben ────────────────
  async showDatesModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('clan_dates_modal')
      .setTitle('Verfügbare Termine');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('dates')
          .setLabel('Wann bist du verfügbar? (Datum & Uhrzeit)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder('z.B. Mo-Fr ab 18 Uhr, Wochenende ganztags...')
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Bewerber: Termine abgeschickt ────────────
  async handleDatesSubmit(interaction, client) {
    const dates = interaction.fields.getTextInputValue('dates');
    const { user } = interaction;

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Termine eingegangen!')
          .setDescription('Deine Termine wurden übermittelt. Wir melden uns bald! 💚')
          .setColor(0x00FF00),
      ],
      components: [],
    });

    // Termine an Admins/Mods per DM
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    const datesEmbed = new EmbedBuilder()
      .setTitle('📅 Termine für Bewerbungsgespräch')
      .setDescription(
        `**${user.tag}** hat Termine für das Gespräch angegeben:\n\n` +
        `**Verfügbar:** ${dates}\n\n` +
        `**Discord:** <@${user.id}>`
      )
      .setColor(0x3498DB)
      .setTimestamp();

    // An Admin & Mods DMs schicken
    const adminCh = guild.channels.cache.get(config.adminTicketChannelId);
    if (adminCh) {
      await adminCh.send({
        content: `<@&${config.adminRoleId}> <@&${config.modRoleId}> — Bewerber hat Termine angegeben!`,
        embeds:  [datesEmbed],
      });
    }
  },
};
