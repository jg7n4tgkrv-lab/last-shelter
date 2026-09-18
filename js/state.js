/* Last Shelter – state and save services
   Phase 1 foundation: runtime state, persistence and pure state helpers.
*/
const CURRENT_SAVE_VERSION = 4;

let state = {
  saveVersion: CURRENT_SAVE_VERSION,
  health: 100, hunger: 100, energy: 100, xp: 0, level: 1, day: 1, shelterLevel: 1, shelterModules: [],
  inventory: [], deck: [...DEFAULT_DECK],
  attributes: { staerke:0, vitalitaet:0, geschicklichkeit:0, ueberleben:0, wahrnehmung:0 },
  pendingLevelUps: 0,
  perks: [],
  equipmentInventory: [], equipped: { weapon: null, armor: null, tool: null, accessory: null },
  consumables: [],
  timeHour: 8, weather: "Klar", pendingEvent: null,
  morale: 60, safety: 50, locationProgress: {}, bossesUnlocked: {}, bossesDefeated: {}, runStats: { expeditions:0, victories:0 }, pendingCardReward: [], dailyGoal: null, expedition: null
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
      health: 100, hunger: 100, energy: 100, xp: 0, level: 1, day: 1, shelterLevel: 1, shelterModules: [],
      inventory: [],
      deck: [...DEFAULT_DECK],
      attributes: { staerke:0, vitalitaet:0, geschicklichkeit:0, ueberleben:0, wahrnehmung:0 },
      pendingLevelUps: 0,
      perks: [],
      equipmentInventory: [], equipped: { weapon: null, armor: null, tool: null, accessory: null },
      consumables: [], timeHour: 8, weather: "Klar", pendingEvent: null,
      morale: 60, safety: 50, locationProgress: {}, runStats: { expeditions:0, victories:0 }, pendingCardReward: [], dailyGoal: null, expedition: null
    }, loaded);
    if (!Number.isFinite(state.saveVersion)) state.saveVersion = 1;
    if (!Array.isArray(state.deck)) state.deck = [...DEFAULT_DECK];
    state.deck = state.deck.filter(cardId => CARD_DB[cardId]);
    if (state.deck.length === 0) state.deck = [...DEFAULT_DECK];
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.equipmentInventory)) state.equipmentInventory = [];
    state.equipmentInventory = state.equipmentInventory.filter(itemId => ITEM_DB[itemId]);
    if (!Array.isArray(state.shelterModules)) state.shelterModules = [];
    state.shelterModules = state.shelterModules.filter(moduleId => SHELTER_MODULES.some(module => module.id === moduleId));
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
    if (!state.equipped || typeof state.equipped !== "object") state.equipped = { weapon: null, armor: null, tool: null, accessory: null };
    if (!Object.prototype.hasOwnProperty.call(state.equipped, "tool")) state.equipped.tool = null;
    if (!Object.prototype.hasOwnProperty.call(state.equipped, "accessory")) state.equipped.accessory = null;
    ["weapon", "armor", "tool", "accessory"].forEach(slot => {
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
    if (!Array.isArray(state.perks)) state.perks = [];
    state.perks = state.perks.filter(perkId => PERKS.some(perk => perk.id === perkId));
    state.pendingCardReward = state.pendingCardReward.filter(cardId => CARD_DB[cardId]);
    if (!state.expedition || typeof state.expedition !== "object" || !LOCATIONS.some(loc => loc.id === state.expedition.locationId)) {
      state.expedition = null;
    } else {
      const expedition = state.expedition;
      if (!Number.isFinite(expedition.hours) || expedition.hours < 0) expedition.hours = 0;
      if (!Number.isFinite(expedition.startingHealth)) expedition.startingHealth = state.health;
      if (!Number.isFinite(expedition.damage) || expedition.damage < 0) expedition.damage = 0;
      if (!Number.isFinite(expedition.encounters) || expedition.encounters < 0) expedition.encounters = 0;
      if (!Number.isFinite(expedition.risk) || expedition.risk < 0) expedition.risk = 0;
      const legacyLootStart = Number.isFinite(expedition.lootStart)
        ? Math.max(0, Math.min(state.inventory.length, Math.floor(expedition.lootStart)))
        : null;
      const legacyLoot = legacyLootStart === null ? [] : state.inventory.slice(legacyLootStart);
      if (!expedition.loot || typeof expedition.loot !== "object" || Array.isArray(expedition.loot)) {
        expedition.loot = {
          inventory: legacyLoot,
          equipment: [],
          consumables: []
        };
        if (legacyLootStart !== null) state.inventory = state.inventory.slice(0, legacyLootStart);
      } else {
        if (!Array.isArray(expedition.loot.inventory)) expedition.loot.inventory = [];
        if (!Array.isArray(expedition.loot.equipment)) expedition.loot.equipment = [];
        if (!Array.isArray(expedition.loot.consumables)) expedition.loot.consumables = [];
      }
      expedition.loot.equipment = expedition.loot.equipment.filter(itemId => ITEM_DB[itemId]);
      expedition.loot.consumables = expedition.loot.consumables.filter(itemId => RECIPES.some(recipe => recipe.id === itemId));
      expedition.awaitingDecision = Boolean(expedition.awaitingDecision);
      delete expedition.lootStart;
    }
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

function addExpeditionLoot(itemId, type = "inventory") {
  if (!itemId) return false;
  if (!hasInventorySpace()) {
    if (typeof log === "function") log("Dein Lager ist voll. Kehre zum Shelter zurück.");
    return false;
  }
  const validTypes = ["inventory", "equipment", "consumables"];
  const targetType = validTypes.includes(type) ? type : "inventory";
  if (state.expedition?.loot && Array.isArray(state.expedition.loot[targetType])) {
    state.expedition.loot[targetType].push(itemId);
    return true;
  }
  if (targetType === "equipment") state.equipmentInventory.push(itemId);
  else if (targetType === "consumables") state.consumables.push(itemId);
  else state.inventory.push(itemId);
  return true;
}

function getExpeditionLootCount() {
  if (!state.expedition?.loot) return 0;
  return ["inventory", "equipment", "consumables"].reduce(
    (total, type) => total + (Array.isArray(state.expedition.loot[type]) ? state.expedition.loot[type].length : 0),
    0
  );
}

function secureExpeditionLoot() {
  if (!state.expedition?.loot) return 0;
  const loot = state.expedition.loot;
  const total = getExpeditionLootCount();
  state.inventory.push(...(loot.inventory || []));
  state.equipmentInventory.push(...(loot.equipment || []));
  state.consumables.push(...(loot.consumables || []));
  return total;
}

function abandonExpeditionLoot() {
  if (!state.expedition) return 0;
  const lostLoot = getExpeditionLootCount();
  state.expedition = null;
  return lostLoot;
}

function getMaxHealth() { return 100 + state.attributes.vitalitaet * 5; }
function getMaxEnergy() { return 100 + (state.shelterLevel - 1) * 10; }
function getShelterStage() {
  return SHELTER_STAGES[Math.min(Math.max(state.shelterLevel, 1), SHELTER_STAGES.length) - 1];
}
function hasShelterModule(moduleId) {
  return Array.isArray(state.shelterModules) && state.shelterModules.includes(moduleId);
}
function getSleepHealBonus() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "sleeping_place");
  return module && hasShelterModule(module.id) && module.effect === "sleepHealBonus"
    ? module.value
    : 0;
}

function getMoraleSleepModifier() {
  if (state.morale >= 70) return 5;
  if (state.morale <= 25) return -5;
  return 0;
}

function getSafetySleepModifier() {
  if (state.safety >= 70) return 3;
  if (state.safety <= 25) return -3;
  return 0;
}

function getSleepHealthRecovery() {
  return Math.max(0, 15 + getSleepHealBonus() + getMoraleSleepModifier() + getSafetySleepModifier());
}

function getSleepEnergyPenalty() {
  return state.safety <= 25 ? 10 : 0;
}

function getSleepEnergyRecovery() {
  return Math.max(0, getMaxEnergy() - getSleepEnergyPenalty());
}

function getSleepQualityLabel() {
  if (state.morale <= 25 || state.safety <= 25) return "unruhiger Schlaf";
  if (state.morale >= 70 && state.safety >= 70) return "erholsamer Schlaf";
  return "ruhiger Schlaf";
}

function getNightRaidChance() {
  if (state.safety >= 70) return 0;
  const baseChance = state.safety <= 25 ? 0.55 : state.safety <= 45 ? 0.18 : 0;
  const fortificationReduction = hasShelterModule("fortification") ? 0.25 : 0;
  return Math.max(0, baseChance - fortificationReduction);
}

function getFoodHungerBonus() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "fireplace");
  return module && hasShelterModule(module.id) && module.effect === "foodHungerBonus"
    ? module.value
    : 0;
}

function getCraftCostReduction() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "workbench");
  return module && hasShelterModule(module.id) && module.effect === "craftCostReduction"
    ? module.value
    : 0;
}

function getInventoryCapacityBonus() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "storage");
  return module && hasShelterModule(module.id) && module.effect === "inventoryCapacityBonus"
    ? module.value
    : 0;
}

function getInventoryCapacity() {
  return 30 + getInventoryCapacityBonus();
}

function getHealingItemBonus() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "infirmary");
  return module && hasShelterModule(module.id) && module.effect === "healingItemBonus"
    ? module.value
    : 0;
}

function getForgeCostReduction() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "forge");
  return module && hasShelterModule(module.id) && module.effect === "forgeCostReduction"
    ? module.value
    : 0;
}

function getEffectiveForgeCost(baseCost) {
  return Math.max(1, baseCost - getForgeCostReduction());
}

function getExplorationEnergyReduction() {
  const module = SHELTER_MODULES.find(candidate => candidate.id === "lookout");
  return module && hasShelterModule(module.id) && module.effect === "explorationEnergyReduction"
    ? module.value
    : 0;
}

function getEffectiveExplorationEnergyCost(baseCost) {
  return Math.max(1, baseCost - getExplorationEnergyReduction());
}

function getEffectiveRecipeCost(recipe) {
  const reduction = getCraftCostReduction();
  return Object.fromEntries(Object.entries(recipe.cost).map(([item, amount]) => [
    item,
    Math.max(1, amount - reduction)
  ]));
}
function getWeaponBonus() { return state.equipped.weapon ? ITEM_DB[state.equipped.weapon].bonus : 0; }
function getArmorBonus() { return state.equipped.armor ? ITEM_DB[state.equipped.armor].bonus : 0; }
function getColdProtection() {
  const armor = state.equipped.armor ? ITEM_DB[state.equipped.armor] : null;
  return armor && Number.isFinite(armor.coldProtection) ? armor.coldProtection : 0;
}
function getPoisonResistance() {
  const armor = state.equipped.armor ? ITEM_DB[state.equipped.armor] : null;
  return armor && Number.isFinite(armor.poisonResistance) ? armor.poisonResistance : 0;
}
function getToolBonus() { return state.equipped.tool && ITEM_DB[state.equipped.tool] ? ITEM_DB[state.equipped.tool].bonus : 0; }
function getAccessoryBonus() {
  const accessory = state.equipped.accessory ? ITEM_DB[state.equipped.accessory] : null;
  return accessory && Number.isFinite(accessory.rareLootBonus) ? accessory.rareLootBonus : 0;
}
function getRarityLabel(itemOrRarity) {
  const rarity = typeof itemOrRarity === "string" ? itemOrRarity : itemOrRarity?.rarity;
  return RARITY_LABELS[rarity] || RARITY_LABELS.common;
}
function getLootTableForEnemy(enemyId) {
  return LOOT_TABLE_BY_ENEMY[enemyId] || LOOT_TABLE;
}
function countItem(name) { return state.inventory.filter(i => i === name).length; }
function hasRecipeCost(recipe) {
  return Object.entries(getEffectiveRecipeCost(recipe)).every(([item, amount]) => countItem(item) >= amount);
}
function spendRecipeCost(recipe) {
  Object.entries(getEffectiveRecipeCost(recipe)).forEach(([item, amount]) => {
    for (let i = 0; i < amount; i++) removeOneItem(item);
  });
}
function formatRecipeCost(recipe) {
  return Object.entries(getEffectiveRecipeCost(recipe)).map(([item, amount]) => `${amount} ${item}`).join(" + ");
}
function getTotalInventoryCount() {
  return state.inventory.length + state.equipmentInventory.length + state.consumables.length;
}
function getInventoryLoad() {
  return getTotalInventoryCount() + getExpeditionLootCount();
}
function hasInventorySpace(amount = 1) {
  return getInventoryLoad() + amount <= getInventoryCapacity();
}
function getInventoryBreakdown() {
  const food = state.inventory.filter(item => FOOD_DB[item]).length;
  return {
    resources: state.inventory.length - food,
    food,
    equipment: state.equipmentInventory.length,
    consumables: state.consumables.length
  };
}
function removeOneItem(name) { const idx = state.inventory.indexOf(name); if (idx !== -1) state.inventory.splice(idx, 1); }
function removeOneFromDeck(cardId) {
  if (!Array.isArray(state.deck) || state.deck.length <= 8) return false;
  const idx = state.deck.indexOf(cardId);
  if (idx === -1) return false;
  state.deck.splice(idx, 1);
  return true;
}
