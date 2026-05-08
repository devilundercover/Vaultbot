const ticketHandler       = require('../handlers/ticketHandler');
const shopHandler         = require('../handlers/shopHandler');
const shopPurchaseHandler = require('../handlers/shopPurchaseHandler');
const feedbackHandler     = require('../handlers/feedbackHandler');
const clanHandler         = require('../handlers/clanHandler');
const config              = require('../../config');
const { EmbedBuilder }    = require('discord.js');

// ─────────────────────────────────────────────
//  Verifizierung
// ─────────────────────────────────────────────
async function handleVerify(interaction) {
  const { member, guild } = interaction;

  if (member.roles.cache.has(config.verifiedRoleId)) {
    return interaction.reply({ content: '✅ Du bist bereits verifiziert!', ephemeral: true });
  }

  try {
    const role = guild.roles.cache.get(config.verifiedRoleId);
    if (!role) {
      return interaction.reply({ content: '❌ Verified-Rolle nicht gefunden! Kontaktiere einen Admin.', ephemeral: true });
    }
    await member.roles.add(role, 'Regeln akzeptiert');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Willkommen!')
          .setDescription('Du hast die Regeln akzeptiert und bist jetzt **verifiziert**! 🎉\n\nDu hast jetzt Zugriff auf alle öffentlichen Channels.\nSchau dich um und besuche den **#shop** um Schematics zu kaufen! 🏗️')
          .setColor(0x2ECC71)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (error) {
    console.error('Fehler bei Verifizierung:', error);
    await interaction.reply({ content: '❌ Fehler! Bitte kontaktiere einen Admin.', ephemeral: true });
  }
}

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {

    // ── Slash Commands ──────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`❌ Fehler bei Command /${interaction.commandName}:`, error);
        const msg = {
          content:
            '⚠️ **Zurzeit ist kein Admin oder Mod auf HugoSMP aktiv.**\n\n' +
            '🛒 **Käufe sind momentan nicht möglich!**\n' +
            'Du kannst gerade keine Farm über den Bot kaufen.\n\n' +
            '🎫 **Was du tun kannst:**\n' +
            'Öffne ein **Ticket** — ein Admin oder Mod wird deinen Kauf dann persönlich bearbeiten sobald wir wieder online sind!\n\n' +
            '*Dein Anliegen wird nicht vergessen.* 💚',
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    // ── Modals ───────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id === 'shop_minecraft_name_modal') return shopPurchaseHandler.handleMinecraftNameModal(interaction);
      if (id === 'ticket_open_modal')         return ticketHandler.handleTicketModal(interaction);
      if (id === 'clan_modal_1')              return clanHandler.handleModal1(interaction);
      if (id === 'clan_modal_2')              return clanHandler.handleModal2(interaction);
      if (id === 'clan_modal_3')              return clanHandler.handleModal3(interaction);
      if (id === 'clan_dates_modal')          return clanHandler.handleDatesSubmit(interaction, client);

      if (id.startsWith('fb_q1_text_'))       return feedbackHandler.handleQ1Text(interaction, id.replace('fb_q1_text_', ''));
      if (id.startsWith('fb_q2_text_'))       return feedbackHandler.handleQ2Text(interaction, id.replace('fb_q2_text_', ''));
      if (id.startsWith('clan_deny_reason_')) return clanHandler.handleDenyReason(interaction, id.replace('clan_deny_reason_', ''), client);
    }

    // ── Buttons ──────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Verifizierung
      if (id === 'verify_accept') return handleVerify(interaction);

      // Ticket-System
      if (id === 'open_ticket')           return ticketHandler.openTicket(interaction);
      if (id === 'close_ticket')          return ticketHandler.closeTicket(interaction);
      if (id === 'ticket_start_handling') return ticketHandler.startHandling(interaction);
      if (id === 'ticket_need_help')      return ticketHandler.needHelp(interaction);
      if (id === 'confirm_payment')       return shopHandler.confirmPayment(interaction);

      // Shop-Kauf-System
      if (id === 'shop_buy')              return shopPurchaseHandler.showShopDropdown(interaction);
      if (id.startsWith('shop_paid_'))    return shopPurchaseHandler.handlePaid(interaction, id.replace('shop_paid_', ''));
      if (id.startsWith('shop_cancel_'))  return shopPurchaseHandler.handleCancel(interaction, id.replace('shop_cancel_', ''));
      if (id.startsWith('shop_confirm_')) return shopPurchaseHandler.handleAdminConfirm(interaction, id.replace('shop_confirm_', ''), client);
      if (id.startsWith('shop_deny_'))    return shopPurchaseHandler.handleAdminDeny(interaction, id.replace('shop_deny_', ''));

      // Feedback-System
      if (id.startsWith('feedback_yes_')) return feedbackHandler.handleYes(interaction, id.replace('feedback_yes_', ''));
      if (id.startsWith('feedback_no_'))  return feedbackHandler.handleNo(interaction, id.replace('feedback_no_', ''));
      if (id.startsWith('fb_q3_yes_'))    return feedbackHandler.handleQ3(interaction, id.replace('fb_q3_yes_', ''), 'yes');
      if (id.startsWith('fb_q3_no_'))     return feedbackHandler.handleQ3(interaction, id.replace('fb_q3_no_', ''), 'no');
      if (id.startsWith('fb_submit_'))    return feedbackHandler.handleSubmit(interaction, id.replace('fb_submit_', ''), client);
      if (id.startsWith('fb_cancel_'))    return feedbackHandler.handleCancel(interaction, id.replace('fb_cancel_', ''));
      if (id.startsWith('fb_q1_') && !id.includes('text')) {
        const parts = id.split('_'); const stars = parseInt(parts[parts.length - 1]); const userId = parts.slice(2, parts.length - 1).join('_');
        return feedbackHandler.handleQ1Stars(interaction, userId, stars);
      }
      if (id.startsWith('fb_q2_') && !id.includes('text')) {
        const parts = id.split('_'); const stars = parseInt(parts[parts.length - 1]); const userId = parts.slice(2, parts.length - 1).join('_');
        return feedbackHandler.handleQ2Stars(interaction, userId, stars);
      }

      // Clan-System
      if (id === 'clan_apply')              return clanHandler.startApplication(interaction);
      if (id === 'clan_bedrock')            return clanHandler.handleVersion(interaction, 'Bedrock');
      if (id === 'clan_java')               return clanHandler.handleVersion(interaction, 'Java');
      if (id === 'clan_mic_yes')            return clanHandler.handleMic(interaction, '✅ Ja');
      if (id === 'clan_mic_no')             return clanHandler.handleMic(interaction, '❌ Nein');
      if (id === 'clan_voice_yes')          return clanHandler.handleVoice(interaction, '✅ Ja');
      if (id === 'clan_voice_no')           return clanHandler.handleVoice(interaction, '❌ Nein');
      if (id === 'clan_submit')             return clanHandler.submitApplication(interaction, client);
      if (id === 'clan_cancel')             return clanHandler.cancelApplication(interaction);
      if (id.startsWith('clan_review_'))    return clanHandler.reviewApplication(interaction, id.replace('clan_review_', ''));
      if (id.startsWith('clan_accept_'))    return clanHandler.acceptApplication(interaction, id.replace('clan_accept_', ''), client);
      if (id.startsWith('clan_deny_'))      return clanHandler.denyApplication(interaction, id.replace('clan_deny_', ''));
      if (id.startsWith('clan_dates_'))     return clanHandler.showDatesModal(interaction);
    }

    // ── Select Menus ─────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_schematic')      return shopHandler.selectSchematic(interaction);
      if (interaction.customId === 'shop_select_schematic') return shopPurchaseHandler.shopSchematicSelected(interaction);
    }
  },
};
