const ticketHandler      = require('../handlers/ticketHandler');
const shopHandler        = require('../handlers/shopHandler');
const shopPurchaseHandler = require('../handlers/shopPurchaseHandler');

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
      if (interaction.customId === 'shop_minecraft_name_modal') {
        return shopPurchaseHandler.handleMinecraftNameModal(interaction);
      }
    }

    // ── Buttons ──────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Ticket-System
      if (id === 'open_ticket')     return ticketHandler.openTicket(interaction);
      if (id === 'close_ticket')    return ticketHandler.closeTicket(interaction);
      if (id === 'confirm_payment') return shopHandler.confirmPayment(interaction);

      // Shop-Kauf-System
      if (id === 'shop_buy')        return shopPurchaseHandler.showShopDropdown(interaction);

      // Dynamische Button-IDs (enthalten User-ID)
      if (id.startsWith('shop_paid_')) {
        const userId = id.replace('shop_paid_', '');
        return shopPurchaseHandler.handlePaid(interaction, userId);
      }
      if (id.startsWith('shop_cancel_')) {
        const userId = id.replace('shop_cancel_', '');
        return shopPurchaseHandler.handleCancel(interaction, userId);
      }
      if (id.startsWith('shop_confirm_')) {
        const userId = id.replace('shop_confirm_', '');
        return shopPurchaseHandler.handleAdminConfirm(interaction, userId);
      }
      if (id.startsWith('shop_deny_')) {
        const userId = id.replace('shop_deny_', '');
        return shopPurchaseHandler.handleAdminDeny(interaction, userId);
      }
    }

    // ── Select Menus ─────────────────────────────
    if (interaction.isStringSelectMenu()) {
      // Ticket-System Dropdown
      if (interaction.customId === 'select_schematic') {
        return shopHandler.selectSchematic(interaction);
      }
      // Shop-Kauf-System Dropdown
      if (interaction.customId === 'shop_select_schematic') {
        return shopPurchaseHandler.shopSchematicSelected(interaction);
      }
    }
  },
};
