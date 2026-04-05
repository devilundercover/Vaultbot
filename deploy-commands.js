require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('./config');

// ─────────────────────────────────────────────
//  Alle Slash Commands einsammeln
// ─────────────────────────────────────────────
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

// ─────────────────────────────────────────────
//  Commands bei Discord registrieren
// ─────────────────────────────────────────────
const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`\n🔄 Registriere ${commands.length} Slash Command(s) für Server ${config.guildId}...\n`);

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );

    console.log('✅ Slash Commands erfolgreich registriert!\n');
    console.log('Registrierte Commands:');
    commands.forEach((c) => console.log(`  → /${c.name}`));
  } catch (error) {
    console.error('❌ Fehler beim Registrieren:', error);
  }
})();
