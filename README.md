# 🏪 Minecraft Schematics Shop Bot – Komplette Anleitung

---

## 📁 Dateistruktur

```
discord-shop-bot/
├── src/
│   ├── commands/
│   │   └── setup.js          ← /setup Slash Command
│   ├── events/
│   │   ├── ready.js          ← Bot-Start Event
│   │   └── interactionCreate.js  ← Alle Buttons & Commands
│   └── handlers/
│       ├── ticketHandler.js  ← Ticket öffnen & schließen
│       └── shopHandler.js    ← Schematic auswählen & bestätigen
├── config.js                 ← Liest die .env Werte
├── deploy-commands.js        ← Registriert Slash Commands
├── index.js                  ← Bot startet hier
├── package.json
└── .env                      ← DEINE IDs & Token (geheim!)
```

---

## ✅ SCHRITT 1 – Node.js installieren

1. Gehe zu **https://nodejs.org**
2. Lade die **LTS Version** herunter (z.B. Node.js 20)
3. Installiere sie mit den Standard-Einstellungen
4. Öffne ein Terminal (CMD auf Windows / Terminal auf Mac/Linux)
5. Prüfe die Installation:

```bash
node --version    # Sollte z.B. "v20.11.0" zeigen
npm --version     # Sollte z.B. "10.2.4" zeigen
```

---

## ✅ SCHRITT 2 – Bot im Discord Developer Portal erstellen

1. Gehe zu **https://discord.com/developers/applications**
2. Klicke oben rechts auf **"New Application"**
3. Gib dem Bot einen Namen (z.B. `SchematicsShop`) und klicke **Create**
4. Kopiere die **Application ID** (später in die .env als `CLIENT_ID`)

### Bot erstellen:
5. Klicke links auf **"Bot"**
6. Klicke auf **"Add Bot"** → Bestätige mit **"Yes, do it!"**
7. Klicke auf **"Reset Token"** → Bestätige und kopiere den Token
   ⚠️ **DEN TOKEN NIEMALS TEILEN!**
   → Trage ihn in die .env als `TOKEN` ein

### Bot-Berechtigungen:
8. Scrolle auf der Bot-Seite runter zu **"Privileged Gateway Intents"**
9. Aktiviere diese drei Schalter:
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**
   - ✅ **PRESENCE INTENT** (optional, aber empfohlen)
10. Klicke auf **"Save Changes"**

---

## ✅ SCHRITT 3 – Bot auf den Server einladen

1. Klicke links auf **"OAuth2"** → **"URL Generator"**
2. Bei **"SCOPES"** wähle:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Bei **"BOT PERMISSIONS"** wähle:
   - ✅ Manage Roles
   - ✅ Manage Channels
   - ✅ Send Messages
   - ✅ Read Messages / View Channels
   - ✅ Read Message History
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Use External Emojis
   - ✅ Manage Messages
4. Kopiere die generierte URL ganz unten
5. Öffne die URL im Browser und wähle deinen Server aus

---

## ✅ SCHRITT 4 – Developer Mode aktivieren (für IDs)

Du brauchst IDs von Rollen, Channels, etc.
So aktivierst du den Developer Mode:

1. Discord öffnen → **Einstellungen** (Zahnrad unten links)
2. **"Erweitert"** → **"Entwicklermodus"** aktivieren
3. Jetzt kannst du überall **Rechtsklick → ID kopieren** nutzen

**Deine Server-ID kopieren:**
→ Rechtsklick auf deinen Server-Namen links → **"Server-ID kopieren"**
→ In die .env als `GUILD_ID` eintragen

---

## ✅ SCHRITT 5 – Rollen erstellen

Gehe in Discord zu: **Servereinstellungen → Rollen**

Erstelle diese **4 Rollen** (genaue Namen wichtig!):

| Rollenname    | Farbe (empfohlen)  | Zweck                          |
|---------------|--------------------|--------------------------------|
| `Admin`       | Rot                | Für dich (Shop-Admin)          |
| `iron-farm`   | Grau               | Käufer der Iron Farm           |
| `gold-farm`   | Gold               | Käufer der Gold Farm           |
| `xp-farm`     | Grün               | Käufer der XP Farm             |

**Wichtig:** Die Bot-Rolle muss ÜBER allen Schematic-Rollen stehen!
→ Ziehe die Bot-Rolle in der Rollenliste nach oben.

**IDs kopieren:**
→ Rechtsklick auf jede Rolle → **"Rollen-ID kopieren"**
→ In die .env eintragen

---

## ✅ SCHRITT 6 – Channels erstellen

Erstelle diese Channels auf deinem Server:

### Kategorie: `TICKETS`
→ Klicke auf **+** neben einer Kategorie und erstelle:
- Kein Channel nötig, die Tickets werden automatisch hier erstellt

### Text-Channels:
| Channel-Name | Zweck                          |
|--------------|-------------------------------|
| `#shop`      | Hier wird das Shop-Panel gepostet |
| `#logs`      | Automatische Kauf-Logs         |
| `#iron-farm` | Nur für Iron-Farm-Käufer      |
| `#gold-farm` | Nur für Gold-Farm-Käufer      |
| `#xp-farm`   | Nur für XP-Farm-Käufer        |

**IDs kopieren:**
→ Rechtsklick auf jeden Channel → **"Kanal-ID kopieren"**
→ `#logs` → in .env als `LOG_CHANNEL_ID`

---

## ✅ SCHRITT 7 – Channel-Berechtigungen einstellen

### Für #iron-farm, #gold-farm, #xp-farm:

1. Rechtsklick auf den Channel → **"Kanal bearbeiten"**
2. Klicke auf **"Berechtigungen"**
3. Klicke auf **@everyone**
4. ❌ Deaktiviere: **"Kanal ansehen"**
5. Klicke auf **"+"** und füge die passende Rolle hinzu:
   - `#iron-farm` → Rolle `iron-farm` → ✅ **"Kanal ansehen"** aktivieren
   - `#gold-farm` → Rolle `gold-farm` → ✅ **"Kanal ansehen"** aktivieren
   - `#xp-farm`  → Rolle `xp-farm`   → ✅ **"Kanal ansehen"** aktivieren

### Für die Ticket-Kategorie:
1. Rechtsklick auf die Kategorie → **"Kategorie bearbeiten"**
2. **@everyone** → ❌ **"Kanal ansehen"** deaktivieren
3. **Admin** → ✅ **"Kanal ansehen"** aktivieren

---

## ✅ SCHRITT 8 – .env Datei ausfüllen

Öffne die `.env` Datei und fülle alle Werte aus:

```env
TOKEN=dein_geheimer_bot_token_hier
CLIENT_ID=deine_application_id
GUILD_ID=deine_server_id

ADMIN_ROLE_ID=id_der_admin_rolle
IRON_FARM_ROLE_ID=id_der_iron_farm_rolle
GOLD_FARM_ROLE_ID=id_der_gold_farm_rolle
XP_FARM_ROLE_ID=id_der_xp_farm_rolle

LOG_CHANNEL_ID=id_des_logs_channels
TICKET_CATEGORY_ID=id_der_ticket_kategorie
```

---

## ✅ SCHRITT 9 – Bot installieren & starten

1. Öffne ein Terminal **im Ordner des Bots**
   → Windows: Shift + Rechtsklick im Ordner → "PowerShell-Fenster öffnen"
   → Mac/Linux: Terminal öffnen und `cd /pfad/zum/bot` eingeben

2. **Abhängigkeiten installieren:**
```bash
npm install
```

3. **Slash Commands registrieren** (nur EINMAL nötig):
```bash
node deploy-commands.js
```
   Du solltest sehen: `✅ Slash Commands erfolgreich registriert!`

4. **Bot starten:**
```bash
node index.js
```
   Du solltest sehen: `✅ Bot ist online als: SchematicsShop#1234`

---

## ✅ SCHRITT 10 – Shop einrichten

1. Gehe in deinen `#shop` Channel auf Discord
2. Tippe `/setup`
3. Drücke Enter
4. Das Shop-Panel wird automatisch gepostet! 🎉

---

## 🔄 Wie der Bot dauerhaft läuft (optional)

Wenn du das Terminal schließt, stoppt der Bot.
Für dauerhaften Betrieb nutze **PM2**:

```bash
npm install -g pm2
pm2 start index.js --name "shop-bot"
pm2 save
pm2 startup   # Startet den Bot automatisch nach Neustart
```

Nützliche PM2 Befehle:
```bash
pm2 status        # Status anzeigen
pm2 logs shop-bot # Logs anzeigen
pm2 restart shop-bot  # Bot neustarten
pm2 stop shop-bot     # Bot stoppen
```

---

## 🎯 Zusammenfassung – Checkliste

- [ ] Node.js installiert
- [ ] Bot im Developer Portal erstellt
- [ ] Bot-Token kopiert → in .env
- [ ] Server Members Intent + Message Content Intent aktiviert
- [ ] Bot auf Server eingeladen (mit allen Berechtigungen)
- [ ] Developer Mode in Discord aktiviert
- [ ] Rollen erstellt: `Admin`, `iron-farm`, `gold-farm`, `xp-farm`
- [ ] Bot-Rolle ÜBER den Schematic-Rollen in der Rollenliste
- [ ] Channels erstellt: `#shop`, `#logs`, `#iron-farm`, `#gold-farm`, `#xp-farm`
- [ ] Ticket-Kategorie erstellt
- [ ] Channel-Berechtigungen gesetzt (nur Rolleninhaber sehen ihre Channels)
- [ ] .env vollständig ausgefüllt
- [ ] `npm install` ausgeführt
- [ ] `node deploy-commands.js` ausgeführt
- [ ] `node index.js` ausgeführt → Bot ist online
- [ ] `/setup` im #shop Channel ausgeführt

---

## ❓ Häufige Fehler

| Fehler | Lösung |
|--------|--------|
| `TOKEN is invalid` | Token in .env prüfen, kein Leerzeichen |
| `Missing Permissions` | Bot-Rolle höher setzen in der Rollenliste |
| `Cannot add role` | Bot-Rolle muss über der Schematic-Rolle liegen |
| `Unknown Channel` | Channel-ID in .env prüfen |
| Ticket wird nicht erstellt | `TICKET_CATEGORY_ID` prüfen, Bot-Berechtigungen prüfen |
| `/setup` nicht sichtbar | `node deploy-commands.js` nochmal ausführen |

---

*Viel Erfolg mit deinem Schematics Shop! 🏗️*
