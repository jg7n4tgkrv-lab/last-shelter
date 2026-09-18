/* Last Shelter – camp services
   Phase 1 foundation: shelter, food, treatment, crafting and rest.
*/
function renderCamp() {
  const shelterBox = document.getElementById("shelterBox");
  if (shelterBox) {
    const shelterStage = getShelterStage();
    const nextStage = SHELTER_STAGES[state.shelterLevel] || null;
    const upgradeCost = nextStage ? nextStage.cost : null;
    const canUpgrade = Boolean(nextStage) && countItem("Holz") >= upgradeCost;
    const unbuiltModule = SHELTER_MODULES.find(module => !hasShelterModule(module.id)) || null;
    const builtModuleNames = SHELTER_MODULES
      .filter(module => hasShelterModule(module.id))
      .map(module => module.name)
      .join(" · ");
    const moduleCostText = unbuiltModule
      ? Object.entries(unbuiltModule.cost).map(([item, amount]) => `${amount} ${item}`).join(" + ")
      : "";
    const canBuildModule = Boolean(unbuiltModule)
      && Object.entries(unbuiltModule.cost).every(([item, amount]) => countItem(item) >= amount);
    const shelterModuleHtml = unbuiltModule
      ? `
        <button type="button" class="campActionBtn shelterModuleBtn${canBuildModule ? "" : " disabled"}" onclick="buildShelterModule('${unbuiltModule.id}')" ${canBuildModule ? "" : "disabled"} aria-label="${unbuiltModule.name} bauen">
          <span class="cIcon2"><img src="${unbuiltModule.icon}" alt=""></span>
          <span class="btnText">
            ${unbuiltModule.name} bauen
            <span class="btnSub">${moduleCostText} · ${unbuiltModule.effectText}</span>
          </span>
        </button>
      `
      : `
        <div class="shelterModuleSummary">
          <span>MODULE</span>
          <strong>${builtModuleNames}</strong>
        </div>
      `;
    shelterBox.innerHTML = `
      <h2 class="sectionTitle">
        <img src="images/icons/shelter.png" alt="">
        ${shelterStage.name} · Stufe ${state.shelterLevel}
      </h2>
      <div class="shelterProgress"><span style="width:${Math.min(100, (state.shelterLevel / SHELTER_STAGES.length) * 100)}%"></span></div>
      <p class="shelterDescription">${shelterStage.description} Jede Stufe erhöht maximale Energie und Sicherheit.</p>
      <div class="campStatusGrid">
        <div class="campStatus campMorale">
          <div class="campStatusHead"><span><img src="images/icons/star.png" alt=""> Moral</span><span class="campStatusValue">${state.morale}/100</span></div>
          <div class="campStatusBar"><span style="width:${state.morale}%"></span></div>
        </div>
        <div class="campStatus campSafety">
          <div class="campStatusHead"><span><img src="images/icons/shield.png" alt=""> Sicherheit</span><span class="campStatusValue">${state.safety}/100</span></div>
          <div class="campStatusBar"><span style="width:${state.safety}%"></span></div>
        </div>
      </div>
      ${shelterModuleHtml}
      <button class="campActionBtn shelterUpgrade${canUpgrade ? "" : " disabled"}" onclick="upgradeShelter()">
        <span class="cIcon2"><img src="images/icons/chop-wood.png" alt=""></span>
        <span class="btnText">
          ${nextStage ? `Zu ${nextStage.name} ausbauen` : "Maximale Lagerstufe erreicht"}
          <span class="btnSub">${nextStage ? `${upgradeCost} Holz benötigt · vorhanden: ${countItem("Holz")} · +10 Energie · +10 Sicherheit` : "Dein Unterschlupf ist vollständig ausgebaut."}</span>
        </span>
      </button>
      <button class="campActionBtn" onclick="sleepAtCamp()">
        <span class="cIcon2"><img src="images/icons/sleep.png" alt=""></span>
        <span class="btnText">
          Schlafen und neuen Tag beginnen
          <span class="btnSub">Energie auffüllen · bis zu 15 Leben regenerieren · −15 Hunger</span>
        </span>
      </button>
    `;
  }

const foodButtons = [];
Object.entries(FOOD_DB).forEach(([foodId, food]) => {
  const count = countItem(foodId);
  if (count <= 0) return;
  const hungerBonus = getFoodHungerBonus();
  const hungerValue = food.hunger + hungerBonus;
  const foodEffectLabel = hungerBonus > 0 ? ` · Feuerstelle +${hungerBonus}` : "";
  foodButtons.push(`
    <button class='campActionBtn' onclick='eatFood("${foodId}")'>
      <span class='cIcon2'><img src="${food.icon}" alt=""></span>
      <span class='btnText'>
        ${food.label} essen (${count})
        <span class='btnSub'>+${hungerValue} Hunger${foodEffectLabel}</span>
      </span>
    </button>
  `);
});

const wasserCount = countItem("Wasser");
if (wasserCount > 0) {
  foodButtons.push(`
    <button class='campActionBtn' onclick='drinkWater()'>
      <span class='cIcon2'><img src="${RESOURCE_DB.Wasser.icon}" alt=""></span>
      <span class='btnText'>
        Wasser trinken (${wasserCount})
        <span class='btnSub'>+${RESOURCE_DB.Wasser.energy} Energie</span>
      </span>
    </button>
  `);
}
document.getElementById("eatBtnWrap").innerHTML =
  foodButtons.length > 0
    ? foodButtons.join("")
    : `
      <button class="campActionBtn disabled">
        <span class="cIcon2">
          <img src="images/icons/berries.png" alt="">
        </span>
        <span class="btnText">
          Keine Nahrung im Inventar
        </span>
      </button>
    `;

const bandageCount = state.consumables.filter(c => c === "verband").length;
const antidoteCount = state.consumables.filter(c => c === "gegenmittel").length;
const treatmentButtons = [];
const bandageHealing = 25 + getHealingItemBonus();
const bandageEffectLabel = getHealingItemBonus() > 0 ? ` · Krankenstation +${getHealingItemBonus()}` : "";

if (bandageCount > 0) {
  treatmentButtons.push(`
    <button class="campActionBtn" onclick="useBandage()">
      <span class="cIcon2"><img src="images/icons/heal.png" alt=""></span>
      <span class="btnText">
        Verband benutzen (${bandageCount})
        <span class="btnSub">+${bandageHealing} Leben${bandageEffectLabel}</span>
      </span>
    </button>
  `);
}

if (antidoteCount > 0) {
  treatmentButtons.push(`
    <button class="campActionBtn disabled">
      <span class="cIcon2"><img src="images/icons/poison.png" alt=""></span>
      <span class="btnText">
        Gegengift (${antidoteCount})
        <span class="btnSub">Im Kampf zum Entfernen von Gift</span>
      </span>
    </button>
  `);
}

document.getElementById("bandageBtnWrap").innerHTML =
  treatmentButtons.length > 0
    ? treatmentButtons.join("")
    : `
      <button class="campActionBtn disabled">
        <span class="cIcon2">
          <img src="images/icons/heal.png" alt="">
        </span>
        <span class="btnText">
          Keine Verbände vorhanden
        </span>
      </button>
    `;

  const craftDiv = document.getElementById("craftList");
  craftDiv.innerHTML = "";
  RECIPES.forEach(recipe => {
    const canCraft = hasRecipeCost(recipe);
    const costLabel = formatRecipeCost(recipe);
    const haveLabel = Object.keys(recipe.cost).map(item => `${item}: ${countItem(item)}`).join(" · ");
    const btn = document.createElement("button");
    btn.className = "campActionBtn" + (canCraft ? "" : " disabled");
    btn.innerHTML = `
  <span class="cIcon2">
    <img src="${RECIPE_ICON_FILES[recipe.id]}" alt="">
  </span>

  <span class="btnText">
    ${recipe.name} (${costLabel})
    <span class="btnSub">
      ${recipe.desc} · ${haveLabel}
    </span>
  </span>
`;
    btn.onclick = canCraft ? () => craftItem(recipe) : null;
    craftDiv.appendChild(btn);
  });

  renderForge();
}

function renderForge() {
  const holz = countItem("Holz");
  const atkCount = state.deck.filter(c => c === "attack").length;
  const defCount = state.deck.filter(c => c === "defend").length;

  const forgeDiv = document.getElementById("forgeList");
  forgeDiv.innerHTML = "";

  const entries = [
  {
    label: "Angriffskarte schmieden",
    cost: 4,
    icon: "images/icons/attack.png",
    action: () => forgeCard("attack", 4),
    can: holz >= 4
  },
  {
    label: "Verteidigen-Karte schmieden",
    cost: 4,
    icon: "images/icons/shield.png",
    action: () => forgeCard("defend", 4),
    can: holz >= 4
  },
  {
    label: "Angriff verbessern → Angriff+",
    cost: 6,
    icon: "images/icons/attack.png",
    action: () => upgradeDeckCard("attack", "attack_plus", 6),
    can: holz >= 6 && atkCount > 0,
    note: atkCount === 0 ? "Keine Angriffskarte im Deck" : null
  },
  {
    label: "Verteidigen verbessern → Verteidigen+",
    cost: 6,
    icon: "images/icons/shield.png",
    action: () => upgradeDeckCard("defend", "defend_plus", 6),
    can: holz >= 6 && defCount > 0,
    note: defCount === 0 ? "Keine Verteidigen-Karte im Deck" : null
  },
  {
    label: "Karte: Gezielter Hieb",
    cost: 7,
    icon: "images/icons/attack.png",
    action: () => forgeCard("precise_strike", 7),
    can: holz >= 7
  },
  {
    label: "Karte: Notverband",
    cost: 6,
    icon: "images/icons/heal.png",
    action: () => forgeCard("emergency_bandage", 6),
    can: holz >= 6
  }
];

  entries.forEach(entry => {
    const btn = document.createElement("button");
    btn.className = "campActionBtn" + (entry.can ? "" : " disabled");
    const subText = entry.note ? entry.note : `Kosten: ${entry.cost} Holz – du hast ${holz} Holz`;
    btn.innerHTML = `
  <span class="cIcon2">
    <img src="${entry.icon}" alt="">
  </span>

  <span class="btnText">
    ${entry.label}
    <span class="btnSub">${subText}</span>
  </span>
`;
    btn.onclick = entry.can ? entry.action : null;
    forgeDiv.appendChild(btn);
  });
}

function forgeCard(cardId, cost) {
  if (countItem("Holz") < cost) return;
  for (let i = 0; i < cost; i++) removeOneItem("Holz");
  state.deck.push(cardId);
  saveGame();
  render();
  renderCamp();
}

function upgradeDeckCard(fromId, toId, cost) {
  const idx = state.deck.indexOf(fromId);
  if (idx === -1 || countItem("Holz") < cost) return;
  for (let i = 0; i < cost; i++) removeOneItem("Holz");
  state.deck[idx] = toId;
  saveGame();
  render();
  renderCamp();
}

function sleepAtCamp() {
  if (state.expedition) {
    log("Du bist noch auf Expedition. Kehre zuerst zum Lager zurück.");
    switchTab("screenExplore");
    return;
  }
  const oldHealth = state.health;
  const oldHunger = state.hunger;
  state.energy = getMaxEnergy();
  state.health = Math.min(getMaxHealth(), state.health + 15 + getSleepHealBonus());
  state.hunger = Math.max(0, state.hunger - 15);
  changeCampStatus(5, 2);
  state.timeHour = 7;
  state.day += 1;
  state.dailyGoal = createDailyGoal(state.day);
  state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
  log("Du hast im Lager geschlafen und dich erholt. Ein neuer Morgen beginnt.");
  checkDeathConditions();
  saveGame();
  render();
  renderCamp();
  showMorningSummary({
    healthGain: state.health - oldHealth,
    hungerCost: oldHunger - state.hunger
  });
}

function showMorningSummary(summary) {
  const overlay = document.getElementById("morningOverlay");
  const title = document.getElementById("morningPromptTitle");
  const text = document.getElementById("morningPromptText");
  const facts = document.getElementById("morningFacts");
  const continueButton = document.getElementById("morningContinue");
  if (!overlay || !title || !text || !facts || !continueButton) return;

  title.textContent = `Tag ${state.day}`;
  text.textContent = `${state.weather} · ${formatTime()} · Dein Lager gibt dir Zeit zum Durchatmen.`;
  facts.innerHTML = `
    <div class="morningFact">Energie<strong>${state.energy}/${getMaxEnergy()}</strong></div>
    <div class="morningFact">Leben<strong>+${summary.healthGain}</strong></div>
    <div class="morningFact">Hunger<strong>−${summary.hungerCost}</strong></div>
    <div class="morningFact">Lagerstatus<strong>+5 Moral · +2 Sicherheit</strong></div>
  `;
  overlay.classList.add("active");

  const closeSummary = (event) => {
    if (event && event.type === "touchend") event.preventDefault();
    overlay.classList.remove("active");
  };
  continueButton.onclick = closeSummary;
}

function eatFood(itemId) {
  const food = FOOD_DB[itemId];
  if (!food || countItem(itemId) === 0) return;
  const hungerBonus = getFoodHungerBonus();
  const hungerValue = food.hunger + hungerBonus;
  removeOneItem(itemId);
  state.hunger = Math.min(100, state.hunger + hungerValue);
  log(`Du hast ${food.label} gegessen. +${hungerValue} Hunger.`);
  saveGame();
  render();
  renderCamp();
}

function eatBerries() { eatFood("Beeren"); }
function eatMeat() { eatFood("Fleisch"); }

function drinkWater() {
  const water = RESOURCE_DB.Wasser;
  if (!water || countItem("Wasser") === 0) return;
  removeOneItem("Wasser");
  state.energy = Math.min(getMaxEnergy(), state.energy + water.energy);
  log(`Du hast Wasser getrunken. +${water.energy} Energie.`);
  saveGame();
  render();
  renderCamp();
}

function useBandage() {
  const idx = state.consumables.indexOf("verband");
  if (idx === -1) return;
  const healingValue = 25 + getHealingItemBonus();
  state.consumables.splice(idx, 1);
  state.health = Math.min(getMaxHealth(), state.health + healingValue);
  log(`Du hast einen Verband benutzt und dich um ${healingValue} Leben geheilt.`);
  saveGame();
  render();
  renderCamp();
}

function useAntidote() {
  if (!combat || combat.poisonTurns <= 0) return;
  const idx = state.consumables.indexOf("gegenmittel");
  if (idx === -1) return;
  state.consumables.splice(idx, 1);
  combat.poisonTurns = 0;
  log("Du hast das Gegengift benutzt. Das Gift wurde entfernt.");
  saveGame();
  renderCombat();
}

function craftItem(recipe) {
  if (!hasRecipeCost(recipe)) return;
  spendRecipeCost(recipe);
  if (recipe.result === "consumable") state.consumables.push(recipe.id);
  else state.equipmentInventory.push(recipe.id);
  saveGame();
  render();
  renderCamp();
}

function buildShelterModule(moduleId) {
  const module = SHELTER_MODULES.find(candidate => candidate.id === moduleId);
  if (!module || hasShelterModule(module.id)) return;
  const missing = Object.entries(module.cost).find(([item, amount]) => countItem(item) < amount);
  if (missing) {
    log(`Für den ${module.name} benötigst du ${Object.entries(module.cost).map(([item, amount]) => `${amount} ${item}`).join(" + ")}.`);
    return;
  }
  Object.entries(module.cost).forEach(([item, amount]) => {
    for (let i = 0; i < amount; i += 1) removeOneItem(item);
  });
  if (!Array.isArray(state.shelterModules)) state.shelterModules = [];
  state.shelterModules.push(module.id);
  changeCampStatus(3, 4);
  log(`${module.name} gebaut: ${module.effectText}.`);
  saveGame();
  render();
  renderCamp();
}

function upgradeShelter() {
  const nextStage = SHELTER_STAGES[state.shelterLevel] || null;
  if (!nextStage) {
    log("Dein Lager ist bereits vollständig ausgebaut.");
    return;
  }
  const cost = nextStage.cost;
  if (countItem("Holz") < cost) {
    log(`Für den Ausbau benötigst du ${cost} Holz.`);
    return;
  }
  for (let i = 0; i < cost; i++) removeOneItem("Holz");
  state.shelterLevel += 1;
  state.energy = Math.min(getMaxEnergy(), state.energy + 10);
  changeCampStatus(0, 10);
  log(`Dein Lager ist jetzt ein ${getShelterStage().name}. Maximale Energie und Sicherheit wurden erhöht.`);
  saveGame();
  render();
  renderCamp();
}
