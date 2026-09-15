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

function beginExpedition(location) {
  if (state.expedition) {
    return state.expedition.locationId === location.id;
  }
  state.expedition = {
    locationId: location.id,
    hours: 0,
    lootStart: state.inventory.length,
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
  switchTab("screenCamp");
}

function returnToCamp() {
  if (!state.expedition) return;
  const expedition = state.expedition;
  const lootCount = Math.max(0, state.inventory.length - expedition.lootStart);
  const damage = Math.max(expedition.damage, expedition.startingHealth - state.health);
  const hours = expedition.hours;
  state.expedition = null;
  log(`Du kehrst ins Lager zurück. Beute: ${lootCount} · Zeit draußen: ${hours} h · Schaden: ${damage}.`);
  saveGame();
  render();
}

function renderActionCards() {
  const location = getSelectedLocation();
  const label = document.getElementById("selectedLocationLabel");
  const actionDiv = document.getElementById("actionCards");
  if (!label || !actionDiv) return;

  const escalation = getExpeditionEscalation();
  const canGather = state.energy >= 5 + escalation;
  const canExplore = state.energy >= 10 + escalation;
  const canTrack = state.energy >= 4 + escalation;

  if (state.expedition?.awaitingDecision) {
    const lootCount = Math.max(0, state.inventory.length - state.expedition.lootStart);
    actionDiv.className = "actionCards";
    actionDiv.innerHTML = `
      <div class="charBox expeditionPanel">
        <h2 class="sectionTitle"><img src="images/icons/compass.png" alt=""> Expedition läuft</h2>
        <div class="deckHint">Du hast bereits ${state.expedition.hours} Stunden durchgehalten. Entscheide, ob du das Risiko erhöhst.</div>
        <div class="runStats">
          <div class="runStat"><span>Beute</span><strong>${lootCount}</strong><small>Gegenstände</small></div>
          <div class="runStat"><span>Schaden</span><strong>${state.expedition.damage}</strong><small>erlitten</small></div>
          <div class="runStat"><span>Begegnungen</span><strong>${state.expedition.encounters}</strong><small>gehabt</small></div>
          <div class="runStat"><span>Risiko</span><strong>${getExpeditionRiskLabel()}</strong><small>aktuell</small></div>
        </div>
        <button class="campActionBtn" type="button" onclick="continueExpedition()"><span class="cIcon2">➜</span><span class="btnText"><strong>Weiter erkunden</strong><span class="btnSub">Mehr Beute, XP und Gefahr</span></span></button>
        <button class="campActionBtn" type="button" onclick="returnToCamp()"><span class="cIcon2">⌂</span><span class="btnText"><strong>Zurück zum Lager</strong><span class="btnSub">Beute sichern und Expedition beenden</span></span></button>
      </div>
    `;
    return;
  }

  const canExplore = state.energy >= 10;
  const canTrack = state.energy >= 4;

  label.textContent = location.name;
  const actionHint = document.querySelector(".actionHint");
  if (actionHint) actionHint.textContent = `${location.identity} · ${getDangerLabel(location)} · ${getDailyGoalHint()}`;
  actionDiv.className = "actionCards";
  actionDiv.innerHTML = `
    <button class="actionCard" onclick="gatherResources()"${canGather ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="images/icons/forest.png" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">Sorgfältig sammeln</span>
        <span class="actionCardDesc">${location.gatherDesc}</span>
      </span>
      <span class="actionCardCost">${canGather ? "−5 Energie<br>−2 Hunger" : "Nicht genug Energie"}</span>
    </button>

    <button class="actionCard primary" onclick="explore(getSelectedLocation())"${canExplore ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="images/icons/compass.png" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">Gebiet erkunden</span>
        <span class="actionCardDesc">${location.exploreDesc}</span>
      </span>
      <span class="actionCardCost">${canExplore ? "−4–15 Energie" : "Nicht genug Energie"}</span>
    </button>

    <button class="actionCard" onclick="trackLocation()"${canTrack ? "" : " disabled"}>
      <span class="actionCardIcon"><img src="images/icons/flee.png" alt=""></span>
      <span class="actionCardText">
        <span class="actionCardName">Spuren lesen</span>
        <span class="actionCardDesc">Deine Wahrnehmung hilft dir, Gefahren früh zu erkennen.</span>
      </span>
      <span class="actionCardCost">${canTrack ? "−4 Energie<br>−1 Hunger" : "Nicht genug Energie"}</span>
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

function gatherResources() {
  const location = getSelectedLocation();
  if (state.expedition?.awaitingDecision) { log("Entscheide zuerst, ob du weitergehst oder zurückkehrst."); return; }
  const escalation = getExpeditionEscalation();
  if (state.energy < 5 + escalation) { log("Zu wenig Energie zum Sammeln."); return; }
  if (!beginExpedition(location)) return;
  state.energy = Math.max(0, state.energy - (5 + escalation));
  state.hunger = Math.max(0, state.hunger - 2);
  advanceTime(1);
  recordExpeditionAction(location, 1);
  let resultMessage;
  if (location.id === "sumpf") {
    state.inventory.push(location.gatherItem);
    resultMessage = `${location.name}: ${location.gatherText}.`;
  } else if (Math.random() < (location.gatherChance || 0.58)) {
    state.inventory.push(location.gatherItem || "Holz");
    resultMessage = `${location.name}: ${location.gatherText}.`;
    if (location.gatherItem === "Holz" && getToolBonus() > 0) {
      state.inventory.push("Holz");
      resultMessage += " Deine Handaxt bringt zusätzliches Holz.";
    }
  } else {
    state.inventory.push(location.altGatherItem || "Beeren");
    resultMessage = `${location.name}: ${location.altGatherText || "Du hast essbare Beeren gefunden"}.`;
  }
  const goalMessage = progressDailyGoal("gather");
  log(`${resultMessage} ${recordLocationProgress(location)} ${goalMessage}`.trim());
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
  if (state.energy < 4 + escalation) { log("Zu wenig Energie, um Spuren zu lesen."); return; }
  if (!beginExpedition(location)) return;
  state.energy = Math.max(0, state.energy - (4 + escalation));
  state.hunger = Math.max(0, state.hunger - (1 + Math.floor(escalation / 2)));
  advanceTime(1);
  recordExpeditionAction(location, 1);
  const goalMessage = progressDailyGoal("track");
  const perceptionChance = Math.min(0.9, 0.45 + state.attributes.wahrnehmung * 0.06);
  if (Math.random() < perceptionChance) {
    state.xp += 8;
    const milestone = recordLocationProgress(location);
    log(`${location.name}: Du hast Spuren entdeckt und +8 XP erhalten. ${milestone} ${goalMessage}`.trim());
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

function explore(loc) {
  if (state.expedition?.awaitingDecision) { log("Entscheide zuerst, ob du weitergehst oder zurückkehrst."); return; }
  const escalation = getExpeditionEscalation();
  if (state.energy < 10 + escalation) { log("Zu wenig Energie zum Erkunden! Geh ins Lager."); return; }
  if (!beginExpedition(loc)) return;

  const ueb = state.attributes.ueberleben;
  let energyCost = Math.max(4, 10 - ueb) + escalation;
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

  let roll = Math.random();

  if (roll < 0.25) {
    state.inventory.push(loc.exploreItem || "Holz");
    log(`${loc.name}: ${loc.exploreFindText || "Du hast Holz gefunden"}. ${goalMessage}`.trim());
  } else if (roll < 0.45) {
    state.inventory.push(loc.altGatherItem || "Beeren");
    log(`${loc.name}: ${loc.altGatherText || "Du hast Beeren gefunden"}. ${goalMessage}`.trim());
  } else if (roll < dangerThreshold) {
    let avoidChance = state.attributes.wahrnehmung * 0.03;
    if (state.weather === "Nebel") avoidChance += 0.1;
    if (Math.random() < avoidChance) {
      state.inventory.push(loc.exploreItem || "Holz");
      log(`${loc.name}: Deine Wahrnehmung hat dich vor einer Gefahr gewarnt – du hast stattdessen einen sicheren Fund gemacht. ${goalMessage}`.trim());
    } else {
      const enemyId = loc.enemyPool[Math.floor(Math.random() * loc.enemyPool.length)];
      const nightNote = isNight() ? " In der Dunkelheit wirkt der Gegner gefährlicher." : "";
      startCombat(ENEMY_DB[enemyId], loc.name, `${goalMessage}${nightNote}`.trim());
      return;
    }
  } else if (roll < 0.85) {
    state.health -= 5;
    log(`${loc.name}: Du hast dich leicht verletzt. ${goalMessage}`.trim());
  } else if (roll < 0.95) {
    state.xp += 10;
    log(`${loc.name}: Nichts Besonderes, aber du hast Erfahrung gesammelt. ${goalMessage}`.trim());
    checkLevelUp();
  } else {
    state.xp += 25;
    log(`${loc.name}: Seltenes Ereignis! Du fühlst dich gestärkt. ${goalMessage}`.trim());
    checkLevelUp();
  }

  const milestone = recordLocationProgress(loc);
  appendLatestLog(milestone);
  checkLevelUp();
  checkDeathConditions();
  saveGame();
  render();
  if (!state.pendingLevelUps) maybeTriggerWorldEvent(loc);
  maybeShowPerkSelection();
}
