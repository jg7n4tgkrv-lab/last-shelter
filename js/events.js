/* Last Shelter – World event system */

function canChooseWorldEvent(choice) {
  const requirement = choice?.requirement;
  if (!requirement) return true;
  const value = state.attributes?.[requirement.attr] || 0;
  return value >= requirement.min;
}

function maybeTriggerWorldEvent(location) {
  location = location || getSelectedLocation();
  if (state.pendingEvent || state.pendingLevelUps > 0) return;
  const expeditionRiskBonus = state.expedition
    ? Math.min(0.18, state.expedition.risk / 100 * 0.18)
    : 0;
  const eventChance = Math.min(0.56, 0.16 + (location.danger * 0.18) + expeditionRiskBonus);
  if (Math.random() > eventChance) return;
  const eventIds = Object.keys(EVENT_DB).filter(id => !EVENT_DB[id].locationIds || EVENT_DB[id].locationIds.includes(location.id));
  const eventId = eventIds[Math.floor(Math.random() * eventIds.length)];
  state.pendingEvent = { id: eventId, locationId: location.id };
  saveGame();
  showWorldEvent();
}

function showWorldEvent() {
  if (!state.pendingEvent || !EVENT_DB[state.pendingEvent.id]) return;
  const eventId = state.pendingEvent.id;
  const event = EVENT_DB[eventId];
  document.getElementById("eventPromptTitle").textContent = event.title;
  document.getElementById("eventPromptText").textContent = event.text;
  const choiceList = document.getElementById("eventChoiceList");
  choiceList.innerHTML = "";
  event.choices.forEach(choice => {
    const button = document.createElement("button");
    button.type = "button";
    const available = canChooseWorldEvent(choice);
    button.className = "eventChoice" + (available ? "" : " unavailable");
    button.disabled = !available;
    button.innerHTML = `
      <img class="eventChoiceIcon" src="${choice.icon}" alt="">
      <span class="eventChoiceBody">
        <span class="eventChoiceName">${choice.name}</span>
        <span class="eventChoiceDesc">${choice.desc}</span>
      </span>
    `;
    const choose = () => chooseWorldEvent(eventId, choice.id);
    button.onclick = choose;
    choiceList.appendChild(button);
  });
  document.getElementById("eventOverlay").classList.add("active");
}

function chooseWorldEvent(eventId, choiceId) {
  if (!state.pendingEvent || state.pendingEvent.id !== eventId) return;
  const event = EVENT_DB[eventId];
  const choice = event?.choices.find(item => item.id === choiceId);
  if (!choice || !canChooseWorldEvent(choice)) return;
  state.pendingEvent = null;
  document.getElementById("eventOverlay").classList.remove("active");

  if (eventId === "tracks" && choiceId === "follow") {
    state.energy = Math.max(0, state.energy - 6);
    state.xp += 15;
    addExpeditionLoot("Holz");
    changeCampStatus(4, -3);
    log("Du bist den Spuren gefolgt und hast Holz gefunden. +15 XP.");
  } else if (eventId === "tracks" && choiceId === "avoid") {
    changeCampStatus(-1, 2);
    log("Du hast Abstand gehalten und bist sicher zurückgekehrt.");
  } else if (eventId === "cache" && choiceId === "take") {
    addExpeditionLoot("Holz");
    addExpeditionLoot("verband", "consumables");
    changeCampStatus(3, 0);
    log("In der Tasche lagen Holz und ein brauchbarer Verband.");
  } else if (eventId === "cache" && choiceId === "leave") {
    state.xp += 5;
    changeCampStatus(0, 1);
    log("Du hast die Tasche liegen gelassen und dir den Fundort gemerkt. +5 XP.");
  } else if (eventId === "rain" && choiceId === "shelter") {
    state.energy = Math.min(getMaxEnergy(), state.energy + 4);
    changeCampStatus(0, 3);
    log("Du hast rechtzeitig Schutz gefunden und etwas Energie zurückgewonnen.");
  } else if (eventId === "rain" && choiceId === "continue") {
    state.energy = Math.max(0, state.energy - 3);
    state.hunger = Math.max(0, state.hunger - 2);
    state.xp += 8;
    changeCampStatus(-2, -2);
    log("Du bist trotz des Regens weitergegangen. +8 XP.");
  } else if (eventId === "ruin_door" && choiceId === "break") {
    state.energy = Math.max(0, state.energy - 3);
    state.xp += 20;
    addExpeditionLoot("Metall");
    changeCampStatus(2, -1);
    log("Du hast die Metalltür aufgebrochen. +1 Metall und +20 XP.");
  } else if (eventId === "ruin_door" && choiceId === "bypass") {
    state.xp += 12;
    addExpeditionLoot("Metall");
    changeCampStatus(1, 0);
    log("Du hast die Schwachstelle gefunden. +1 Metall und +12 XP.");
  } else if (eventId === "ruin_door" && choiceId === "leave") {
    state.xp += 5;
    changeCampStatus(0, 1);
    log("Du hast dir den Ort gemerkt und kehrst später zurück. +5 XP.");
  }

  checkLevelUp();
  checkDeathConditions();
  saveGame();
  render();
  maybeShowPerkSelection();
}

