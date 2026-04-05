require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ─────────────────────────────────────────────
//  Bot-Client erstellen
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// ─────────────────────────────────────────────
//  Slash Commands laden
// ─────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Command geladen: /${command.data.name}`);
  }
}

// ─────────────────────────────────────────────
//  Events laden
// ─────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`✅ Event geladen: ${event.name}`);
}

// ─────────────────────────────────────────────
//  Bot einloggen
// ─────────────────────────────────────────────
client.login(config.token).catch((err) => {
  console.error('❌ Login fehlgeschlagen:', err.message);
  process.exit(1);
});
