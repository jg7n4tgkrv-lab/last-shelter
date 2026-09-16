/* Last Shelter – exploration services
   Phase 1 foundation: region selection and expedition actions.
*/
function getSelectedLocation() {
  return LOCATIONS.find(loc => loc.id === selectedLocationId) || LOCATIONS[0];
}

function getDangerLabel(location) {
  if (location.danger >= 0.78) return "Gefahr: hoch";
  if (location.danger >= 0.6) return "Gefahr: mittel";
  return "Gefahr: niedrig";
}

function selectLocation(loc) {
  if (state.level < loc.minLevel) return;
  if (state.expedition && state.expedition.locationId !== loc.id) {
    log("Du bist noch auf Expedition. Kehre zuerst zum Lager zurück.");
    return;
  }
  selectedLocationId = loc.id;
  log(`${loc.name} ausgewählt. Welche Aktion möchtest du ausführen?`);
  render();
}

function getExpeditionRiskLabel() {
  const score = Math.min(100, state.expedition ? state.expedition.risk : 0);
  if (score >= 60) return "hoch";
  if (score >= 30) return "mittel";
  return "niedrig";
}

function getExpeditionEscalation() {
  return state.expedition ? Math.min(6, Math.floor(state.expedition.hours / 4)) : 0;
}

function grantExpeditionXp(baseAmount) {
  const riskBonus = state.expedition
    ? Math.min(0.5, state.expedition.risk / 200)
    : 0;
  const total = baseAmount + Math.floor(baseAmount * riskBonus);
  state.xp += total;
  return total;
}

function beginExpedition(location) {
  if (state.expedition) {
    return state.expedition.locationId === location.id;
  }
  state.expedition = {
    locationId: location.id,
    hours: 0,
    loot: { inventory: [], equipment: [], consumables: [] },
    startingHealth: state.health,
    damage: 0,
    encounters: 0,
    risk: 0,
    awaitingDecision: false
  };
  if (!state.runStats || typeof state.runStats !== "object") state.runStats = { expeditions: 0, victories: 0 };
  state.runStats.expeditions = (Number.isFinite(state.runStats.expeditions) ? state.runStats.expeditions : 0) + 1;
  return true;
}

function recordExpeditionAction(location, hours) {
  if (!state.expedition || state.expedition.locationId !== location.id) return;
  state.expedition.hours += hours;
  state.expedition.damage = Math.max(0, state.expedition.startingHealth - state.health);
  state.expedition.risk = Math.min(
    100,
    state.expedition.risk + 8 + Math.round(location.danger * 18) + (isNight() ? 12 : 0)
  );
  state.expedition.awaitingDecision = true;
}

function continueExpedition() {
  if (!state.expedition) return;
  state.expedition.awaitingDecision = false;
  log("Du setzt die Expedition fort. Die nächste Begegnung kann gefährlicher werden.");
  saveGame();
  render();
}

function returnToCamp() {
  if (!state.expedition) return;
  const expedition = state.expedition;
  const lootCount = Math.max(0, state.inventory.length - expedition.lootStart);
  const damage = Math.max(expedition.damage, expedition.startingHealth - state.health);
  const hours = expedition.hours;
  const securedLoot = secureExpeditionLoot();
  state.expedition = null;
  log(`Du kehrst ins Lager zurück. Beute gesichert: ${securedLoot} · Zeit draußen: ${hours} h · Schaden: ${damage}.`);
  saveGame();
  render();
  switchTab("screenCamp");
}

function getMountainColdPenalty(location) {
  if (!location || location.id !== "berge") return 0;
  return Math.max(0, 3 - getColdProtection());
}

function getMountainColdNote(location) {
  const penalty = getMountainColdPenalty(location);
  return penalty > 0 ? ` Kälte: −${penalty} zusätzliche Energie.` : "";
}

function renderActionCards() {
  const location = getSelectedLocation();
  const label = document.getElementById("selectedLocationLabel");
  const actionDiv = document.getElementById("actionCards");
  if (!label || !actionDiv) return;

  const escalation = getExpeditionEscalation();
  const coldPenalty = getMountainColdPenalty(location);
  const gatherEnergyCost = 5 + escalation + coldPenalty;
  const exploreEnergyCost = Math.max(4, 10 - state.attributes.ueberleben)
    + escalation
    + coldPenalty
    + (state.weather === "Sturm" ? 5 : 0);
  const exploreHungerCost = Math.max(2, 5 - Math.floor(state.attributes.ueberleben / 2))
    + (state.weather === "Regen" ? 3 : 0);
  const trackEnergyCost = 4 + escalation + coldPenalty;
  const trackHungerCost = 1 + Math.floor(escalation / 2);
  const canGather = state.energy >= gatherEnergyCost;
  const canExplore = state.energy >= exploreEnergyCost;
  const canTrack = state.energy >= trackEnergyCost;
  const gatherItem = location.gatherItem || "Holz";
  const gatherItemInfo = RESOURCE_DB[gatherItem] || FOOD_DB[gatherItem];
  const specialAction = location.specialAction || null;
  const exploreAction = location.exploreAction || null;
  const gatherActionName = specialAction?.name || "Sorgfältig sammeln";
  const exploreActionName = exploreAction?.name || "Gebiet erkunden";
  const exploreActionDesc = exploreAction?.desc || location.exploreDesc;
  const exploreIcon = exploreAction?.icon || "images/icons/compass.png";
  const gatherActionDesc = specialAction?.desc || location.gatherDesc;
  const gatherActionHandler = specialAction?.id === "fish" ? "fishAtRiver()" : "gatherResources()";
  const gatherIcon = specialAction?.icon || gatherItemInfo?.icon || "images/icons/forest.png";

  if (state.expedition?.awaitingDecision) {
    const lootCount = getExpeditionLootCount();
    actionDiv.className = "actionCards";
    actionDiv.innerHTML = `
      <div class="expeditionPanel">
        <div class="expeditionPanelHead">
          <span><img src="images/icons/compass.png" alt=""> Expedition</span>
          <small>${state.expedition.hours} h · ${lootCount} Beute · Risiko ${getExpeditionRiskLabel()}</small>
        </div>
        <div class="expeditionDecisionButtons">
          <button class="expeditionDecision continue" type="button" onclick="continueExpedition()">
            <strong>Weiter</strong><small>mehr Risiko</small>
          </button>
          <button class="expeditionDecision return" type="button" onclick="returnToCamp()">
            <strong>Zum Lager</strong><small>Beute sichern</small>
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (state.expedition && !canGather && !canExplore && !canTrack) {
    const lootCount = getExpeditionLootCount();
    actionDiv.className = "actionCards";
    actionDiv.innerHTML = `
      <div class="expeditionPanel">
        <div class="expeditionPanelHead">
          <span><img src="images/icons/compass.png" alt=""> Expedition erschöpft</span>
          <small>${state.expedition.hours} h · ${lootCount} Beute · Risiko ${getExpeditionRiskLabel()}</small>
        </div>
        <div class="expeditionDecisionButtons">
          <button class="expeditionDecision return" type="button" onclick="returnToCamp()">
            <strong>Zum Lager</strong><small>Keine Energie für weitere Aktionen</small>
          </button>
        </div>
      </div>
    `;
    return;
  }

  label.textContent = location.name;
  const actionHint = document.querySelector(".actionHint");
  if (actionHint) actionHint.textContent = `${location.identity} · ${getDangerLabel(location)} · ${getDailyGoalHint()}`;
  actionDiv.className = "actionCards";
  actionDiv.innerHTML = `
    <button class="actionCard" onclick="${gatherActionHandler}"${canGather ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="${gatherIcon}" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">${gatherActionName}</span>
        <span class="actionCardDesc">${gatherActionDesc}</span>
      </span>
      <span class="actionCardCost">${canGather ? `−${gatherEnergyCost} Energie<br>−2 Hunger` : "Nicht genug Energie"}</span>
    </button>

    <button class="actionCard primary" onclick="explore(getSelectedLocation())"${canExplore ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="${exploreIcon}" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">${exploreActionName}</span>
        <span class="actionCardDesc">${exploreActionDesc}</span>
      </span>
      <span class="actionCardCost">${canExplore ? `−${exploreEnergyCost} Energie<br>−${exploreHungerCost} Hunger` : "Nicht genug Energie"}</span>
    </button>

    <button class="actionCard" onclick="trackLocation()"${canTrack ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="images/icons/flee.png" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">Spuren lesen</span>
        <span class="actionCardDesc">Deine Wahrnehmung hilft dir, Gefahren früh zu erkennen.</span>
      </span>
      <span class="actionCardCost">${canTrack ? `−${trackEnergyCost} Energie<br>−${trackHungerCost} Hunger` : "Nicht genug Energie"}</span>
    </button>
  `;
  if (state.bossesUnlocked?.[location.id] && !state.bossesDefeated?.[location.id]) {
    actionDiv.innerHTML += `<button class="actionCard primary" onclick="challengeRegionBoss()"><span class="actionCardIcon"><img src="images/icons/star.png" alt=""></span><span class="actionCardText"><span class="actionCardName">${location.bossName} herausfordern</span><span class="actionCardDesc">Der Gebietswächter wartet. Besiege ihn für einzigartige Beute.</span></span><span class="actionCardCost">FREIWILLIG</span></button>`;
  }
}

function challengeRegionBoss() {
  const location = getSelectedLocation();
  if (combat || !state.bossesUnlocked?.[location.id] || state.bossesDefeated?.[location.id]) return;
  const boss = ENEMY_DB[location.bossId];
  if (!boss) return;
  startCombat(boss, location.name, `${location.name}: Der Gebietswächter stellt sich dir in den Weg.`);
}

function fishAtRiver() {
  const location = getSelectedLocation();
  if (location.id !== "fluss") {
    gatherResources();
    return;
  }
  if (state.expedition?.awaitingDecision) {
    log("Entscheide zuerst, ob du weitergehst oder zurückkehrst.");
    return;
  }
  const escalation = getExpeditionEscalation();
  const energyCost = 5 + escalation;
  if (state.energy < energyCost) {
    log("Zu wenig Energie zum Fischen.");
    return;
  }
  if (!beginExpedition(location)) return;
  state.energy = Math.max(0, state.energy - energyCost);
  state.hunger = Math.max(0, state.hunger - 2);
  advanceTime(1);
  recordExpeditionAction(location, 1);

  const fishChance = Math.min(0.82, 0.55 + state.attributes.ueberleben * 0.04 + state.attributes.wahrnehmung * 0.03);
  let resultMessage;
  if (Math.random() < fishChance) {
    addExpeditionLoot("Fisch");
    resultMessage = "Flussufer: Du hast einen Fisch gefangen.";
  } else {
    addExpeditionLoot("Wasser");
    resultMessage = "Flussufer: Du hast klares Wasser geschöpft.";
  }
  const goalMessage = progressDailyGoal("gather");
  const milestone = recordLocationProgress(location);
  log(`${resultMessage} ${milestone} ${goalMessage}`.trim());
  checkLevelUp();
  checkDeathConditions();
  saveGame();
  render();
  maybeTriggerWorldEvent(location);
}

function gatherResources() {
  const location = getSelectedLocation();
  if (state.expedition?.awaitingDecision) { log("Entscheide zuerst, ob du weitergehst oder zurückkehrst."); return; }
  const escalation = getExpeditionEscalation();
  const energyCost = 5 + escalation + getMountainColdPenalty(location);
  if (state.energy < energyCost) { log("Zu wenig Energie zum Sammeln."); return; }
  if (!beginExpedition(location)) return;
  state.energy = Math.max(0, state.energy - energyCost);
  state.hunger = Math.max(0, state.hunger - 2);
  advanceTime(1);
  recordExpeditionAction(location, 1);
  let resultMessage;
  if (location.id === "sumpf") {
    addExpeditionLoot(location.gatherItem);
    resultMessage = `${location.name}: ${location.gatherText}.`;
  } else if (Math.random() < (location.gatherChance || 0.58)) {
    addExpeditionLoot(location.gatherItem || "Holz");
    resultMessage = `${location.name}: ${location.gatherText}.`;
    if (location.gatherItem === "Holz" && getToolBonus() > 0) {
      addExpeditionLoot("Holz");
      resultMessage += " Deine Handaxt bringt zusätzliches Holz.";
    }
  } else {
    addExpeditionLoot(location.altGatherItem || "Beeren");
    resultMessage = `${location.name}: ${location.altGatherText || "Du hast essbare Beeren gefunden"}.`;
  }
  const goalMessage = progressDailyGoal("gather");
  log(`${resultMessage}${getMountainColdNote(location)} ${recordLocationProgress(location)} ${goalMessage}`.trim());
  checkLevelUp();
  checkDeathConditions();
  saveGame();
  render();
  maybeTriggerWorldEvent(location);
}

function trackLocation() {
  const location = getSelectedLocation();
  if (state.expedition?.awaitingDecision) { log("Entscheide zuerst, ob du weitergehst oder zurückkehrst."); return; }
  const escalation = getExpeditionEscalation();
  const energyCost = 4 + escalation + getMountainColdPenalty(location);
  if (state.energy < energyCost) { log("Zu wenig Energie, um Spuren zu lesen."); return; }
  if (!beginExpedition(location)) return;
  state.energy = Math.max(0, state.energy - energyCost);
  state.hunger = Math.max(0, state.hunger - (1 + Math.floor(escalation / 2)));
  advanceTime(1);
  recordExpeditionAction(location, 1);
  const goalMessage = progressDailyGoal("track");
  const perceptionChance = Math.min(0.9, 0.45 + state.attributes.wahrnehmung * 0.06);
  const trackReward = location.trackReward || null;
  if (Math.random() < perceptionChance) {
    const milestone = recordLocationProgress(location);
    if (trackReward && Math.random() < trackReward.chance) {
      const xpGained = grantExpeditionXp(trackReward.xp || 4);
      addExpeditionLoot(trackReward.item);
      log(`${location.name}: ${trackReward.message}. +${xpGained} XP erhalten. ${milestone} ${goalMessage}`.trim());
    } else {
      const xpGained = grantExpeditionXp(8);
      log(`${location.name}: Du hast Spuren entdeckt und +${xpGained} XP erhalten. ${milestone} ${goalMessage}`.trim());
    }
    checkLevelUp();
    saveGame();
    render();
    maybeTriggerWorldEvent(location);
    maybeShowPerkSelection();
    return;
  }
  const enemyId = location.enemyPool[Math.floor(Math.random() * location.enemyPool.length)];
  log(`${location.name}: Die Spuren führen direkt zu einer Gefahr. ${goalMessage}`.trim());
  saveGame();
  startCombat(ENEMY_DB[enemyId], location.name, "Du wurdest überrascht!");
}

function getRuinsLootChance(location) {
  if (location.id !== "ruinen" || !state.expedition) return 0;
  const hours = Number.isFinite(state.expedition.hours) ? state.expedition.hours : 0;
  const risk = Number.isFinite(state.expedition.risk) ? state.expedition.risk : 0;
  return Math.min(0.62, 0.18 + hours * 0.035 + risk / 250);
}

function explore(loc) {
  if (state.expedition?.awaitingDecision) { log("Entscheide zuerst, ob du weitergehst oder zurückkehrst."); return; }
  const escalation = getExpeditionEscalation();
  const coldPenalty = getMountainColdPenalty(loc);
  if (state.energy < 10 + escalation + coldPenalty) { log("Zu wenig Energie zum Erkunden! Geh ins Lager."); return; }
  if (!beginExpedition(loc)) return;

  const ueb = state.attributes.ueberleben;
  let energyCost = Math.max(4, 10 - ueb) + escalation + coldPenalty;
  let hungerCost = Math.max(2, 5 - Math.floor(ueb / 2));
  if (state.weather === "Sturm") energyCost += 5;
  if (state.weather === "Regen") hungerCost += 3;
  state.energy = Math.max(0, state.energy - energyCost);
  state.hunger = Math.max(0, state.hunger - hungerCost);
  const expeditionHours = 2 + Math.floor(Math.random() * 3);
  advanceTime(expeditionHours);
  recordExpeditionAction(loc, expeditionHours);
  const goalMessage = progressDailyGoal("explore");

  let dangerThreshold = 0.65;
  if (isNight()) dangerThreshold -= 0.15;
  if (state.expedition) {
    dangerThreshold = Math.min(0.78, dangerThreshold + state.expedition.risk / 100 * 0.12);
  }
  const rareThreshold = Math.min(
    0.98,
    0.95 + (state.expedition ? state.expedition.risk / 100 * 0.15 : 0)
  );
  const ruinLootChance = getRuinsLootChance(loc);
  const coldNote = getMountainColdNote(loc);

  let roll = Math.random();

  if (roll < 0.25) {
    if (ruinLootChance > 0 && Math.random() < ruinLootChance && loc.rareLoot?.length) {
      const lootId = loc.rareLoot[Math.floor(Math.random() * loc.rareLoot.length)];
      addExpeditionLoot(lootId, "equipment");
      log(`${loc.name}: Nach tiefer Suche findest du ${ITEM_DB[lootId]?.name || lootId}. ${goalMessage}`.trim());
    } else {
      addExpeditionLoot(loc.exploreItem || "Holz");
      log(`${loc.name}: ${loc.exploreFindText || "Du hast Holz gefunden"}. ${goalMessage}`.trim());
    }
  } else if (roll < 0.45) {
    addExpeditionLoot(loc.altGatherItem || "Beeren");
    log(`${loc.name}: ${loc.altGatherText || "Du hast Beeren gefunden"}. ${goalMessage}`.trim());
  } else if (roll < dangerThreshold) {
    let avoidChance = state.attributes.wahrnehmung * 0.03;
    if (state.weather === "Nebel") avoidChance += 0.1;
    if (Math.random() < avoidChance) {
      addExpeditionLoot(loc.exploreItem || "Holz");
      log(`${loc.name}: Deine Wahrnehmung hat dich vor einer Gefahr gewarnt – du hast stattdessen einen sicheren Fund gemacht. ${goalMessage}`.trim());
    } else {
      const enemyId = loc.enemyPool[Math.floor(Math.random() * loc.enemyPool.length)];
      const nightNote = isNight() ? " In der Dunkelheit wirkt der Gegner gefährlicher." : "";
      startCombat(ENEMY_DB[enemyId], loc.name, `${goalMessage}${nightNote}${coldNote}`.trim());
      return;
    }
  } else if (roll < 0.85) {
    state.health -= 5;
    log(`${loc.name}: Du hast dich leicht verletzt. ${goalMessage}`.trim());
  } else if (roll < rareThreshold) {
    const xpGained = grantExpeditionXp(10);
    log(`${loc.name}: Nichts Besonderes, aber du hast Erfahrung gesammelt. +${xpGained} XP. ${goalMessage}`.trim());
    checkLevelUp();
  } else {
    const xpGained = grantExpeditionXp(25);
    log(`${loc.name}: Seltenes Ereignis! Du fühlst dich gestärkt. +${xpGained} XP. ${goalMessage}`.trim());
    checkLevelUp();
  }

  const milestone = recordLocationProgress(loc);
  appendLatestLog(`${milestone}${coldNote}`.trim());
  checkLevelUp();
  checkDeathConditions();
  saveGame();
  render();
  if (!state.pendingLevelUps) maybeTriggerWorldEvent(loc);
  maybeShowPerkSelection();
}
