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
  selectedLocationId = loc.id;
  log(`${loc.name} ausgewählt. Welche Aktion möchtest du ausführen?`);
  render();
}

function renderActionCards() {
  const location = getSelectedLocation();
  const label = document.getElementById("selectedLocationLabel");
  const actionDiv = document.getElementById("actionCards");
  if (!label || !actionDiv) return;

  const canGather = state.energy >= 5;
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
  if (state.energy < 5) { log("Zu wenig Energie zum Sammeln."); return; }
  state.energy = Math.max(0, state.energy - 5);
  state.hunger = Math.max(0, state.hunger - 2);
  advanceTime(1);
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
  if (state.energy < 4) { log("Zu wenig Energie, um Spuren zu lesen."); return; }
  state.energy = Math.max(0, state.energy - 4);
  state.hunger = Math.max(0, state.hunger - 1);
  advanceTime(1);
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
