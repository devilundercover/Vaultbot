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

// ─────────────────────────────────────────────
//  Speichert laufende Feedback-Sitzungen
//  userId → { schematicLabel, type, q1Stars, q2Stars, q1Text, q2Text, q3Answer }
// ─────────────────────────────────────────────
const feedbackSessions = new Map();

// ── Stern-Buttons ─────────────────────────────
function starRow(customIdPrefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${customIdPrefix}_1`).setLabel('⭐ 1').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${customIdPrefix}_2`).setLabel('⭐ 2').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${customIdPrefix}_3`).setLabel('⭐ 3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${customIdPrefix}_4`).setLabel('⭐ 4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${customIdPrefix}_5`).setLabel('⭐ 5').setStyle(ButtonStyle.Success),
  );
}

module.exports = {
  feedbackSessions,

  // ── Feedback-DM senden ───────────────────────
  async sendFeedbackRequest(user, schematicLabel, type = 'purchase') {
    try {
      const embed = new EmbedBuilder()
        .setTitle('💬 Feedback geben?')
        .setDescription(
          `Hey! 👋\n\n` +
          (type === 'purchase'
            ? `Dein Kauf der **${schematicLabel}** wurde erfolgreich abgeschlossen!\n\n`
            : `Dein Support-Ticket wurde geschlossen.\n\n`) +
          `Wir würden uns sehr über dein **anonymes Feedback** freuen — es dauert nur 1 Minute und hilft uns den Shop zu verbessern! 💚\n\n` +
          `*Dein Feedback wird anonym gepostet — kein Name, kein Account.*`
        )
        .setColor(0x2ECC71)
        .setFooter({ text: 'HugoSMP Schematics Shop' })
        .setTimestamp();

      const yesBtn = new ButtonBuilder()
        .setCustomId(`feedback_yes_${user.id}`)
        .setLabel('✅ Ja, Feedback geben')
        .setStyle(ButtonStyle.Success);

      const noBtn = new ButtonBuilder()
        .setCustomId(`feedback_no_${user.id}`)
        .setLabel('❌ Nein, danke')
        .setStyle(ButtonStyle.Secondary);

      await user.send({
        embeds:     [embed],
        components: [new ActionRowBuilder().addComponents(yesBtn, noBtn)],
      });

      // Session speichern
      feedbackSessions.set(user.id, { schematicLabel, type, step: 'start' });

    } catch (e) {
      console.error('Feedback-DM konnte nicht gesendet werden:', e);
    }
  },

  // ── User klickt "Ja" ─────────────────────────
  async handleYes(interaction, userId) {
    const session = feedbackSessions.get(userId);
    if (!session) {
      return interaction.update({ content: '❌ Diese Feedback-Sitzung ist abgelaufen.', embeds: [], components: [] });
    }

    feedbackSessions.set(userId, { ...session, step: 'q1' });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('💬 Frage 1 von 3 — Support')
          .setDescription('**Wie hat dir der allgemeine Support gefallen?**\n\nWähle eine Bewertung von 1-5 Sternen:')
          .setColor(0xF0A500)
          .setFooter({ text: 'Schritt 1 von 3' }),
      ],
      components: [starRow(`fb_q1_${userId}`)],
    });
  },

  // ── User klickt "Nein" ───────────────────────
  async handleNo(interaction, userId) {
    feedbackSessions.delete(userId);
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('👍 Kein Problem!')
          .setDescription('Danke für deinen Kauf! Falls du doch noch Feedback geben möchtest, öffne einfach ein Ticket.')
          .setColor(0x95A5A6),
      ],
      components: [],
    });
  },

  // ── Sterne für Frage 1 ───────────────────────
  async handleQ1Stars(interaction, userId, stars) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.update({ content: '❌ Sitzung abgelaufen.', embeds: [], components: [] });

    feedbackSessions.set(userId, { ...session, q1Stars: stars, step: 'q1_text' });

    // Modal für Textfeld Q1
    const modal = new ModalBuilder()
      .setCustomId(`fb_q1_text_${userId}`)
      .setTitle('Frage 1 — Support Details');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('q1_text')
          .setLabel(`Du gabst ${stars}⭐ — Möchtest du Details nennen?`)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Optional: Was hat dir gut/nicht gut gefallen? (kann leer gelassen werden)')
          .setRequired(false)
          .setMaxLength(300),
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Modal Q1 abgeschickt ─────────────────────
  async handleQ1Text(interaction, userId) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.reply({ content: '❌ Sitzung abgelaufen.', ephemeral: true });

    const q1Text = interaction.fields.getTextInputValue('q1_text') || '';
    feedbackSessions.set(userId, { ...session, q1Text, step: 'q2' });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('💬 Frage 2 von 3 — Bezahlung')
          .setDescription('**Wie zufrieden warst du mit dem Bezahlvorgang?**\n\nWähle eine Bewertung von 1-5 Sternen:')
          .setColor(0xF0A500)
          .setFooter({ text: 'Schritt 2 von 3' }),
      ],
      components: [starRow(`fb_q2_${userId}`)],
    });
  },

  // ── Sterne für Frage 2 ───────────────────────
  async handleQ2Stars(interaction, userId, stars) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.update({ content: '❌ Sitzung abgelaufen.', embeds: [], components: [] });

    feedbackSessions.set(userId, { ...session, q2Stars: stars, step: 'q2_text' });

    const modal = new ModalBuilder()
      .setCustomId(`fb_q2_text_${userId}`)
      .setTitle('Frage 2 — Bezahlung Details');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('q2_text')
          .setLabel(`Du gabst ${stars}⭐ — Möchtest du Details nennen?`)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Optional: War die Bezahlung einfach/kompliziert? (kann leer gelassen werden)')
          .setRequired(false)
          .setMaxLength(300),
      ),
    );

    await interaction.showModal(modal);
  },

  // ── Modal Q2 abgeschickt ─────────────────────
  async handleQ2Text(interaction, userId) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.reply({ content: '❌ Sitzung abgelaufen.', ephemeral: true });

    const q2Text = interaction.fields.getTextInputValue('q2_text') || '';
    feedbackSessions.set(userId, { ...session, q2Text, step: 'q3' });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('💬 Frage 3 von 3 — Weiterempfehlung')
          .setDescription('**Würdest du einen Kauf über den Server weiterempfehlen?**')
          .setColor(0xF0A500)
          .setFooter({ text: 'Schritt 3 von 3' }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`fb_q3_yes_${userId}`).setLabel('👍 Ja, auf jeden Fall!').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`fb_q3_no_${userId}`).setLabel('👎 Nein').setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },

  // ── Frage 3 beantwortet ──────────────────────
  async handleQ3(interaction, userId, answer) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.update({ content: '❌ Sitzung abgelaufen.', embeds: [], components: [] });

    feedbackSessions.set(userId, { ...session, q3Answer: answer, step: 'confirm' });

    const stars1 = '⭐'.repeat(session.q1Stars) + '☆'.repeat(5 - session.q1Stars);
    const stars2 = '⭐'.repeat(session.q2Stars) + '☆'.repeat(5 - session.q2Stars);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 Dein Feedback — Zusammenfassung')
          .setDescription('Bitte überprüfe dein Feedback bevor du es absendest:')
          .addFields(
            { name: '1️⃣ Support',        value: `${stars1}\n${session.q1Text || '*Kein Kommentar*'}`, inline: false },
            { name: '2️⃣ Bezahlung',      value: `${stars2}\n${session.q2Text || '*Kein Kommentar*'}`, inline: false },
            { name: '3️⃣ Weiterempfehlung', value: answer === 'yes' ? '👍 Ja' : '👎 Nein',             inline: false },
          )
          .setColor(0x2ECC71)
          .setFooter({ text: 'Dein Feedback wird anonym gepostet' }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`fb_submit_${userId}`).setLabel('✅ Feedback absenden').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`fb_cancel_${userId}`).setLabel('❌ Abbrechen').setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },

  // ── Feedback absenden ────────────────────────
  async handleSubmit(interaction, userId, client) {
    const session = feedbackSessions.get(userId);
    if (!session) return interaction.update({ content: '❌ Sitzung abgelaufen.', embeds: [], components: [] });

    const stars1 = '⭐'.repeat(session.q1Stars) + '☆'.repeat(5 - session.q1Stars);
    const stars2 = '⭐'.repeat(session.q2Stars) + '☆'.repeat(5 - session.q2Stars);
    const avgStars = ((session.q1Stars + session.q2Stars) / 2).toFixed(1);

    // Im Feedback-Channel posten
    try {
      const guild = client.guilds.cache.get(config.guildId);
      const feedbackChannel = guild?.channels.cache.get(config.feedbackChannelId);

      if (feedbackChannel) {        const feedbackEmbed = new EmbedBuilder()
          .setTitle(`📝 Neues Feedback${session.schematicLabel ? ` — ${session.schematicLabel}` : ''}`)
          .setDescription('*Anonym gepostet*')
          .addFields(
            { name: '1️⃣ Support',          value: `${stars1}\n${session.q1Text || '*Kein Kommentar*'}`,  inline: false },
            { name: '2️⃣ Bezahlung',        value: `${stars2}\n${session.q2Text || '*Kein Kommentar*'}`,  inline: false },
            { name: '3️⃣ Weiterempfehlung', value: session.q3Answer === 'yes' ? '👍 Ja' : '👎 Nein',      inline: true  },
            { name: '⭐ Ø Bewertung',       value: `${avgStars} / 5`,                                      inline: true  },
          )
          .setColor(session.q1Stars + session.q2Stars >= 7 ? 0x00FF00 : session.q1Stars + session.q2Stars >= 4 ? 0xF0A500 : 0xFF0000)
          .setTimestamp();

        await feedbackChannel.send({ embeds: [feedbackEmbed] });
      }
    } catch (e) {
      console.error('Feedback konnte nicht gepostet werden:', e);
    }

    feedbackSessions.delete(userId);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎉 Danke für dein Feedback!')
          .setDescription('Dein Feedback wurde anonym gepostet und hilft uns den Shop zu verbessern! 💚')
          .setColor(0x00FF00),
      ],
      components: [],
    });
  },

  // ── Feedback abbrechen ───────────────────────
  async handleCancel(interaction, userId) {
    feedbackSessions.delete(userId);
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Feedback abgebrochen')
          .setDescription('Kein Problem! Falls du später Feedback geben möchtest, öffne einfach ein Ticket.')
          .setColor(0x95A5A6),
      ],
      components: [],
    });
  },
};
