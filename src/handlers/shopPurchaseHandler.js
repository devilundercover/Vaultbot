const {
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
const { isStaff } = require('./ticketHandler');

// ─────────────────────────────────────────────
//  Speichert laufende Käufe
//  userId → { schematicKey, minecraftName, messageId }
// ─────────────────────────────────────────────
const pendingPurchases = new Map();

module.exports = {
  pendingPurchases,

  // ── "Jetzt kaufen" Button → Dropdown zeigen ──
  async showShopDropdown(interaction) {
    const options = config.schematics.slice(0, 25).map((s) => ({
      label:       s.label,
      value:       s.key,
      emoji:       s.emoji,
      description: `${s.priceFormatted} • ${s.description}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_select_schematic')
      .setPlaceholder('📦 Wähle deine Schematic aus...')
      .addOptions(options);

    await interaction.reply({
      content: '**Wähle die Schematic die du kaufen möchtest:**',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      ephemeral: true,
    });
  },

  // ── Schematic gewählt → Modal für MC-Name ───
  async shopSchematicSelected(interaction) {
    const selectedKey = interaction.values[0];
    const schematic   = config.getSchematic(selectedKey);

    if (!schematic) {
      return interaction.reply({ content: '❌ Unbekannte Schematic!', ephemeral: true });
    }

    // Auswahl merken
    pendingPurchases.set(interaction.user.id, { schematicKey: selectedKey });

    // Modal für Minecraft-Name
    const modal = new ModalBuilder()
      .setCustomId('shop_minecraft_name_modal')
      .setTitle(`${schematic.emoji} ${schematic.label} kaufen`);

    const mcNameInput = new TextInputBuilder()
      .setCustomId('minecraft_name')
      .setLabel('Dein Minecraft Ingame-Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. Steve123')
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(16);

    modal.addComponents(new ActionRowBuilder().addComponents(mcNameInput));
    await interaction.showModal(modal);
  },

  // ── Modal abgeschickt → DM senden ───────────
  async handleMinecraftNameModal(interaction) {
    const minecraftName = interaction.fields.getTextInputValue('minecraft_name');
    const userId        = interaction.user.id;
    const purchase      = pendingPurchases.get(userId);

    if (!purchase) {
      return interaction.reply({
        content: '❌ Etwas ist schiefgelaufen. Bitte versuche es erneut.',
        ephemeral: true,
      });
    }

    const schematic = config.getSchematic(purchase.schematicKey);
    if (!schematic) {
      return interaction.reply({ content: '❌ Ungültige Schematic!', ephemeral: true });
    }

    // Minecraft-Name speichern
    pendingPurchases.set(userId, { ...purchase, minecraftName });

    await interaction.deferReply({ ephemeral: true });

    try {
      // ── DM an den User senden ─────────────────
      const dmEmbed = new EmbedBuilder()
        .setTitle(`🛒 Kaufanfrage: ${schematic.emoji} ${schematic.label}`)
        .setDescription(
          `Hey **${interaction.user.username}**! 👋\n\n` +
          `Du möchtest die **${schematic.emoji} ${schematic.label}** kaufen.\n\n` +
          `**📋 Kaufdetails:**\n` +
          `📦 Schematic: **${schematic.label}**\n` +
          `💰 Preis: **${schematic.priceFormatted}**\n` +
          `🎮 Dein MC-Name: **${minecraftName}**\n\n` +
          `**💳 Zahlung:**\n` +
          `Schreibe im Spiel auf **HugoSMP** folgendes:\n` +
          `\`\`\`/pay devil_undercover ${schematic.price}\`\`\`\n` +
          `Nachdem du bezahlt hast, klicke auf **„✅ Ich habe bezahlt"**.\n` +
          `Wenn du es dir anders überlegt hast, klicke auf **„❌ Abbrechen"**.`
        )
        .setColor(0x2ECC71)
        .setFooter({ text: 'HugoSMP Schematics Shop' })
        .setTimestamp();

      const paidBtn = new ButtonBuilder()
        .setCustomId(`shop_paid_${userId}`)
        .setLabel('✅ Ich habe bezahlt')
        .setStyle(ButtonStyle.Success);

      const cancelBtn = new ButtonBuilder()
        .setCustomId(`shop_cancel_${userId}`)
        .setLabel('❌ Abbrechen')
        .setStyle(ButtonStyle.Danger);

      const dmMessage = await interaction.user.send({
        embeds:     [dmEmbed],
        components: [new ActionRowBuilder().addComponents(paidBtn, cancelBtn)],
      });

      // DM-Message-ID speichern für spätere Bearbeitung
      pendingPurchases.set(userId, { ...purchase, minecraftName, dmMessageId: dmMessage.id });

      await interaction.editReply({
        content:
          '✅ **Ich habe dir eine DM geschickt!**\n' +
          'Schaue in deine Direktnachrichten und folge den Anweisungen dort.\n\n' +
          '⚠️ Falls du keine DM bekommst, aktiviere DMs von Servermitgliedern:\n' +
          'Einstellungen → Datenschutz → "Direktnachrichten von Servermitgliedern"',
      });

    } catch (error) {
      console.error('❌ Fehler beim Senden der DM:', error);
      await interaction.editReply({
        content:
          '❌ **Konnte dir keine DM schicken!**\n' +
          'Bitte aktiviere DMs:\n' +
          'Rechtsklick auf den Server → Datenschutzeinstellungen → DMs aktivieren\n\n' +
          'Oder öffne ein **Ticket** für manuelle Bearbeitung.',
      });
    }
  },

  // ── User klickt "Ich habe bezahlt" ──────────
  async handlePaid(interaction, userId) {
    const purchase = pendingPurchases.get(userId);

    if (!purchase) {
      return interaction.update({
        content: '❌ Diese Kaufanfrage ist abgelaufen. Bitte starte den Kauf erneut.',
        embeds:  [],
        components: [],
      });
    }

    const schematic = config.getSchematic(purchase.schematicKey);

    // DM updaten
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏳ Zahlung wird geprüft...')
          .setDescription(
            `Deine Zahlung für **${schematic.emoji} ${schematic.label}** wird vom Admin geprüft.\n\n` +
            `Du erhältst eine Benachrichtigung sobald der Admin bestätigt hat!\n\n` +
            `**Dein MC-Name:** ${purchase.minecraftName}`
          )
          .setColor(0xF0A500)
          .setTimestamp(),
      ],
      components: [],
    });

    // ── Admin benachrichtigen ─────────────────
    const guild = interaction.client.guilds.cache.get(config.guildId);
    if (!guild) return;

    const adminChannel = guild.channels.cache.get(config.adminTicketChannelId);
    if (!adminChannel) return;

    const member = await guild.members.fetch(userId).catch(() => null);

    const adminEmbed = new EmbedBuilder()
      .setTitle('💰 Neue Zahlungsbestätigung!')
      .setDescription(
        `**${interaction.user.tag}** behauptet bezahlt zu haben!\n\n` +
        `👤 **Discord:** ${interaction.user} (${interaction.user.tag})\n` +
        `🎮 **MC-Name:** \`${purchase.minecraftName}\`\n` +
        `📦 **Schematic:** ${schematic.emoji} ${schematic.label}\n` +
        `💰 **Preis:** \`${schematic.priceFormatted}\`\n` +
        `🕐 **Zeitpunkt:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `**Bitte überprüfe ob die Zahlung eingegangen ist!**\n` +
        `Ingame-Befehl zum Prüfen: \`/pay history\` oder Kontostand checken`
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setColor(0xF0A500)
      .setTimestamp();

    const confirmBtn = new ButtonBuilder()
      .setCustomId(`shop_confirm_${userId}`)
      .setLabel('✅ Zahlung bestätigen')
      .setStyle(ButtonStyle.Success);

    const denyBtn = new ButtonBuilder()
      .setCustomId(`shop_deny_${userId}`)
      .setLabel('❌ Ablehnen')
      .setStyle(ButtonStyle.Danger);

    await adminChannel.send({
      content:    `<@&${config.adminRoleId}> <@&${config.modRoleId}> — Neue Zahlungsbestätigung!`,
      embeds:     [adminEmbed],
      components: [new ActionRowBuilder().addComponents(confirmBtn, denyBtn)],
    });
  },

  // ── User klickt "Abbrechen" ──────────────────
  async handleCancel(interaction, userId) {
    pendingPurchases.delete(userId);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Kauf abgebrochen')
          .setDescription('Du hast den Kauf abgebrochen.\nFalls du dir anders überlegst, gehe einfach wieder in den Shop!')
          .setColor(0xFF0000)
          .setTimestamp(),
      ],
      components: [],
    });
  },

  // ── Admin bestätigt Zahlung ──────────────────
  async handleAdminConfirm(interaction, userId) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:   '❌ Nur Admins oder Mods können Zahlungen bestätigen!',
        ephemeral: true,
      });
    }

    const purchase = pendingPurchases.get(userId);
    if (!purchase) {
      return interaction.update({
        content:    '❌ Diese Kaufanfrage ist abgelaufen oder wurde bereits bearbeitet.',
        embeds:     [],
        components: [],
      });
    }

    const schematic = config.getSchematic(purchase.schematicKey);
    const guild     = interaction.guild;

    await interaction.deferUpdate();

    try {
      // Rolle vergeben
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return interaction.editReply({
          content: '❌ User nicht gefunden — möglicherweise hat er den Server verlassen.',
        });
      }

      const role = guild.roles.cache.get(schematic.roleId);
      if (role && !member.roles.cache.has(schematic.roleId)) {
        await member.roles.add(role, `Kauf bestätigt: ${schematic.label} – MC: ${purchase.minecraftName}`);
      }

      // Admin-Nachricht updaten
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Zahlung bestätigt!')
            .setDescription(
              `**${member.user.tag}** hat Zugriff auf **${schematic.emoji} ${schematic.label}** erhalten!\n\n` +
              `🎮 **MC-Name:** \`${purchase.minecraftName}\`\n` +
              `✅ **Bestätigt von:** ${interaction.user}\n` +
              `🎭 **Rolle vergeben:** <@&${schematic.roleId}>`
            )
            .setColor(0x00FF00)
            .setTimestamp(),
        ],
        components: [],
      });

      // DM an User senden
      await member.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎉 Vielen Dank für deinen Einkauf!')
            .setDescription(
              `Hey **${member.user.username}**! 👋\n\n` +
              `Vielen Dank für deine Zahlung! 💚\n\n` +
              `Deine **${schematic.emoji} ${schematic.label}** ist jetzt verfügbar!\n\n` +
              `**📂 So holst du deine Schematic ab:**\n` +
              `Gehe auf den **HugoSMP_Schematics** Server und schau in den Textkanälen nach — du hast jetzt Zugriff auf deinen eigenen Schematic-Channel!\n\n` +
              `Dort findest du alle Dateien und Infos zur Installation deiner Farm. 🏗️\n\n` +
              `**Viel Spaß mit deiner Farm!** ⛏️\n\n` +
              `*Bei Fragen einfach ein Ticket öffnen!*`
            )
            .setColor(0x00FF00)
            .setFooter({ text: 'HugoSMP Schematics Shop • Danke für dein Vertrauen!' })
            .setTimestamp(),
        ],
      }).catch(() => {});

      // Log
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🧾 Neuer Kauf abgeschlossen')
              .setDescription(
                `Es wurde eine **${schematic.emoji} ${schematic.label}** im Wert von **${schematic.priceFormatted}** gekauft!\n\n` +
                `✅ **Bestätigt von:** ${interaction.user}\n` +
                `📅 **Zeitpunkt:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                `*Danke für deinen Kauf! 💚*`
              )
              .setColor(0x2ECC71)
              .setTimestamp(),
          ],
        });
      }

      pendingPurchases.delete(userId);

      // Feedback anfragen (3 Sekunden nach Bestätigung)
      const feedbackHandler = require('./feedbackHandler');
      setTimeout(() => {
        feedbackHandler.sendFeedbackRequest(member.user, schematic.label, 'purchase');
     }, 3000);
    } catch (error) {
      console.error('Fehler in handleAdminConfirm:', error);
    }
  },
  async handleAdminDeny(interaction, userId) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:   '❌ Nur Admins oder Mods können Zahlungen ablehnen!',
        ephemeral: true,
      });
    }

    const purchase = pendingPurchases.get(userId);
    if (!purchase) {
      return interaction.update({
        content:    '❌ Diese Kaufanfrage ist abgelaufen.',
        embeds:     [],
        components: [],
      });
    }

    const schematic = config.getSchematic(purchase.schematicKey);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Zahlung abgelehnt')
          .setDescription(
            `Die Zahlung von **<@${userId}>** wurde abgelehnt.\n\n` +
            `📦 Schematic: ${schematic.emoji} ${schematic.label}\n` +
            `🎮 MC-Name: \`${purchase.minecraftName}\`\n` +
            `❌ Abgelehnt von: ${interaction.user}`
          )
          .setColor(0xFF0000)
          .setTimestamp(),
      ],
      components: [],
    });

    // DM an User
    const guild  = interaction.guild;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      await member.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Zahlung nicht gefunden')
            .setDescription(
              `Deine Zahlung für **${schematic.emoji} ${schematic.label}** konnte leider nicht bestätigt werden.\n\n` +
              `Bitte öffne ein **Ticket** auf dem Server falls du Fragen hast!`
            )
            .setColor(0xFF0000)
            .setTimestamp(),
        ],
      }).catch(() => {});
    }

    pendingPurchases.delete(userId);
  },
};
