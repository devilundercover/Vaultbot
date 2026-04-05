const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config');
const { ticketSelections, isStaff } = require('./ticketHandler');

module.exports = {
  async selectSchematic(interaction) {
    const selectedKey = interaction.values[0];
    const schematic   = config.getSchematic(selectedKey);

    if (!schematic) {
      return interaction.reply({ content: '❌ Unbekannte Schematic!', ephemeral: true });
    }

    ticketSelections.set(interaction.channel.id, selectedKey);

    const embed = new EmbedBuilder()
      .setTitle(`${schematic.emoji} Ausgewählt: ${schematic.label}`)
      .setDescription(
        `Du hast die **${schematic.emoji} ${schematic.label}** ausgewählt!\n\n` +
        `💰 **Preis:** \`${schematic.priceFormatted}\`\n\n` +
        '**Was passiert jetzt?**\n' +
        '• Ein Admin oder Mod meldet sich gleich bei dir\n' +
        '• Führe die Zahlung durch\n' +
        '• Nach Bestätigung erhältst du sofort Zugriff! 🎉\n\n' +
        '⚠️ *Der grüne Button ist nur für Admins & Mods nutzbar.*'
      )
      .setColor(0xF0A500)
      .setTimestamp();

    const confirmBtn = new ButtonBuilder()
      .setCustomId('confirm_payment')
      .setLabel('✅ Zahlung bestätigen (Admin/Mod)')
      .setStyle(ButtonStyle.Success);

    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('❌ Ticket schließen')
      .setStyle(ButtonStyle.Danger);

    await interaction.update({ embeds: [], components: [] });
    await interaction.channel.send({
      embeds:     [embed],
      components: [new ActionRowBuilder().addComponents(confirmBtn, closeBtn)],
    });
  },

  async confirmPayment(interaction) {
    const { member, guild, channel, user } = interaction;

    // Admin ODER Mod darf bestätigen
    if (!isStaff(member)) {
      return interaction.reply({
        content:   '❌ **Nur Admins oder Mods können Zahlungen bestätigen!**',
        ephemeral: true,
      });
    }

    const selectedKey = ticketSelections.get(channel.id);
    if (!selectedKey) {
      return interaction.reply({
        content:   '❌ **Keine Schematic ausgewählt!**\nDer User muss zuerst eine Schematic aus dem Dropdown auswählen.',
        ephemeral: true,
      });
    }

    const schematic = config.getSchematic(selectedKey);
    if (!schematic) {
      return interaction.reply({ content: '❌ Ungültige Schematic!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const usernameRaw = channel.name.replace(/^ticket-/, '');
      await guild.members.fetch();
      const ticketMember = guild.members.cache.find(
        (m) => m.user.username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80) === usernameRaw,
      );

      if (!ticketMember) {
        return interaction.editReply({
          content:
            '❌ **Konnte den Ticket-Ersteller nicht finden!**\n' +
            'Möglicherweise hat der User den Server verlassen.',
        });
      }

      if (!schematic.roleId) {
        return interaction.editReply({
          content:
            `❌ **Rollen-ID für "${schematic.label}" fehlt!**\n` +
            `Trage \`${schematic.roleEnvVar}\` in die \`.env\` Datei ein.`,
        });
      }

      const role = guild.roles.cache.get(schematic.roleId);
      if (!role) {
        return interaction.editReply({
          content: `❌ **Rolle für "${schematic.label}" nicht gefunden!**\nRollen-ID: \`${schematic.roleId}\``,
        });
      }

      if (!ticketMember.roles.cache.has(schematic.roleId)) {
        await ticketMember.roles.add(
          role,
          `Kauf bestätigt: ${schematic.label} (${schematic.priceFormatted}) – von ${user.tag}`,
        );
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Zahlung bestätigt!')
        .setDescription(
          `🎉 Herzlichen Glückwunsch, ${ticketMember}!\n\n` +
          `Deine Zahlung für **${schematic.emoji} ${schematic.label}** wurde von ${user} bestätigt.\n\n` +
          `💰 **Bezahlter Preis:** \`${schematic.priceFormatted}\`\n` +
          `🎭 **Erhaltene Rolle:** <@&${schematic.roleId}>\n\n` +
          'Du hast jetzt Zugriff auf den entsprechenden Channel!\n' +
          '**Viel Spaß mit deiner Farm!** 🏗️'
        )
        .setColor(0x00FF00)
        .setTimestamp();

      const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('❌ Ticket schließen')
        .setStyle(ButtonStyle.Danger);

      await interaction.editReply({
        embeds:     [successEmbed],
        components: [new ActionRowBuilder().addComponents(closeBtn)],
      });

      // ── Log ───────────────────────────────────────
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🧾 Neuer Kauf abgeschlossen')
          .setThumbnail(ticketMember.user.displayAvatarURL())
          .addFields(
            { name: '👤 Käufer',         value: `${ticketMember} (${ticketMember.user.tag})`, inline: false },
            { name: '📦 Schematic',      value: `${schematic.emoji} ${schematic.label}`,      inline: true  },
            { name: '💰 Preis',          value: `\`${schematic.priceFormatted}\``,            inline: true  },
            { name: '🎭 Rolle erhalten', value: `<@&${schematic.roleId}>`,                    inline: true  },
            { name: '✅ Bestätigt von',  value: `${user} (${user.tag})`,                      inline: false },
            { name: '📅 Zeitpunkt',      value: `<t:${Math.floor(Date.now() / 1000)}:F>`,     inline: false },
          )
          .setColor(0x2ECC71)
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }

      ticketSelections.delete(channel.id);

    } catch (error) {
      console.error('❌ Fehler bei Zahlungsbestätigung:', error);
      await interaction.editReply({
        content:
          '❌ **Fehler bei der Zahlungsbestätigung!**\n' +
          '• Hat der Bot Berechtigung Rollen zu vergeben?\n' +
          '• Liegt die Bot-Rolle über der Schematic-Rolle?\n' +
          '• Ist die Rollen-ID in .env korrekt?',
      });
    }
  },
};
