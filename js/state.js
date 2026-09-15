/* Last Shelter – state and save services
   Phase 1 foundation: runtime state, persistence and pure state helpers.
*/
const CURRENT_SAVE_VERSION = 2;

let state = {
  saveVersion: CURRENT_SAVE_VERSION,
  health: 100, hunger: 100, energy: 100, xp: 0, level: 1, day: 1, shelterLevel: 1,
  inventory: [], deck: [...DEFAULT_DECK],
  attributes: { staerke:0, vitalitaet:0, geschicklichkeit:0, ueberleben:0, wahrnehmung:0 },
  pendingLevelUps: 0,
  equipmentInventory: [], equipped: { weapon: null, armor: null, tool: null },
  consumables: [],
  timeHour: 8, weather: "Klar", pendingEvent: null,
  morale: 60, safety: 50, locationProgress: {}, bossesUnlocked: {}, bossesDefeated: {}, runStats: { expeditions:0, victories:0 }, pendingCardReward: [], dailyGoal: null
};

let combat = null;
let currentTab = "screenExplore";
let selectedLocationId = "wald";
let lastRenderedVitals = null;

function loadGame() {
  const saved = localStorage.getItem("lastShelterSave");
  if (saved) {
    let loaded;
    try {
      loaded = JSON.parse(saved);
    } catch (error) {
      localStorage.removeItem("lastShelterSave");
      loaded = null;
    }
    if (!loaded || typeof loaded !== "object") return;
    state = Object.assign({
      saveVersion: CURRENT_SAVE_VERSION,
      health: 100, hunger: 100, energy: 100, xp: 0, level: 1, day: 1, shelterLevel: 1,
      inventory: [],
      deck: [...DEFAULT_DECK],
      attributes: { staerke:0, vitalitaet:0, geschicklichkeit:0, ueberleben:0, wahrnehmung:0 },
      pendingLevelUps: 0,
      equipmentInventory: [], equipped: { weapon: null, armor: null, tool: null },
      consumables: [], timeHour: 8, weather: "Klar", pendingEvent: null,
      morale: 60, safety: 50, locationProgress: {}, runStats: { expeditions:0, victories:0 }, pendingCardReward: [], dailyGoal: null
    }, loaded);
    if (!Number.isFinite(state.saveVersion)) state.saveVersion = 1;
    if (!Array.isArray(state.deck)) state.deck = [...DEFAULT_DECK];
    state.deck = state.deck.filter(cardId => CARD_DB[cardId]);
    if (state.deck.length === 0) state.deck = [...DEFAULT_DECK];
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.equipmentInventory)) state.equipmentInventory = [];
    state.equipmentInventory = state.equipmentInventory.filter(itemId => ITEM_DB[itemId]);
    if (!Array.isArray(state.consumables)) state.consumables = [];
    state.consumables = state.consumables.filter(itemId => RECIPES.some(recipe => recipe.id === itemId));
    if (!Number.isFinite(state.health)) state.health = 100;
    if (!Number.isFinite(state.hunger)) state.hunger = 100;
    if (!Number.isFinite(state.energy)) state.energy = 100;
    if (!Number.isFinite(state.xp)) state.xp = 0;
    if (!Number.isFinite(state.level) || state.level < 1) state.level = 1;
    if (!Number.isFinite(state.day) || state.day < 1) state.day = 1;
    if (!Number.isFinite(state.shelterLevel) || state.shelterLevel < 1) state.shelterLevel = 1;
    const defaultAttributes = { staerke:0, vitalitaet:0, geschicklichkeit:0, ueberleben:0, wahrnehmung:0 };
    state.attributes = Object.assign(defaultAttributes, state.attributes && typeof state.attributes === "object" ? state.attributes : {});
    Object.keys(defaultAttributes).forEach(attr => {
      if (!Number.isFinite(state.attributes[attr]) || state.attributes[attr] < 0) state.attributes[attr] = 0;
      state.attributes[attr] = Math.floor(state.attributes[attr]);
    });
    if (!state.equipped || typeof state.equipped !== "object") state.equipped = { weapon: null, armor: null, tool: null };
    if (!Object.prototype.hasOwnProperty.call(state.equipped, "tool")) state.equipped.tool = null;
    ["weapon", "armor", "tool"].forEach(slot => {
      if (state.equipped[slot] && !ITEM_DB[state.equipped[slot]]) state.equipped[slot] = null;
    });
    if (state.timeHour === undefined) state.timeHour = 8;
    if (!state.weather) state.weather = "Klar";
    if (!state.pendingEvent || !EVENT_DB[state.pendingEvent.id]) state.pendingEvent = null;
    if (!Number.isFinite(state.morale)) state.morale = 60;
    if (!Number.isFinite(state.safety)) state.safety = 50;
    state.morale = Math.max(0, Math.min(100, state.morale));
    state.safety = Math.max(0, Math.min(100, state.safety));
    if (!state.locationProgress || typeof state.locationProgress !== "object") state.locationProgress = {};
    if (!state.bossesUnlocked || typeof state.bossesUnlocked !== "object") state.bossesUnlocked = {};
    if (!state.bossesDefeated || typeof state.bossesDefeated !== "object") state.bossesDefeated = {};
    if (!state.runStats || typeof state.runStats !== "object") state.runStats = { expeditions:0, victories:0 };
    if (!Number.isFinite(state.runStats.expeditions)) state.runStats.expeditions = 0;
    if (!Number.isFinite(state.runStats.victories)) state.runStats.victories = 0;
    if (!Array.isArray(state.pendingCardReward)) state.pendingCardReward = [];
    state.pendingCardReward = state.pendingCardReward.filter(cardId => CARD_DB[cardId]);
    if (!Number.isFinite(state.timeHour)) state.timeHour = 8;
    state.timeHour = ((Math.floor(state.timeHour) % 24) + 24) % 24;
    if (!WEATHER_TYPES.includes(state.weather)) state.weather = "Klar";
    state.shelterLevel = Math.min(state.shelterLevel, SHELTER_STAGES.length);
    state.hunger = Math.max(0, Math.min(100, state.hunger));
    state.energy = Math.max(0, Math.min(getMaxEnergy(), state.energy));
    state.health = Math.max(0, Math.min(getMaxHealth(), state.health));
    state.saveVersion = CURRENT_SAVE_VERSION;
    saveGame();
  }
  ensureDailyGoal();
}

function saveGame() {
  state.saveVersion = CURRENT_SAVE_VERSION;
  localStorage.setItem("lastShelterSave", JSON.stringify(state));
}

function getMaxHealth() { return 100 + state.attributes.vitalitaet * 5; }
function getMaxEnergy() { return 100 + (state.shelterLevel - 1) * 10; }
function getShelterStage() {
  return SHELTER_STAGES[Math.min(Math.max(state.shelterLevel, 1), SHELTER_STAGES.length) - 1];
}
function getWeaponBonus() { return state.equipped.weapon ? ITEM_DB[state.equipped.weapon].bonus : 0; }
function getArmorBonus() { return state.equipped.armor ? ITEM_DB[state.equipped.armor].bonus : 0; }
function getToolBonus() { return state.equipped.tool && ITEM_DB[state.equipped.tool] ? ITEM_DB[state.equipped.tool].bonus : 0; }
function getRarityLabel(itemOrRarity) {
  const rarity = typeof itemOrRarity === "string" ? itemOrRarity : itemOrRarity?.rarity;
  return RARITY_LABELS[rarity] || RARITY_LABELS.common;
}
function getLootTableForEnemy(enemyId) {
  return LOOT_TABLE_BY_ENEMY[enemyId] || LOOT_TABLE;
}
function countItem(name) { return state.inventory.filter(i => i === name).length; }
function hasRecipeCost(recipe) {
  return Object.entries(recipe.cost).every(([item, amount]) => countItem(item) >= amount);
}
function spendRecipeCost(recipe) {
  Object.entries(recipe.cost).forEach(([item, amount]) => {
    for (let i = 0; i < amount; i++) removeOneItem(item);
  });
}
function formatRecipeCost(recipe) {
  return Object.entries(recipe.cost).map(([item, amount]) => `${amount} ${item}`).join(" + ");
}
function getTotalInventoryCount() {
  return state.inventory.length + state.equipmentInventory.length + state.consumables.length;
}
function getInventoryBreakdown() {
  const food = state.inventory.filter(item => item === "Beeren" || item === "Fleisch").length;
  return {
    resources: state.inventory.length - food,
    food,
    equipment: state.equipmentInventory.length,
    consumables: state.consumables.length
  };
}
function removeOneItem(name) { const idx = state.inventory.indexOf(name); if (idx !== -1) state.inventory.splice(idx, 1); }
function removeOneFromDeck(cardId) { const idx = state.deck.indexOf(cardId); if (idx !== -1) state.deck.splice(idx, 1); }
