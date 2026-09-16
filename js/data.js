/* Last Shelter – shared game data
   Phase 1 foundation: content tables live separately from game logic.
*/
const CARD_DB = {
  attack:      { name: "Angriff", cost: 1, desc: "Schaden am Gegner", icon: "⚔️" },
  attack_plus: { name: "Angriff+", cost: 1, desc: "Mehr Schaden als normaler Angriff", icon: "⚔️" },
  defend:      { name: "Verteidigen", cost: 1, desc: "Block aufbauen", icon: "🛡️" },
  defend_plus: { name: "Verteidigen+", cost: 1, desc: "Mehr Block als normales Verteidigen", icon: "🛡️" },
  dodge:       { name: "Ausweichen", cost: 1, desc: "Blockt den nächsten Angriff komplett", icon: "💨" },
  heavy:       { name: "Schwerer Schlag", cost: 2, desc: "Hoher Schaden am Gegner", icon: "🔨" },
  heal:        { name: "Erste Hilfe", cost: 1, desc: "+15 Leben", icon: "❤️‍🩹" },
  precise_strike: { name: "Gezielter Hieb", cost: 1, desc: "10–14 Schaden", icon: "⚔️" },
  emergency_bandage: { name: "Notverband", cost: 2, desc: "+25 Leben", icon: "❤️‍🩹" }
};
 const CARD_ICON_FILES = {
  attack: "images/icons/attack.png",
  attack_plus: "images/icons/attack.png",
  defend: "images/icons/shield.png",
  defend_plus: "images/icons/shield.png",
  dodge: "images/icons/flee.png",
  heavy: "images/icons/attack.png",
  heal: "images/icons/heal.png",
  precise_strike: "images/icons/attack.png",
  emergency_bandage: "images/icons/heal.png"
};

const DEFAULT_DECK = ["attack","attack","attack","attack","attack","defend","defend","dodge","heavy","heal"];
const CARD_REWARD_POOL = ["attack","defend","dodge","heavy","heal","precise_strike","emergency_bandage"];

const FOOD_DB = {
  Beeren: { hunger: 15, icon: "images/icons/berries.png", label: "Beeren" },
  Fleisch: { hunger: 30, icon: "images/icons/deer.png", label: "Fleisch" },
  Fisch: { hunger: 25, icon: "images/icons/fish.png", label: "Fisch" }
};

const RESOURCE_DB = {
  Holz: { icon: "images/icons/forest.png", label: "Holz" },
  Metall: { icon: "images/icons/metal-ingot.png", label: "Metall" },
  Leder: { icon: "images/icons/leather.png", label: "Leder" },
  Heilkräuter: { icon: "images/icons/herbs.png", label: "Heilkräuter" },
  Wasser: { icon: "images/icons/river.png", label: "Wasser", energy: 15 }
};

const ENEMY_DB = {
  wolf:   { name: "Wolf", maxHp: 35, dmgMin: 4, dmgMax: 7, attackCount: 2, intent: "Schnelle Bisse" },
  looter: { name: "Plünderer", maxHp: 45, dmgMin: 10, dmgMax: 18, intent: "Angriff" },
  bear:   { name: "Bär", maxHp: 70, dmgMin: 14, dmgMax: 22, intent: "Hieb" },
  swamp_thing: { name: "Sumpfkriecher", maxHp: 60, dmgMin: 16, dmgMax: 24, intent: "Biss", poison:true, poisonChance:0.62, poisonTurns:3 },
  forest_guardian: { name: "Waldhüter", maxHp: 88, dmgMin: 12, dmgMax: 18, intent: "Wurzelhieb", boss:true, locationId:"wald", reward:"axe" },
  ruin_sentinel: { name: "Ruinenwächter", maxHp: 102, dmgMin: 14, dmgMax: 22, intent: "Steinhieb", boss:true, locationId:"ruinen", reward:"iron_plate" },
  river_hunter: { name: "Flussjäger", maxHp: 82, dmgMin: 12, dmgMax: 19, intent: "Schneller Schlag", boss:true, locationId:"fluss", reward:"spear" },
  mountain_titan: { name: "Bergtitan", maxHp: 126, dmgMin: 18, dmgMax: 28, intent: "Wuchtiger Hieb", boss:true, locationId:"berge", reward:"iron_plate" },
  swamp_queen: { name: "Sumpfkönigin", maxHp: 118, dmgMin: 18, dmgMax: 27, intent: "Giftiger Biss", boss:true, poison:true, poisonChance:0.58, poisonTurns:4, locationId:"sumpf", reward:"leather" }
};

const LOCATIONS = [
  { id:"wald",   name:"Dichter Wald",       minLevel:1, danger:0.55, enemyPool:["wolf","looter"], icon:"🌲", accent:"#5a7a3f", identity:"Brennholz und Beeren", bossId:"forest_guardian", bossName:"Waldhüter", gatherItem:"Holz", gatherText:"Du hast vorsichtig Holz gesammelt", altGatherItem:"Beeren", altGatherText:"Du hast essbare Beeren gefunden", exploreItem:"Holz", exploreFindText:"Du findest gutes Brennholz zwischen den Bäumen", gatherDesc:"Suche nach Brennholz oder Beeren und bleibe möglichst unauffällig.", exploreDesc:"Durchsuche den Wald nach Vorräten, Spuren und Gefahren.", trackReward:{ chance:0.55, item:"Fleisch", xp:4, message:"Die Spuren führen dich zu frischer Tierbeute" } },
  { id:"ruinen", name:"Verlassene Ruinen",  minLevel:1, danger:0.66, enemyPool:["wolf","looter"], icon:"🏚️", accent:"#8a7a5f", identity:"Metall und alte Verstecke", bossId:"ruin_sentinel", bossName:"Ruinenwächter", gatherItem:"Metall", gatherText:"Du hast brauchbare Metallteile aus den Trümmern gelöst", altGatherItem:"Holz", altGatherText:"Du hast trockenes Holz am überwucherten Ruinenrand gefunden", exploreItem:"Metall", exploreFindText:"Du findest brauchbare Metallteile zwischen den Trümmern", rareLoot:["rusty_knife","cloth_wrap","spear","leather"], gatherDesc:"Suche in den Trümmern nach Metallteilen, Brettern oder vergessenen Vorräten.", exploreDesc:"Durchsuche die Ruinen nach Metall, Beute, Verstecken und Hinterhalten.", exploreAction:{ name:"Ruinen durchsuchen", icon:"images/icons/ruins.png", desc:"Suche tiefer nach wertvoller Beute, aber rechne mit Einstürzen und Gegnern." } },
  { id:"fluss",  name:"Flussufer",          minLevel:1, danger:0.48, enemyPool:["wolf","looter"], icon:"🏞️", accent:"#4a7a8a", identity:"Beeren, Wasser und ruhige Ufer", bossId:"river_hunter", bossName:"Flussjäger", gatherItem:"Beeren", gatherText:"Du hast am Ufer Beeren gesammelt", altGatherItem:"Wasser", altGatherText:"Du hast klares Wasser am Ufer geschöpft", exploreItem:"Beeren", exploreFindText:"Du findest frische Beeren nahe dem Wasser", gatherDesc:"Suche am Ufer nach Beeren, Wasser und nützlichem Treibholz.", exploreDesc:"Folge dem Fluss nach Nahrung, sicheren Wegen und Gefahren.", exploreAction:{ name:"Ufer erkunden", icon:"images/icons/river.png", desc:"Folge dem Wasser nach Nahrung, sicheren Wegen und Gefahren." }, specialAction:{ id:"fish", name:"Fischen", icon:"images/icons/fish.png", desc:"Wirf deine Angel aus und suche nach Fisch und Wasser." } },
  { id:"berge",  name:"Berge",              minLevel:3, danger:0.76, enemyPool:["bear"], icon:"⛰️", accent:"#7a7a8a", identity:"Metall, Leder und raue Wege", bossId:"mountain_titan", bossName:"Bergtitan", gatherItem:"Metall", gatherText:"Du hast Metalladern unter einem Felsvorsprung gefunden", altGatherItem:"Leder", altGatherText:"Du hast eine alte Ledertasche am Bergpfad entdeckt", exploreItem:"Metall", exploreFindText:"Du findest Metalladern unter einem Felsvorsprung", gatherDesc:"Suche zwischen Felsen nach Metall, Leder und seltenen Materialien.", exploreDesc:"Erklimme die Hänge nach Metall, Leder und starken Gegnern.", exploreAction:{ name:"Hänge erklimmen", icon:"images/icons/mountains.png", desc:"Steige höher und suche seltene Materialien trotz Kälte und Gefahr." } },
  { id:"sumpf",  name:"Sumpf",              minLevel:5, danger:0.84, enemyPool:["swamp_thing"], icon:"🐊", accent:"#5a7a5a", identity:"Heilkräuter und Gift", bossId:"swamp_queen", bossName:"Sumpfkönigin", gatherItem:"Heilkräuter", gatherText:"Du hast Heilkräuter am feuchten Ufer gefunden", altGatherItem:"Heilkräuter", altGatherText:"Du hast weitere Heilkräuter zwischen den Wurzeln entdeckt", exploreItem:"Heilkräuter", exploreFindText:"Du findest Heilkräuter am Rand des schwarzen Wassers", gatherDesc:"Suche nach Heilkräutern, bevor dich der Sumpf bemerkt.", exploreDesc:"Durchquere den Sumpf nach Heilmitteln, Gift und dem Sumpfkriecher.", exploreAction:{ name:"Sumpf durchqueren", icon:"images/icons/poison.png", desc:"Suche Heilmittel im giftigen Gelände und achte auf den Sumpfkriecher." } }
];

const EVENT_DB = {
  tracks: {
    title: "Frische Spuren",
    text: "Im feuchten Boden erkennst du Spuren, die noch nicht alt sein können.",
    choices: [
      { id:"follow", name:"Den Spuren folgen", desc:"−6 Energie · +15 XP · Moral +4", icon:"images/icons/compass.png" },
      { id:"avoid", name:"Abstand halten", desc:"Sicher zurückkehren · Sicherheit +2", icon:"images/icons/flee.png" }
    ]
  },
  cache: {
    title: "Verlassene Tasche",
    text: "Zwischen Wurzeln liegt eine alte Tasche. Etwas darin scheint noch brauchbar zu sein.",
    choices: [
      { id:"take", name:"Tasche öffnen", desc:"1 Verband und 1 Holz · Moral +3", icon:"images/icons/backpack.png" },
      { id:"leave", name:"Sie liegen lassen", desc:"+5 XP · Sicherheit +1", icon:"images/icons/shelter.png" }
    ]
  },
  rain: {
    title: "Der Regen wird stärker",
    text: "Dunkle Wolken ziehen auf. Du musst entscheiden, ob du Schutz suchst oder weitermachst.",
    choices: [
      { id:"shelter", name:"Schutz suchen", desc:"+4 Energie · Sicherheit +3", icon:"images/icons/shelter.png" },
      { id:"continue", name:"Weitergehen", desc:"−3 Energie · −2 Hunger · Moral −2", icon:"images/icons/forest.png" }
    ]
  },
  ruin_door: {
    title: "Verschlossene Metalltür",
    text: "Zwischen den Trümmern liegt eine schwere Tür. Dahinter könnte noch etwas Brauchbares verborgen sein.",
    locationIds: ["ruinen"],
    choices: [
      { id:"break", name:"Tür aufbrechen", desc:"Benötigt Stärke 3 · −3 Energie · +1 Metall · +20 XP", icon:"images/icons/metal-ingot.png", requirement:{ attr:"staerke", min:3 } },
      { id:"bypass", name:"Schwachstelle nutzen", desc:"Benötigt Wahrnehmung 2 · +1 Metall · +12 XP", icon:"images/icons/compass.png", requirement:{ attr:"wahrnehmung", min:2 } },
      { id:"leave", name:"Später zurückkehren", desc:"Sicherer Rückzug · +5 XP", icon:"images/icons/flee.png" }
    ]
  },
  sumpf_spores: {
    title: "Giftige Sporen",
    text: "Eine Wolke aus grünem Staub hängt zwischen den Wurzeln. Du musst schnell entscheiden.",
    locationIds: ["sumpf"],
    choices: [
      { id:"antidote", name:"Gegengift einsetzen", desc:"Benötigt 1 Gegengift · +1 Heilkräuter · +10 XP", icon:"images/icons/poison.png", requirement:{ type:"consumable", item:"gegenmittel", amount:1 } },
      { id:"careful", name:"Vorsichtig hindurch", desc:"−5 Energie · −4 Leben · +5 XP", icon:"images/icons/herbs.png" },
      { id:"retreat", name:"Zurückweichen", desc:"Sicherer Weg zurück · Sicherheit +1", icon:"images/icons/flee.png" }
    ]
  }
};

const LOCATION_GOAL = 5;

const DAILY_GOALS = [
  { type: "gather", label: "Sammeln", target: 3 },
  { type: "explore", label: "Erkunden", target: 2 },
  { type: "track", label: "Spuren", target: 2 }
];

const PERKS = [
  { id:"str", type:"attr", attr:"staerke", name:"Kraftschub", desc:"+1 Stärke – mehr Schaden im Kampf", icon:"💪" },
  { id:"vit", type:"attr", attr:"vitalitaet", name:"Zähigkeit", desc:"+1 Vitalität – mehr maximales Leben", icon:"❤️" },
  { id:"dex", type:"attr", attr:"geschicklichkeit", name:"Behändigkeit", desc:"+1 Geschicklichkeit – mehr Block", icon:"🤸" },
  { id:"sur", type:"attr", attr:"ueberleben", name:"Überlebenswille", desc:"+1 Überleben – weniger Hunger-/Energieverlust", icon:"🔥" },
  { id:"per", type:"attr", attr:"wahrnehmung", name:"Scharfe Sinne", desc:"+1 Wahrnehmung – Kämpfen leichter ausweichen", icon:"👁️" },
  { id:"add_atk", type:"card", effect:"addCard", card:"attack", name:"Waffenkammer", desc:"+1 Angriffskarte kommt ins Deck", icon:"⚔️" },
  { id:"add_def", type:"card", effect:"addCard", card:"defend", name:"Schildwall", desc:"+1 Verteidigen-Karte kommt ins Deck", icon:"🛡️" },
  { id:"trim_def", type:"card", effect:"removeCard", card:"defend", requiresCard:"defend", name:"Gestrafft", desc:"Entfernt eine Verteidigen-Karte – Deck wird konsistenter", icon:"✂️" },
  { id:"upgrade_atk", type:"card", effect:"upgradeCard", from:"attack", to:"attack_plus", requiresCard:"attack", name:"Scharfe Klinge", desc:"Verbessert eine Angriffskarte im Deck zu Angriff+", icon:"🗡️" },
  { id:"upgrade_def", type:"card", effect:"upgradeCard", from:"defend", to:"defend_plus", requiresCard:"defend", name:"Verstärkter Schild", desc:"Verbessert eine Verteidigen-Karte im Deck zu Verteidigen+", icon:"🔰" }
];
 const PERK_ICON_FILES = {
  str: "images/icons/attack.png",
  vit: "images/icons/health.png",
  dex: "images/icons/flee.png",
  sur: "images/icons/campfire.png",
  per: "images/icons/compass.png",

  add_atk: "images/icons/attack.png",
  add_def: "images/icons/shield.png",
  trim_def: "images/icons/settings.png",
  upgrade_atk: "images/icons/attack.png",
  upgrade_def: "images/icons/shield.png"
};
 const ATTRIBUTE_ICON_FILES = {
  staerke: "images/icons/attack.png",
  vitalitaet: "images/icons/health.png",
  geschicklichkeit: "images/icons/flee.png",
  ueberleben: "images/icons/campfire.png",
  wahrnehmung: "images/icons/compass.png"
};

const ITEM_ICON_FILES = {
  rusty_knife: "images/icons/attack.png",
  spear: "images/icons/attack.png",
  axe: "images/icons/chop-wood.png",
  cloth_wrap: "images/icons/leather.png",
  leather: "images/icons/leather.png",
  iron_plate: "images/icons/shield.png",
  crafted_spear: "images/icons/attack.png",
  crafted_armor: "images/icons/shield.png",
  hand_axe: "images/icons/chop-wood.png"
};

const ITEM_DB = {
  rusty_knife: { name: "Rostiges Messer", type: "weapon", bonus: 2, rarity:"common", icon:"🔪" },
  spear:       { name: "Speer", type: "weapon", bonus: 5, rarity:"uncommon", icon:"🔱" },
  axe:         { name: "Axt", type: "weapon", bonus: 8, rarity:"rare", icon:"🪓" },
  cloth_wrap:  { name: "Stoffwicklung", type: "armor", bonus: 3, coldProtection: 1, rarity:"common", icon:"🧣" },
  leather:     { name: "Lederrüstung", type: "armor", bonus: 6, coldProtection: 2, poisonResistance: 1, rarity:"uncommon", icon:"🥾" },
  iron_plate:  { name: "Eisenplatte", type: "armor", bonus: 10, rarity:"rare", icon:"🛡️" },
  crafted_spear: { name: "Speer (selbst gebaut)", type: "weapon", bonus: 3, rarity:"common", icon:"🔱" },
  crafted_armor: { name: "Grobe Rüstung", type: "armor", bonus: 3, coldProtection: 1, poisonResistance: 1, rarity:"common", icon:"🛡️" },
  hand_axe: { name: "Handaxt", type: "tool", bonus: 1, rarity:"uncommon", icon:"🪓" }
};

const LOOT_TABLE = ["rusty_knife","spear","axe","cloth_wrap","leather","iron_plate"];
const LOOT_TABLE_BY_ENEMY = {
  wolf: ["rusty_knife", "cloth_wrap", "spear"],
  looter: ["rusty_knife", "spear", "axe", "cloth_wrap", "leather"],
  bear: ["spear", "axe", "leather", "iron_plate"],
  swamp_thing: ["cloth_wrap", "leather", "iron_plate"]
};
const RARITY_LABELS = { common:"Gewöhnlich", uncommon:"Ungewöhnlich", rare:"Selten" };

const RECIPES = [
  { id:"verband", name:"Verband", cost:{Holz:3}, result:"consumable", desc:"Heilt später 25 Leben", icon:"🩹" },
  { id:"gegenmittel", name:"Gegengift", cost:{Heilkräuter:2}, result:"consumable", desc:"Entfernt Gift im Kampf", icon:"☠️" },
  { id:"crafted_spear", name:"Speer bauen", cost:{Holz:3, Metall:2}, result:"weapon", desc:"Waffe, +3 Schaden", icon:"🔱" },
  { id:"crafted_armor", name:"Grobe Rüstung bauen", cost:{Leder:3, Metall:2}, result:"armor", desc:"Rüstung, +3 Block", icon:"🛡️" }
];
 const RECIPE_ICON_FILES = {
  verband: "images/icons/heal.png",
  gegenmittel: "images/icons/poison.png",
  crafted_spear: "images/icons/attack.png",
  crafted_armor: "images/icons/shield.png"
};

const WEATHER_TYPES = ["Klar", "Regen", "Nebel", "Sturm"];
const WEATHER_ICONS = {
  "Klar": "images/icons/daylight.png",
  "Regen": "images/icons/rain.png",
  "Nebel": "images/icons/cloudy.png",
  "Sturm": "images/icons/rain.png"
};

const TIME_ICONS = {
  "Morgen": "images/icons/daylight.png",
  "Mittag": "images/icons/daylight.png",
  "Abend": "images/icons/daylight.png",
  "Nacht": "images/icons/night.png"
};

const SHELTER_STAGES = [
  { name:"Notlager", description:"Ein provisorischer Unterschlupf. Er gibt dir einen ersten sicheren Rückzugsort.", next:"Einfaches Lager", cost:8 },
  { name:"Einfaches Lager", description:"Ein fester Schlafplatz mit etwas Schutz vor der Wildnis.", next:"Geschütztes Lager", cost:16 },
  { name:"Geschütztes Lager", description:"Stabile Wände und Ordnung machen deine Pausen sicherer.", next:"Verstärktes Lager", cost:24 },
  { name:"Verstärktes Lager", description:"Dein Lager hält schlechtes Wetter besser aus und gibt dir Rückhalt.", next:"Fester Unterschlupf", cost:32 },
  { name:"Fester Unterschlupf", description:"Ein verlässlicher Ort, an dem du dich von Expeditionen erholen kannst.", next:null, cost:null }
];
