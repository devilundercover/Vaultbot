const ticketHandler       = require('../handlers/ticketHandler');
const shopHandler         = require('../handlers/shopHandler');
const shopPurchaseHandler = require('../handlers/shopPurchaseHandler');
const feedbackHandler     = require('../handlers/feedbackHandler');

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

      if (id.startsWith('fb_q1_text_')) return feedbackHandler.handleQ1Text(interaction, id.replace('fb_q1_text_', ''));
      if (id.startsWith('fb_q2_text_')) return feedbackHandler.handleQ2Text(interaction, id.replace('fb_q2_text_', ''));
    }

    // ── Buttons ──────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Ticket-System
      if (id === 'open_ticket')           return ticketHandler.openTicket(interaction);
      if (id === 'close_ticket')          return ticketHandler.closeTicket(interaction);
      if (id === 'ticket_start_handling') return ticketHandler.startHandling(interaction);
      if (id === 'ticket_need_help')      return ticketHandler.needHelp(interaction);
      if (id === 'confirm_payment')       return shopHandler.confirmPayment(interaction);

      // Shop-Kauf-System
      if (id === 'shop_buy') return shopPurchaseHandler.showShopDropdown(interaction);

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

      // Feedback Sterne Q1
      if (id.startsWith('fb_q1_') && !id.includes('text')) {
        const parts  = id.split('_');
        const stars  = parseInt(parts[parts.length - 1]);
        const userId = parts.slice(2, parts.length - 1).join('_');
        return feedbackHandler.handleQ1Stars(interaction, userId, stars);
      }
      // Feedback Sterne Q2
      if (id.startsWith('fb_q2_') && !id.includes('text')) {
        const parts  = id.split('_');
        const stars  = parseInt(parts[parts.length - 1]);
        const userId = parts.slice(2, parts.length - 1).join('_');
        return feedbackHandler.handleQ2Stars(interaction, userId, stars);
      }
    }

    // ── Select Menus ─────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_schematic')      return shopHandler.selectSchematic(interaction);
      if (interaction.customId === 'shop_select_schematic') return shopPurchaseHandler.shopSchematicSelected(interaction);
    }
  },
};
