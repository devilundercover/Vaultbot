require('dotenv').config();

// ╔══════════════════════════════════════════════════════════════╗
// ║          🏪 SCHEMATIC SHOP – ZENTRALE KONFIGURATION         ║
// ║                                                              ║
// ║  Hier kannst du ALLES anpassen:                             ║
// ║  → Neue Schematic hinzufügen: einfach neues Objekt in die  ║
// ║    SCHEMATICS Liste kopieren und ausfüllen                  ║
// ║  → Preis ändern: einfach den "price" Wert anpassen         ║
// ║  → Emoji ändern: einfach das "emoji" Feld anpassen         ║
// ║                                                              ║
// ║  Danach NUR noch:                                           ║
// ║  1. Rolle in Discord erstellen (gleicher Name wie key)      ║
// ║  2. Rollen-ID in die .env eintragen (ROLLENNAME_ROLE_ID)    ║
// ║  3. Bot neustarten → fertig! ✅                              ║
// ╚══════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────
//  💰 PREISFORMAT
//  Wie sollen Preise angezeigt werden?
// ──────────────────────────────────────────────────────────────
const CURRENCY_SUFFIX = 'Coins'; // z.B. "Coins", "€", "$", "Credits"

// ──────────────────────────────────────────────────────────────
//  📦 SCHEMATICS LISTE
//
//  Felder pro Schematic:
//  ┌─────────────┬──────────────────────────────────────────┐
//  │ key         │ Interner Name (klein, kein Leerzeichen)   │
//  │ label       │ Anzeigename im Dropdown & Embeds          │
//  │ emoji       │ Emoji das überall angezeigt wird          │
//  │ price       │ Preis in ganzen Zahlen (ohne Punkte)      │
//  │ description │ Kurze Beschreibung (im Dropdown sichtbar) │
//  │ roleEnvVar  │ Name der Variable in der .env Datei       │
//  └─────────────┴──────────────────────────────────────────┘
// ──────────────────────────────────────────────────────────────

const SCHEMATICS_LIST = [
  {
    key:         'bamboo_farm',
    label:       'Bamboo Farm',
    emoji:       '🎋',
    price:       2_000_000,
    description: 'Vollautomatische Bambusproduktion',
    roleEnvVar:  'BAMBOO_FARM_ROLE_ID',
  },
  {
    key:         'bonemeal_klein',
    label:       'Bonemeal Farm (Klein)',
    emoji:       '🦴',
    price:       500_000,
    description: 'Kompakte Knochenmehlfarm',
    roleEnvVar:  'BONEMEAL_KLEIN_ROLE_ID',
  },
  {
    key:         'bonemeal_gross',
    label:       'Bonemeal Farm (Groß)',
    emoji:       '🦴',
    price:       1_500_000,
    description: 'Große Hochleistungs-Knochenmehlfarm',
    roleEnvVar:  'BONEMEAL_GROSS_ROLE_ID',
  },
  {
    key:         'resin_farm',
    label:       'Resin Farm',
    emoji:       '🌿',
    price:       1_000_000,
    description: 'Vollautomatische Harzproduktion',
    roleEnvVar:  'RESIN_FARM_ROLE_ID',
  },
  {
    key:         'sculk_farm',
    label:       'Sculk Farm',
    emoji:       '💀',
    price:       1_000_000,
    description: 'Vollautomatische Sculk-Farm',
    roleEnvVar:  'SCULK_FARM_ROLE_ID',
  },
  {
    key:         'ironfarm_gross',
    label:       'Iron Farm (Groß)',
    emoji:       '⚙️',
    price:       2_500_000,
    description: 'Große Hochleistungs-Eisenfarm',
    roleEnvVar:  'IRONFARM_GROSS_ROLE_ID',
  },
  {
    key:         'ironfarm_klein',
    label:       'Iron Farm (Klein)',
    emoji:       '🔩',
    price:       1_500_000,
    description: 'Kompakte und effiziente Eisenfarm',
    roleEnvVar:  'IRONFARM_KLEIN_ROLE_ID',
  },
  {
    key:         'kelp_farm',
    label:       'Kelp Farm',
    emoji:       '🌊',
    price:       1_500_000,
    description: 'Vollautomatische Kelpproduktion',
    roleEnvVar:  'KELP_FARM_ROLE_ID',
  },
  {
    key:         'creeper_farm',
    label:       'Creeper Farm',
    emoji:       '💚',
    price:       1_500_000,
    description: 'Vollautomatische Creeper- & Gunpowder-Farm',
    roleEnvVar:  'CREEPER_FARM_ROLE_ID',
  },
  {
    key:         'bee_farm',
    label:       'Bee Farm',
    emoji:       '🐝',
    price:       1_500_000,
    description: 'Vollautomatische Bienen- & Honigfarm',
    roleEnvVar:  'BEE_FARM_ROLE_ID',
  },

  // ──────────────────────────────────────────
  //  ➕ NEUE SCHEMATIC HINZUFÜGEN – Einfach
  //  diesen Block kopieren, einfügen & anpassen:
  //
  //  {
  //    key:         'gold_farm',
  //    label:       'Gold Farm',
  //    emoji:       '🥇',
  //    price:       3_000_000,
  //    description: 'Vollautomatische Goldproduktion',
  //    roleEnvVar:  'GOLD_FARM_ROLE_ID',
  //  },
  //
  //  Danach in .env eintragen:
  //  GOLD_FARM_ROLE_ID=123456789012345678
  // ──────────────────────────────────────────
];

// ──────────────────────────────────────────────────────────────
//  🔧 HILFSFUNKTIONEN (nicht ändern nötig)
// ──────────────────────────────────────────────────────────────

/** Formatiert einen Preis: 2500000 → "2.500.000 Coins" */
function formatPrice(price) {
  return `${price.toLocaleString('de-DE')} ${CURRENCY_SUFFIX}`;
}

/** Gibt alle Schematics mit aufgelösten Rollen-IDs zurück */
const SCHEMATICS = SCHEMATICS_LIST.map((s) => ({
  ...s,
  roleId:         process.env[s.roleEnvVar] || null,
  priceFormatted: formatPrice(s.price),
}));

/** Gibt eine Schematic anhand ihres Keys zurück */
function getSchematic(key) {
  return SCHEMATICS.find((s) => s.key === key) || null;
}

// ──────────────────────────────────────────────────────────────
//  🌐 EXPORTS
// ──────────────────────────────────────────────────────────────
module.exports = {
  token:                 process.env.TOKEN,
  clientId:              process.env.CLIENT_ID,
  guildId:               process.env.GUILD_ID,
  adminRoleId:           process.env.ADMIN_ROLE_ID,
  modRoleId:             process.env.MOD_ROLE_ID,
  logChannelId:          process.env.LOG_CHANNEL_ID,
  ticketCategoryId:      process.env.TICKET_CATEGORY_ID,
  adminTicketChannelId:  process.env.ADMIN_TICKET_CHANNEL_ID,

  schematics:    SCHEMATICS,
  getSchematic,
  formatPrice,
};
