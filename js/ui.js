/* Last Shelter – UI, rendering and remaining shared game helpers */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasActiveBossAction() {
  const location = LOCATIONS.find(loc => loc.id === selectedLocationId);
  return Boolean(location && state.bossesUnlocked?.[location.id] && !state.bossesDefeated?.[location.id]);
}

function updateExploreLayoutMode() {
  const main = document.getElementById("main");
  if (!main) return;
  const compactExplore = currentTab === "screenExplore" && !hasActiveBossAction();
  main.classList.toggle("exploreFixed", compactExplore);
  main.classList.toggle("exploreExpanded", currentTab === "screenExplore" && !compactExplore);
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  document.querySelectorAll(".tabBtn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  const main = document.getElementById("main");
  if (main) {
    main.scrollTop = 0;
    updateExploreLayoutMode();
  }
  if (tabId === "screenCamp") renderCamp();
  if (tabId === "screenCharacter") renderCharacter();
}

function getWorldMapIcon(location) {
  return location.exploreAction?.icon
    || location.specialAction?.icon
    || RESOURCE_DB[location.gatherItem]?.icon
    || "images/icons/compass.png";
}

function getLocationProgressStatus(location) {
  const progress = Math.min(getLocationProgress(location), LOCATION_BOSS_GOAL);
  const progressLabel = `${progress}/${LOCATION_BOSS_GOAL}`;
  if (state.bossesDefeated?.[location.id]) return `${progressLabel} · Gebiet gesichert`;
  if (state.bossesUnlocked?.[location.id]) return `${progressLabel} · Wächter wartet`;
  return `Spuren ${progressLabel}`;
}

function getWorldMapNodeState(location) {
  if (state.level < location.minLevel) return `Ab Level ${location.minLevel}`;
  return getLocationProgressStatus(location);
}

function openWorldMap() {
  const overlay = document.getElementById("worldMapOverlay");
  if (!overlay) return;
  renderWorldMap();
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
}

function closeWorldMap() {
  const overlay = document.getElementById("worldMapOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  overlay.setAttribute("aria-hidden", "true");
}

function selectWorldMapLocation(locationId) {
  const location = LOCATIONS.find(item => item.id === locationId);
  if (!location || state.level < location.minLevel) return;
  selectLocation(location);
  closeWorldMap();
}

function renderWorldMap() {
  const nodes = document.getElementById("worldMapNodes");
  if (!nodes) return;
  const locationNodes = LOCATIONS.map(location => {
    const unlocked = state.level >= location.minLevel;
    const selected = location.id === selectedLocationId;
    const defeated = Boolean(state.bossesDefeated?.[location.id]);
    const classes = [
      "worldMapNode",
      `mapNode-${location.id}`,
      unlocked ? "available" : "locked",
      selected ? "current" : "",
      defeated ? "defeated" : ""
    ].filter(Boolean).join(" ");
    const status = getWorldMapNodeState(location);
    return `
      <button class="${classes}" type="button" onclick="selectWorldMapLocation('${location.id}')" ${unlocked ? "" : " disabled"} aria-label="${location.name}: ${status}">
        <img src="${getWorldMapIcon(location)}" alt="">
        <span class="worldMapNodeName">${location.name}</span>
        <span class="worldMapNodeState">${status}</span>
      </button>
    `;
  }).join("");

  nodes.innerHTML = `
    <div class="worldMapShelter">
      <img src="images/icons/shelter.png" alt="">
      <span class="worldMapShelterName">Shelter</span>
      <span class="worldMapShelterState">dein Rückzugsort</span>
    </div>
    ${locationNodes}
  `;
}

function getTimeOfDay() {
  const h = state.timeHour;
  if (h >= 5 && h < 11) return "Morgen";
  if (h >= 11 && h < 17) return "Mittag";
  if (h >= 17 && h < 21) return "Abend";
  return "Nacht";
}
function isNight() { return getTimeOfDay() === "Nacht"; }
function advanceTime(hours) {
  state.timeHour = (state.timeHour + hours) % 24;
  if (Math.random() < 0.3) state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
}
function formatTime() { return `${String(state.timeHour).padStart(2, "0")}:00`; }
function updateBodyClass() {
  document.body.classList.toggle("night", isNight());
  document.body.classList.remove("weather-clear", "weather-rain", "weather-fog", "weather-storm");
  const weatherClass = {
    Klar: "weather-clear",
    Regen: "weather-rain",
    Nebel: "weather-fog",
    Sturm: "weather-storm"
  }[state.weather] || "weather-clear";
  document.body.classList.add(weatherClass);
}
function getConditionLabel() {
  if (state.health <= getMaxHealth() * 0.35) return "Verletzt";
  if (state.energy <= 25) return "Erschöpft";
  if (state.hunger <= 25) return "Hungrig";
  if (state.morale <= 25) return "Niedrige Moral";
  if (state.safety <= 25) return "Lager unsicher";
  return "Bereit";
}

function changeCampStatus(moraleDelta = 0, safetyDelta = 0) {
  state.morale = Math.max(0, Math.min(100, state.morale + moraleDelta));
  state.safety = Math.max(0, Math.min(100, state.safety + safetyDelta));
}

function getLocationProgress(location) {
  const value = state.locationProgress && state.locationProgress[location.id];
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function recordLocationProgress(location) {
  if (!state.locationProgress) state.locationProgress = {};
  const current = getLocationProgress(location);
  if (!state.bossesUnlocked || typeof state.bossesUnlocked !== "object") state.bossesUnlocked = {};
  if (!state.bossesDefeated || typeof state.bossesDefeated !== "object") state.bossesDefeated = {};

  if (current >= LOCATION_BOSS_GOAL) {
    if (!state.bossesDefeated[location.id]) state.bossesUnlocked[location.id] = true;
    return state.bossesDefeated[location.id]
      ? "Gebiet gesichert."
      : `Gebiet vollständig erkundet. ${location.bossName} wartet.`;
  }

  const next = Math.min(LOCATION_BOSS_GOAL, current + 1);
  state.locationProgress[location.id] = next;
  const bossUnlocked = next === LOCATION_BOSS_GOAL && !state.bossesUnlocked[location.id] && !state.bossesDefeated[location.id];
  if (bossUnlocked) state.bossesUnlocked[location.id] = true;
  const bossMessage = bossUnlocked ? `Gebietswächter freigeschaltet: ${location.bossName}.` : "";
  if (next % LOCATION_GOAL !== 0) return "";

  state.xp += 12;
  if (location.id === "ruinen") {
    const stored = addExpeditionLoot("rusty_knife", "equipment");
    return `Entdeckung: Rostiges Messer ${stored ? "gefunden" : "gefunden, aber das Lager ist voll"}. +12 XP. ${bossMessage}`.trim();
  }
  if (location.id === "fluss") {
    const firstStored = addExpeditionLoot("Beeren");
    const secondStored = addExpeditionLoot("Beeren");
    return `Entdeckung: ${firstStored && secondStored ? "2 Beeren gefunden" : "Beeren gefunden, aber das Lager ist voll"}. +12 XP. ${bossMessage}`.trim();
  }
  if (location.id === "berge") {
    const stored = addExpeditionLoot("spear", "equipment");
    return `Entdeckung: Speer ${stored ? "gefunden" : "gefunden, aber das Lager ist voll"}. +12 XP. ${bossMessage}`.trim();
  }
  if (location.id === "sumpf") {
    const stored = addExpeditionLoot("verband", "consumables");
    return `Entdeckung: Verband ${stored ? "gefunden" : "gefunden, aber das Lager ist voll"}. +12 XP. ${bossMessage}`.trim();
  }
  const stored = addExpeditionLoot("hand_axe", "equipment");
  return `Entdeckung: Handaxt ${stored ? "gefunden" : "gefunden, aber das Lager ist voll"}. +12 XP. ${bossMessage}`.trim();
}

function createDailyGoal(day) {
  const template = DAILY_GOALS[(day - 1) % DAILY_GOALS.length];
  return { ...template, day, progress: 0, completed: false };
}

function ensureDailyGoal() {
  const template = DAILY_GOALS.find(goal => goal.type === state.dailyGoal?.type);
  if (!state.dailyGoal || state.dailyGoal.day !== state.day || !template) {
    state.dailyGoal = createDailyGoal(state.day);
    return;
  }
  state.dailyGoal = {
    ...state.dailyGoal,
    type: template.type,
    label: template.label,
    target: template.target,
    day: state.day
  };
  if (!Number.isFinite(state.dailyGoal.progress)) state.dailyGoal.progress = 0;
  state.dailyGoal.progress = Math.max(0, Math.min(template.target, state.dailyGoal.progress));
  state.dailyGoal.completed = state.dailyGoal.progress >= template.target;
}

function getDailyGoalHint() {
  ensureDailyGoal();
  const goal = state.dailyGoal;
  return goal.completed ? `Ziel: ${goal.label} ✓` : `Ziel: ${goal.label} ${goal.progress}/${goal.target}`;
}

function progressDailyGoal(type) {
  ensureDailyGoal();
  const goal = state.dailyGoal;
  if (goal.completed || goal.type !== type) return "";
  goal.progress += 1;
  if (goal.progress < goal.target) return "";

  goal.completed = true;
  state.xp += 12;
  const stored = addExpeditionLoot("Holz");
  return stored
    ? "Tagesziel erfüllt! +12 XP und 1 Holz."
    : "Tagesziel erfüllt! +12 XP, aber dein Lager ist voll.";
}

function appendLatestLog(extraMessage) {
  if (!extraMessage) return;
  const logElement = document.getElementById("log");
  const currentMessage = logElement ? logElement.textContent : "";
  log(`${currentMessage} ${extraMessage}`.trim());
}

function showVitalDelta(elementId, delta) {
  if (!delta) return;
  const valueElement = document.getElementById(elementId);
  const card = valueElement ? valueElement.closest(".needCard") : null;
  if (!card) return;
  const oldDelta = card.querySelector(".vitalDelta");
  if (oldDelta) oldDelta.remove();
  const deltaElement = document.createElement("span");
  deltaElement.className = "vitalDelta " + (delta > 0 ? "positive" : "negative");
  deltaElement.textContent = `${delta > 0 ? "+" : ""}${delta}`;
  card.appendChild(deltaElement);
  setTimeout(() => deltaElement.remove(), 1200);
}

function render() {
  updateBodyClass();
  updateExploreLayoutMode();
  const maxHp = getMaxHealth();

  document.getElementById("quickStats").innerHTML = `
    <div class="qBlock">
      <span class="qLabel">
        <img class="uiIcon" src="images/icons/health.png" alt="">
        LEBEN
      </span>
      <span class="qVal qHealth">${state.health}/${maxHp}</span>
    </div>

    <div class="qBlock">
      <span class="qLabel">
        <img class="uiIcon" src="images/icons/hunger.png" alt="">
        HUNGER
      </span>
      <span class="qVal qHunger">${state.hunger}</span>
    </div>

    <div class="qBlock">
      <span class="qLabel">
        <img class="uiIcon" src="images/icons/energy.png" alt="">
        ENERGIE
      </span>
      <span class="qVal qEnergy">${state.energy}/${getMaxEnergy()}</span>
    </div>
  `;

  const timeOfDay = getTimeOfDay();

  document.getElementById("worldLine").innerHTML = `
    <span>
      <img class="worldIcon" src="${TIME_ICONS[timeOfDay]}" alt="">
      ${formatTime()} · ${timeOfDay}
    </span>

    <span>
      <img class="worldIcon" src="${WEATHER_ICONS[state.weather]}" alt="">
      ${state.weather}
    </span>

    <span>
      <img class="worldIcon" src="images/icons/star.png" alt="">
      Lv. ${state.level}
    </span>
  `;

  const mobileHealth = document.getElementById("mobileHealth");
  if (mobileHealth) {
    const currentVitals = {
      health: state.health,
      hunger: state.hunger,
      energy: state.energy
    };
    if (lastRenderedVitals) {
      showVitalDelta("mobileHealth", currentVitals.health - lastRenderedVitals.health);
      showVitalDelta("mobileHunger", currentVitals.hunger - lastRenderedVitals.hunger);
      showVitalDelta("mobileEnergy", currentVitals.energy - lastRenderedVitals.energy);
    }
    lastRenderedVitals = currentVitals;

    mobileHealth.textContent = `${state.health}/${maxHp}`;
    document.getElementById("mobileHunger").textContent = state.hunger;
    document.getElementById("mobileEnergy").textContent = `${state.energy}/${getMaxEnergy()}`;
    document.getElementById("mobileLevel").textContent = state.level;
    document.getElementById("mobileDay").textContent = `TAG ${state.day}`;
    document.getElementById("mobileTime").textContent = formatTime();
    document.getElementById("mobileWeather").textContent = state.weather;
    document.getElementById("mobileWeatherText").innerHTML = `${state.weather} · ${timeOfDay} · <span id="mobileCondition">${getConditionLabel()}</span>`;
    document.getElementById("mobileWeatherIcon").src = WEATHER_ICONS[state.weather];
    document.getElementById("mobileInvCount").textContent = getTotalInventoryCount();
  }

  const inventoryMeta = document.getElementById("inventoryMeta");
  if (inventoryMeta) {
    const inventoryBreakdown = getInventoryBreakdown();
    const parts = [`Lager ${getInventoryLoad()}/${getInventoryCapacity()}`];
    if (inventoryBreakdown.resources > 0) parts.push(`Rohstoffe ${inventoryBreakdown.resources}`);
    if (inventoryBreakdown.food > 0) parts.push(`Nahrung ${inventoryBreakdown.food}`);
    if (inventoryBreakdown.equipment > 0) parts.push(`Ausrüstung ${inventoryBreakdown.equipment}`);
    if (inventoryBreakdown.consumables > 0) parts.push(`Verbrauch ${inventoryBreakdown.consumables}`);
    inventoryMeta.textContent = parts.length ? parts.join(" · ") : "leer";
  }

  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  LOCATIONS.forEach(loc => {
    const card = document.createElement("div");
    const unlocked = state.level >= loc.minLevel;

    card.className = "card" + (unlocked ? "" : " locked") + (loc.id === selectedLocationId ? " selected" : "");
    card.style.setProperty("--accent", loc.accent);

    if (unlocked) {
      const bossStatus = getLocationProgressStatus(loc);
      card.innerHTML = `
        <span class="cIcon">${loc.icon}</span>
        <span class="locationName">${loc.name}</span>
        <span class="locationProgress">${bossStatus}</span>
      `;
      card.onclick = () => selectLocation(loc);
    } else {
      card.innerHTML = `
  <span class="cIcon">${loc.icon}</span>
  ${loc.name}

  <span class="lockNote">
    <img class="lockIcon" src="images/icons/locked.png" alt="">
    Ab Level ${loc.minLevel}
  </span>
`;
    }

    cardsDiv.appendChild(card);
  });

  renderActionCards();
  renderWorldMap();

  const inventoryCounts = {};
  state.inventory.forEach(item => {
    inventoryCounts[item] = (inventoryCounts[item] || 0) + 1;
  });

  const inventoryCards = Object.entries(inventoryCounts).map(([item, count]) => {
    const foodInfo = FOOD_DB[item];
    const resourceInfo = RESOURCE_DB[item];
    const waterInfo = resourceInfo && Number.isFinite(resourceInfo.energy) ? resourceInfo : null;
    const itemInfo = foodInfo || resourceInfo;
    const icon = itemInfo ? itemInfo.icon : "images/icons/berries.png";
    const actionable = Boolean(foodInfo || waterInfo);
    const action = foodInfo
      ? `eatFood("${item}")`
      : waterInfo
        ? "drinkWater()"
        : "";
    const actionLabel = foodInfo
      ? `Antippen zum Essen · +${foodInfo.hunger} Hunger`
      : waterInfo
        ? `Antippen zum Trinken · +${waterInfo.energy} Energie`
        : "Antippen zum Essen";
    return `
      <div class="itemCard${actionable ? " actionable" : ""}"${actionable ? ` onclick="${action}"` : ""}>
        <img src="${icon}" alt="">
        <span class="itemCardText">
          <span class="itemCardName">${item}</span>
          <span class="itemCardCount">×${count} · ${foodInfo ? "Nahrung" : "Rohstoff"}</span>
          ${actionable ? `<span class="itemAction">${actionLabel}</span>` : ""}
        </span>
      </div>
    `;
  });

  const equipmentCounts = {};
  state.equipmentInventory.forEach(itemId => {
    equipmentCounts[itemId] = (equipmentCounts[itemId] || 0) + 1;
  });
  Object.entries(equipmentCounts).forEach(([itemId, count]) => {
    const item = ITEM_DB[itemId];
    const equipmentIndex = state.equipmentInventory.indexOf(itemId);
    inventoryCards.push(`
      <div class="itemCard equipment rarity-${item.rarity || "common"} actionable" onclick="equipItem(${equipmentIndex})">
        <img src="${ITEM_ICON_FILES[itemId]}" alt="">
        <span class="itemCardText">
          <span class="itemCardName">${item.name}</span>
          <span class="itemCardCount">×${count} · ${getRarityLabel(item)} · Ausrüstung</span>
          <span class="itemAction">Antippen zum Ausrüsten</span>
        </span>
      </div>
    `);
  });

  const consumableCounts = {};
  state.consumables.forEach(itemId => {
    consumableCounts[itemId] = (consumableCounts[itemId] || 0) + 1;
  });
  Object.entries(consumableCounts).forEach(([itemId, count]) => {
    const recipe = RECIPES.find(r => r.id === itemId);
    const action = itemId === "verband" ? ' onclick="useBandage()"' : "";
    const actionLabel = itemId === "gegenmittel" ? "Im Kampf zum Entfernen von Gift" : "Antippen zum Benutzen";
    inventoryCards.push(`
      <div class="itemCard consumable${action ? " actionable" : ""}"${action}>
        <img src="${RECIPE_ICON_FILES[itemId]}" alt="">
        <span class="itemCardText">
          <span class="itemCardName">${recipe ? recipe.name : itemId}</span>
          <span class="itemCardCount">×${count} · Verbrauch</span>
          ${action ? `<span class="itemAction">${actionLabel}</span>` : itemId === "gegenmittel" ? `<span class="itemAction">${actionLabel}</span>` : ""}
        </span>
      </div>
    `);
  });

  document.getElementById("invList").innerHTML = inventoryCards.length
    ? inventoryCards.join("")
    : `<span class="inventoryEmpty">Noch keine Gegenstände gesammelt.</span>`;

  if (currentTab === "screenCharacter") renderCharacter();
  if (currentTab === "screenCamp") renderCamp();
}

function log(msg) {
  const el = document.getElementById("log");
  el.classList.remove("animate");
  void el.offsetWidth;
  el.textContent = msg;
  el.classList.add("animate");

  const eventText = document.getElementById("eventText");
  if (eventText) {
    const eventTitle = document.getElementById("eventTitle");
    const eventTime = document.getElementById("eventTime");
    if (eventTitle) {
      if (/Sieg|XP erhalten|gesammelt|gefunden|ausgebaut|gegessen|geheilt|ausgerüstet/i.test(msg)) {
        eventTitle.textContent = "Ein guter Ausgang";
      } else if (/Gefahr|besiegt|verletzt|zu wenig|Hungrig|überrascht/i.test(msg)) {
        eventTitle.textContent = "Die Wildnis antwortet";
      } else {
        eventTitle.textContent = "Deine Entscheidung";
      }
    }
    eventText.textContent = msg;
    if (eventTime) eventTime.textContent = formatTime();
  }
}

function checkLevelUp() {
  let levelsGained = 0;
  while (state.xp >= state.level * 50) {
    state.xp -= state.level * 50;
    state.level += 1;
    state.pendingLevelUps = (state.pendingLevelUps || 0) + 1;
    levelsGained += 1;
  }
  if (levelsGained === 1) {
    log(`Level Up! Du bist jetzt Level ${state.level}.`);
  } else if (levelsGained > 1) {
    log(`${levelsGained} Level-Ups! Du bist jetzt Level ${state.level}.`);
  }
}

function checkDeathConditions() {
  if (state.hunger <= 0) state.health -= 5;
  if (state.health <= 0) {
    state.health = getMaxHealth();
    state.hunger = 100;
    state.energy = getMaxEnergy();
    changeCampStatus(-10, -5);
    log("Du bist zusammengebrochen und wurdest gerettet. Werte zurückgesetzt.");
  }
}

