/* Last Shelter – World event system */

function hasEventFlag(flag) {
  return Boolean(flag && state.eventFlags && state.eventFlags[flag]);
}

function hasAllEventFlags(flags) {
  return !Array.isArray(flags) || flags.every(hasEventFlag);
}

function hasAnyEventFlag(flags) {
  return Array.isArray(flags) && flags.some(hasEventFlag);
}

function applyEventChoiceFlags(choice) {
  if (!state.eventFlags || typeof state.eventFlags !== "object") state.eventFlags = {};
  (Array.isArray(choice?.setFlags) ? choice.setFlags : []).forEach(flag => {
    if (typeof flag === "string" && flag) state.eventFlags[flag] = true;
  });
  (Array.isArray(choice?.clearFlags) ? choice.clearFlags : []).forEach(flag => {
    if (typeof flag === "string" && flag) delete state.eventFlags[flag];
  });
}

function recordWorldEvent(eventId) {
  if (!eventId) return;
  if (!Array.isArray(state.eventHistory)) state.eventHistory = [];
  state.eventHistory.push(eventId);
  state.eventHistory = state.eventHistory.slice(-32);
}

function canChooseWorldEvent(choice) {
  if (!hasAllEventFlags(choice?.requiresFlags)) return false;
  if (hasAnyEventFlag(choice?.forbiddenFlags)) return false;
  const requirement = choice?.requirement;
  if (!requirement) return true;
  if (requirement.type === "consumable") {
    const amount = requirement.amount || 1;
    return (state.consumables || []).filter(item => item === requirement.item).length >= amount;
  }
  const value = state.attributes?.[requirement.attr] || 0;
  return value >= requirement.min;
}

function getWorldEventChance(location) {
  const expeditionRiskBonus = state.expedition
    ? Math.min(0.18, state.expedition.risk / 100 * 0.18)
    : 0;
  const moraleModifier = state.morale <= 25 ? 0.08 : state.morale >= 70 ? -0.04 : 0;
  const safetyModifier = state.safety <= 25 ? 0.10 : state.safety >= 70 ? -0.06 : 0;
  const timeProfile = getTimeOfDayExplorationProfile();
  const weatherModifier = getWeatherExplorationProfile().eventChanceBonus;
  return Math.max(
    0.08,
    Math.min(0.64, 0.16 + (location.danger * 0.18) + expeditionRiskBonus + moraleModifier + safetyModifier + timeProfile.eventChanceBonus + weatherModifier)
  );
}

function getWorldEventWeight(event) {
  let weight = 1;
  if (event?.tone === "positive" && (state.morale >= 70 || state.safety >= 70)) weight *= 1.35;
  if (event?.tone === "risky" && (state.morale <= 25 || state.safety <= 25)) weight *= 1.35;
  if (event?.weatherIds?.includes(state.weather)) {
    weight *= state.weather === "Sturm" ? 1.65 : 1.25;
  }
  return weight;
}

function pickWorldEventId(eventIds) {
  const weightedEvents = eventIds.map(id => ({
    id,
    weight: getWorldEventWeight(EVENT_DB[id])
  }));
  const totalWeight = weightedEvents.reduce((total, entry) => total + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weightedEvents) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return weightedEvents[weightedEvents.length - 1]?.id || null;
}

function isWorldEventAvailable(event, location) {
  if (!event) return false;
  if (event.locationIds && (!location || !event.locationIds.includes(location.id))) return false;
  if (event.weatherIds && !event.weatherIds.includes(state.weather)) return false;
  if (event.timeOfDayIds && !event.timeOfDayIds.includes(getTimeOfDay())) return false;
  if (Number.isFinite(event.minLevel) && state.level < event.minLevel) return false;
  if (!hasAllEventFlags(event.requiresFlags)) return false;
  if (hasAnyEventFlag(event.forbiddenFlags)) return false;
  if (Array.isArray(event.requiresEventHistory) && !event.requiresEventHistory.every(eventId => state.eventHistory.includes(eventId))) return false;
  if (Array.isArray(event.forbiddenEventHistory) && event.forbiddenEventHistory.some(eventId => state.eventHistory.includes(eventId))) return false;
  if (event.requiresBossDefeated && !state.bossesDefeated?.[event.requiresBossDefeated]) return false;
  if (event.requiresBossUnlocked && !state.bossesUnlocked?.[event.requiresBossUnlocked]) return false;
  if (event.requiresLocationProgress) {
    const progressRule = event.requiresLocationProgress;
    const progress = Number.isFinite(state.locationProgress?.[progressRule.locationId])
      ? state.locationProgress[progressRule.locationId]
      : 0;
    if (Number.isFinite(progressRule.min) && progress < progressRule.min) return false;
    if (Number.isFinite(progressRule.max) && progress > progressRule.max) return false;
  }
  if (event.requiredShelterModule && !hasShelterModule(event.requiredShelterModule)) return false;
  if (event.requiredEquipment) {
    const carried = (state.equipmentInventory || []).includes(event.requiredEquipment);
    const equipped = Object.values(state.equipped || {}).includes(event.requiredEquipment);
    if (!carried && !equipped) return false;
  }
  if (event.requiredAttribute) {
    const value = state.attributes?.[event.requiredAttribute.name] || 0;
    if (value < event.requiredAttribute.min) return false;
  }
  return true;
}

function isWorldEventOnCooldown(eventId, event) {
  const history = Array.isArray(state.eventHistory) ? state.eventHistory : [];
  if (event?.once && history.includes(eventId)) return true;
  const cooldown = Number.isFinite(event?.cooldown) ? Math.max(0, Math.floor(event.cooldown)) : 3;
  return cooldown > 0 && history.slice(-cooldown).includes(eventId);
}

function getAvailableWorldEventIds(location) {
  const candidates = Object.keys(EVENT_DB).filter(id => isWorldEventAvailable(EVENT_DB[id], location));
  const fresh = candidates.filter(id => !isWorldEventOnCooldown(id, EVENT_DB[id]));
  if (fresh.length > 0) return fresh;
  return candidates.filter(id => !(EVENT_DB[id]?.once && state.eventHistory.includes(id)));
}

function maybeTriggerWorldEvent(location) {
  location = location || getSelectedLocation();
  if (state.pendingEvent || state.pendingLevelUps > 0) return;
  const eventChance = getWorldEventChance(location);
  if (Math.random() > eventChance) return;
  const eventIds = getAvailableWorldEventIds(location);
  if (eventIds.length === 0) return;
  const eventId = pickWorldEventId(eventIds);
  if (!eventId) return;
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
  const eventOverlay = document.getElementById("eventOverlay");
  eventOverlay.classList.add("active");
  eventOverlay.setAttribute("aria-hidden", "false");
}

function chooseWorldEvent(eventId, choiceId) {
  if (!state.pendingEvent || state.pendingEvent.id !== eventId) return;
  const event = EVENT_DB[eventId];
  const choice = event?.choices.find(item => item.id === choiceId);
  if (!choice || !canChooseWorldEvent(choice)) return;
  recordWorldEvent(eventId);
  applyEventChoiceFlags(choice);
  state.pendingEvent = null;
  const eventOverlay = document.getElementById("eventOverlay");
  eventOverlay.classList.remove("active");
  eventOverlay.setAttribute("aria-hidden", "true");

  if (eventId === "relay_echo" && choiceId === "follow") {
    state.energy = Math.max(0, state.energy - 3);
    state.xp += 12;
    changeCampStatus(2, 1);
    log("Du bist dem Relais-Signal gefolgt. −3 Energie, +2 Sicherheit und +12 XP.");
  } else if (eventId === "relay_echo" && choiceId === "secure") {
    state.xp += 6;
    changeCampStatus(0, 3);
    log("Du hast die Frequenz des Relais gesichert. +3 Sicherheit und +6 XP.");
  } else if (eventId === "watchpost_echo" && choiceId === "search") {
    const stored = addExpeditionLoot("Leder");
    state.xp += 10;
    changeCampStatus(2, 0);
    log(stored
      ? "Du hast am Wachposten frisches Leder gefunden. +10 XP."
      : "Du hast am Wachposten gesucht, aber dein Lager ist voll. +10 XP.");
  } else if (eventId === "watchpost_echo" && choiceId === "wait") {
    state.xp += 5;
    changeCampStatus(1, 1);
    log("Du hast das Zeichen ergänzt. +1 Moral, +1 Sicherheit und +5 XP.");
  } else if (eventId === "river_fishing_spot" && choiceId === "cast") {
    const firstStored = addExpeditionLoot("Fisch");
    const secondStored = addExpeditionLoot("Fisch");
    state.xp += 10;
    changeCampStatus(3, 0);
    log(firstStored && secondStored
      ? "Du hast zwei Fische aus dem alten Netz geholt. +10 XP."
      : "Du hast die Angelstelle genutzt, aber dein Lager ist voll. +10 XP.");
  } else if (eventId === "river_fishing_spot" && choiceId === "supplies") {
    const waterStored = addExpeditionLoot("Wasser");
    const herbsStored = addExpeditionLoot("Heilkräuter");
    state.xp += 8;
    changeCampStatus(2, 1);
    log(waterStored && herbsStored
      ? "Du hast Wasser und Heilkräuter in den alten Vorräten gefunden. +8 XP."
      : "Du hast die Vorräte durchsucht, aber dein Lager ist voll. +8 XP.");
  } else if (eventId === "river_flood" && choiceId === "highground") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du hast rechtzeitig das höhere Ufer erreicht. +5 XP.");
  } else if (eventId === "river_flood" && choiceId === "crate") {
    state.energy = Math.max(0, state.energy - 4);
    const stored = addExpeditionLoot("Metall");
    state.xp += 10;
    changeCampStatus(0, -3);
    log(stored
      ? "Du hast die Kiste geborgen und Metall gesichert. −4 Energie, +10 XP."
      : "Du hast die Kiste geborgen, aber dein Lager ist voll. −4 Energie, +10 XP.");
  } else if (eventId === "ruin_archive" && choiceId === "read") {
    const stored = addExpeditionLoot("old_compass", "equipment");
    state.xp += 15;
    changeCampStatus(3, 1);
    log(stored
      ? "Im Archiv lag ein Alter Kompass. +15 XP."
      : "Du hast das Archiv durchsucht, aber dein Lager ist voll. +15 XP.");
  } else if (eventId === "ruin_archive" && choiceId === "salvage") {
    const stored = addExpeditionLoot("Metall");
    state.xp += 8;
    changeCampStatus(1, 1);
    log(stored
      ? "Du hast brauchbares Metall aus dem Archiv geborgen. +8 XP."
      : "Das Metall bleibt zurück, weil dein Lager voll ist. +8 XP.");
  } else if (eventId === "ruin_collapse" && choiceId === "support") {
    state.energy = Math.max(0, state.energy - 4);
    const stored = addExpeditionLoot("Metall");
    state.xp += 10;
    changeCampStatus(0, -3);
    log(stored
      ? "Du hast den Träger abgestützt und Metall geborgen. −4 Energie, +10 XP."
      : "Du hast den Träger abgestützt, aber dein Lager ist voll. −4 Energie, +10 XP.");
  } else if (eventId === "ruin_collapse" && choiceId === "retreat") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du bist rechtzeitig aus dem einsturzgefährdeten Raum zurückgewichen. +5 XP.");
  } else if (eventId === "forest_watchpost" && choiceId === "search") {
    const stored = addExpeditionLoot("Leder");
    state.xp += 12;
    changeCampStatus(3, 1);
    log(stored
      ? "Du hast im alten Wachposten Leder gefunden. +12 XP."
      : "Der Wachposten war nützlich, aber dein Lager ist voll. +12 XP.");
  } else if (eventId === "forest_watchpost" && choiceId === "mark") {
    state.xp += 5;
    changeCampStatus(2, 3);
    log("Du hast den alten Wachposten markiert. Andere Überlebende können die Stelle meiden. +5 XP.");
  } else if (eventId === "wolf_pack" && choiceId === "circle") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du hast das Wolfsrudel weiträumig umgangen. +5 XP.");
  } else if (eventId === "wolf_pack" && choiceId === "observe") {
    state.energy = Math.max(0, state.energy - 3);
    const stored = addExpeditionLoot("Fleisch");
    state.xp += 14;
    changeCampStatus(2, -2);
    log(stored
      ? "Du hast den Leitwolf studiert und Fleisch gefunden. +14 XP."
      : "Du hast den Leitwolf studiert, aber dein Lager ist voll. +14 XP.");
  } else if (eventId === "storm_signal" && choiceId === "salvage") {
    state.energy = Math.max(0, state.energy - 4);
    const stored = addExpeditionLoot("Metall");
    state.xp += 14;
    changeCampStatus(0, -2);
    log(stored
      ? "Du hast das alte Relais geborgen und Metall gesichert. −4 Energie, −2 Sicherheit und +14 XP."
      : "Du hast das Relais geborgen, aber dein Lager ist voll. −4 Energie, −2 Sicherheit und +14 XP.");
  } else if (eventId === "storm_signal" && choiceId === "shelter") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du hast im Sturm rechtzeitig Schutz gefunden. +5 XP.");
  } else if (eventId === "lookout_signal" && choiceId === "follow") {
    state.energy = Math.max(0, state.energy - 2);
    const stored = addExpeditionLoot("Metall");
    state.xp += 12;
    changeCampStatus(2, 0);
    log(stored
      ? "Du bist dem Licht gefolgt und hast Metall gefunden. −2 Energie und +12 XP."
      : "Du bist dem Licht gefolgt, aber dein Lager ist voll. −2 Energie und +12 XP.");
  } else if (eventId === "lookout_signal" && choiceId === "mark") {
    state.xp += 6;
    changeCampStatus(0, 2);
    log("Du hast die Richtung des fernen Lichts markiert. +6 XP.");
  } else if (eventId === "radio_static" && choiceId === "listen") {
    state.energy = Math.max(0, state.energy - 2);
    state.xp += 12;
    changeCampStatus(0, 2);
    log("Du hast das Funksignal belauscht und seine Frequenz notiert. −2 Energie, +12 XP.");
  } else if (eventId === "radio_static" && choiceId === "mark") {
    state.xp += 5;
    changeCampStatus(1, 0);
    log("Du hast dir die Frequenz des Signals gemerkt. +5 XP.");
  } else if (eventId === "stranded_survivor" && choiceId === "follow") {
    const stored = addExpeditionLoot("Leder");
    state.xp += 12;
    changeCampStatus(2, 0);
    log(stored
      ? "Du bist den frischen Spuren gefolgt und hast Leder gefunden. +12 XP."
      : "Du bist den frischen Spuren gefolgt, aber dein Lager ist voll. +12 XP.");
  } else if (eventId === "stranded_survivor" && choiceId === "help") {
    state.energy = Math.max(0, state.energy - 3);
    state.xp += 8;
    changeCampStatus(4, -1);
    log("Du hast am verlassenen Feuer Hilfe zurückgelassen. −3 Energie, +4 Moral und +8 XP.");
  } else if (eventId === "stranded_survivor" && choiceId === "avoid") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du hast Abstand gehalten und den Fundort sicher umgangen. +5 XP.");
  } else if (eventId === "tracks" && choiceId === "follow") {
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
  } else if (eventId === "mountain_shelter" && choiceId === "rest") {
    state.energy = Math.min(getMaxEnergy(), state.energy + 3);
    state.hunger = Math.max(0, state.hunger - 1);
    state.xp += 4;
    changeCampStatus(2, 1);
    log("Du hast in der alten Berghütte kurz verschnauft. −1 Hunger, +3 Energie und +4 XP.");
  } else if (eventId === "mountain_shelter" && choiceId === "search") {
    const stored = addExpeditionLoot("Leder");
    state.xp += 12;
    changeCampStatus(3, 1);
    log(stored
      ? "Du hast in der Berghütte brauchbares Leder gefunden. +12 XP."
      : "Die Berghütte war nützlich, aber dein Lager ist voll. +12 XP.");
  } else if (eventId === "mountain_rockslide" && choiceId === "shelter") {
    state.xp += 5;
    changeCampStatus(0, 2);
    log("Du hast im Sturm rechtzeitig Schutz gefunden. +5 XP.");
  } else if (eventId === "mountain_rockslide" && choiceId === "salvage") {
    state.energy = Math.max(0, state.energy - 5);
    const stored = addExpeditionLoot("Metall");
    state.xp += 12;
    changeCampStatus(0, -3);
    log(stored
      ? "Du hast zwischen dem Geröll Metall geborgen. −5 Energie, +12 XP."
      : "Du hast das Metall geborgen, aber dein Lager ist voll. −5 Energie, +12 XP.");
  } else if (eventId === "swamp_herb_grove" && choiceId === "harvest") {
    const firstStored = addExpeditionLoot("Heilkräuter");
    const secondStored = addExpeditionLoot("Heilkräuter");
    state.xp += 10;
    changeCampStatus(3, 0);
    log(firstStored && secondStored
      ? "Du hast zwei Bündel Heilkräuter im stillen Sumpf gefunden. +10 XP."
      : "Du hast Heilkräuter gefunden, aber dein Lager ist voll. +10 XP.");
  } else if (eventId === "swamp_herb_grove" && choiceId === "mark") {
    state.xp += 5;
    changeCampStatus(1, 2);
    log("Du hast den Kräuterfundort markiert und den Weg gesichert. +5 XP.");
  } else if (eventId === "swamp_miasma" && choiceId === "detour") {
    state.energy = Math.max(0, state.energy - 2);
    const stored = addExpeditionLoot("Heilkräuter");
    state.xp += 9;
    changeCampStatus(2, -1);
    log(stored
      ? "Du hast einen sicheren Umweg durch den Giftnebel gefunden. −2 Energie, +1 Heilkräuter und +9 XP."
      : "Du hast den Giftnebel sicher umgangen, aber dein Lager ist voll. −2 Energie und +9 XP.");
  } else if (eventId === "swamp_miasma" && choiceId === "push") {
    state.energy = Math.max(0, state.energy - 5);
    state.health = Math.max(0, state.health - 6);
    const firstStored = addExpeditionLoot("Heilkräuter");
    const secondStored = addExpeditionLoot("Heilkräuter");
    state.xp += 14;
    changeCampStatus(-2, -3);
    log(firstStored && secondStored
      ? "Du bist durch den Giftnebel gegangen und hast zwei Bündel Heilkräuter geborgen. −5 Energie, −6 Leben und +14 XP."
      : "Du hast den Giftnebel durchquert, aber dein Lager ist voll. −5 Energie, −6 Leben und +14 XP.");
  } else if (eventId === "swamp_miasma" && choiceId === "retreat") {
    changeCampStatus(0, 1);
    log("Du bist vor dem Giftnebel zurückgewichen.");
  } else if (eventId === "sumpf_spores" && choiceId === "antidote") {
    const antidoteIndex = state.consumables.indexOf("gegenmittel");
    if (antidoteIndex !== -1) {
      state.consumables.splice(antidoteIndex, 1);
      addExpeditionLoot("Heilkräuter");
      state.xp += 10;
      changeCampStatus(3, 0);
      log("Du hast das Gegengift eingesetzt. Die Sporen haben dir nichts angetan. +1 Heilkräuter und +10 XP.");
    }
  } else if (eventId === "sumpf_spores" && choiceId === "careful") {
    state.energy = Math.max(0, state.energy - 5);
    state.health = Math.max(0, state.health - 4);
    state.xp += 5;
    changeCampStatus(-1, 0);
    log("Du hast die Sporen vorsichtig durchquert. −4 Leben und +5 XP.");
  } else if (eventId === "sumpf_spores" && choiceId === "retreat") {
    changeCampStatus(0, 1);
    log("Du bist vor den Sporen zurückgewichen.");
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

