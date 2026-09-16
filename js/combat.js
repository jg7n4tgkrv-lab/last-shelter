/* Last Shelter – combat services
   Phase 1 foundation: card combat, enemy turns and combat outcomes.
*/
function startCombat(enemyType, locName, extraNote) {
  const nightBonus = isNight() ? 1.2 : 1.0;
  const enemyId = Object.keys(ENEMY_DB).find(id => ENEMY_DB[id] === enemyType) || "wolf";
  const expeditionThreat = state.expedition
    ? Math.min(0.3, state.expedition.risk / 100 * 0.3)
    : 0;
  const threatMultiplier = 1 + expeditionThreat;
  const scaledHp = Math.round(enemyType.maxHp * threatMultiplier);
  combat = {
    enemyId,
    enemyName: enemyType.name,
    intentLabel: enemyType.intent || "Angriff",
    intentType: "attack",
    intentHits: 1,
    intentBlock: 0,
    intentPoison: 0,
    intentSteal: 0,
    intentApPenalty: 0,
    intentHeal: 0,
    intentBlockBreak: 0,
    nextAttackBonus: 0,
    nextHeavyBonus: 0,
    nextHeavyLabel: "",
    enemyBlock: 0,
    poisonTurns: 0,
    enemyHp: scaledHp,
    enemyMaxHp: scaledHp,
    dmgMin: Math.round(enemyType.dmgMin * nightBonus * threatMultiplier),
    dmgMax: Math.round(enemyType.dmgMax * nightBonus * threatMultiplier),
    expeditionThreat,
    drawPile: shuffle(state.deck),
    hand: [], discardPile: [],
    ap: 3, maxAp: 3, block: 0, locName: locName,
    boss: Boolean(enemyType.boss), bossLocationId: enemyType.locationId || null, bossReward: enemyType.reward || null
  };
  if (state.expedition) {
    state.expedition.encounters += 1;
    state.expedition.risk = Math.min(100, state.expedition.risk + 12);
    saveGame();
  }
  rollEnemyIntent();
  drawCards(5);
  document.getElementById("combatOverlay").classList.add("active");
  renderCombat();
  const threatNote = expeditionThreat > 0
    ? ` Die lange Expedition verstärkt den Gegner um ${Math.round(expeditionThreat * 100)} %.`
    : "";
  if (extraNote || threatNote) log(`${extraNote || ""}${threatNote}`.trim());
}

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (combat.drawPile.length === 0) {
      if (combat.discardPile.length === 0) return;
      combat.drawPile = shuffle(combat.discardPile);
      combat.discardPile = [];
    }
    combat.hand.push(combat.drawPile.pop());
  }
}

function rollEnemyIntent() {
  if (!combat) return;
  const enemyData = ENEMY_DB[combat.enemyId];
  combat.intentType = "attack";
  combat.intentHits = enemyData?.attackCount || 1;
  combat.intentLabel = enemyData?.intent || "Angriff";
  combat.intentDamage = combat.dmgMin + Math.floor(Math.random() * (combat.dmgMax - combat.dmgMin + 1));
  combat.intentBlock = 0;
  combat.intentPoison = 0;
  combat.intentSteal = 0;
  combat.intentApPenalty = 0;
  combat.intentHeal = 0;
  combat.intentBlockBreak = 0;

  const looterRoll = combat.enemyId === "looter" ? Math.random() : 1;
  const stealChance = enemyData?.stealChance || 0;
  const blockChance = enemyData?.blockChance || 0;
  if (combat.enemyId === "looter" && looterRoll < stealChance) {
    combat.intentType = "steal";
    combat.intentLabel = "Beute greifen";
    combat.intentSteal = enemyData?.stealAmount || 1;
  } else if (combat.enemyId === "looter" && looterRoll < stealChance + blockChance) {
    combat.intentType = "block";
    combat.intentLabel = "Deckung";
    combat.intentDamage = 0;
    combat.intentBlock = 8;
  } else if (enemyData?.ability === "stonewall" && Math.random() < (enemyData.abilityChance || 0)) {
    combat.intentType = "block";
    combat.intentLabel = enemyData.abilityLabel || "Steinwall";
    combat.intentDamage = 0;
    combat.intentBlock = enemyData.abilityBlock || 12;
  } else if (enemyData?.ability === "root_bind" && Math.random() < (enemyData.abilityChance || 0)) {
    combat.intentType = "root";
    combat.intentLabel = enemyData.abilityLabel || "Wurzelfessel";
    combat.intentApPenalty = enemyData.abilityApPenalty || 1;
  } else if (enemyData?.ability === "recover" && combat.enemyHp < combat.enemyMaxHp && Math.random() < (enemyData.abilityChance || 0)) {
    combat.intentType = "heal";
    combat.intentLabel = enemyData.abilityLabel || "Uferheilung";
    combat.intentDamage = 0;
    combat.intentHeal = enemyData.abilityHeal || 14;
  } else if (enemyData?.ability === "crush" && Math.random() < (enemyData.abilityChance || 0)) {
    combat.intentType = "heavy";
    combat.intentLabel = enemyData.abilityLabel || "Felssturz";
    combat.intentBlockBreak = enemyData.abilityBlockBreak || 4;
    combat.intentDamage += enemyData.abilityDamage || 10;
  } else if (combat.enemyId === "bear" && Math.random() < 0.35) {
    combat.intentType = "heavy";
    combat.intentLabel = "Wuchtiger Hieb";
    combat.intentDamage += 6;
  } else if (ENEMY_DB[combat.enemyId]?.poison && Math.random() < (ENEMY_DB[combat.enemyId].poisonChance || 0.5)) {
    combat.intentType = "poison";
    combat.intentLabel = "Giftiger Biss";
    combat.intentPoison = ENEMY_DB[combat.enemyId].poisonTurns || 3;
  }
}

function spawnFloatNumber(containerEl, text, cssClass) {
  const num = document.createElement("div");
  num.className = "floatNum " + cssClass;
  num.textContent = text;
  num.style.left = (40 + Math.random() * 20) + "%";
  containerEl.appendChild(num);
  setTimeout(() => num.remove(), 900);
}

function getSurvivalBuildBonus(cardId) {
  const info = CARD_DB[cardId];
  if (!info?.synergy || !Array.isArray(state.deck)) return 0;
  const requiredCategory = String(info.synergy).toLowerCase();
  const matchingCards = state.deck.filter(deckCardId => (
    String(CARD_DB[deckCardId]?.category || "").toLowerCase() === requiredCategory
  )).length;
  return matchingCards >= (info.synergyThreshold || 3) ? (info.synergyBonus || 0) : 0;
}

function renderCombat() {
  updateBodyClass();
  const maxHp = getMaxHealth();
  const survivalBonus = getSurvivalBuildBonus("heal");
  const enemyBlockLabel = combat.enemyBlock > 0 ? ` · ${combat.enemyBlock} Block` : "";
  document.getElementById("enemyName").textContent = `${combat.enemyName}  (${combat.enemyHp}/${combat.enemyMaxHp})${enemyBlockLabel}`;
  document.getElementById("enemyBar").style.width = Math.max(0, (combat.enemyHp / combat.enemyMaxHp) * 100) + "%";
  const attackSummary = combat.intentHits > 1
    ? `${combat.intentHits} × ${combat.intentDamage} Schaden`
    : `${combat.intentDamage} Schaden`;
  const intentDetail = combat.intentType === "block"
    ? `+${combat.intentBlock} Block`
    : combat.intentType === "poison"
      ? `· ${attackSummary} + Gift`
      : combat.intentType === "steal"
      ? `· ${attackSummary} · ${combat.intentSteal} Beute`
      : combat.intentType === "root"
        ? `· ${attackSummary} · −${combat.intentApPenalty} AP`
        : combat.intentType === "heal"
          ? `+${combat.intentHeal} Leben`
          : combat.intentType === "heavy"
        ? `· ${attackSummary} · halber Block${combat.intentBlockBreak > 0 ? " · bricht " + combat.intentBlockBreak + " Block" : ""}`
        : `· ${attackSummary}`;
  document.getElementById("enemyIntent").innerHTML = `
    <span class="enemyIntentTag">NÄCHSTER ZUG</span>
    <strong>${combat.intentLabel}</strong>
    <span>${intentDetail}</span>
  `;
  document.getElementById("playerBar").style.width = Math.max(0, (state.health / maxHp) * 100) + "%";
  document.getElementById("combatStatus").innerHTML = `
  <span class="combatStat">
    <img src="images/icons/health.png" alt="">
    ${state.health}/${maxHp}
  </span>

  <span class="combatStat">
    <img src="images/icons/shield.png" alt="">
    ${combat.block}
  </span>

  <span class="combatStat">
    <img src="images/icons/energy.png" alt="">
    ${combat.ap}/${combat.maxAp}
  </span>

  ${combat.poisonTurns > 0 ? `
    <span class="combatEffect">
      <img src="images/icons/poison.png" alt="">
      Gift ${combat.poisonTurns}
    </span>
  ` : ""}
  ${combat.nextAttackBonus > 0 ? `
    <span class="combatEffect">Konter +${combat.nextAttackBonus}</span>
  ` : ""}
  ${combat.nextHeavyBonus > 0 ? `
    <span class="combatEffect">${combat.nextHeavyLabel || "Ziel"} +${combat.nextHeavyBonus}</span>
  ` : ""}
  ${survivalBonus > 0 ? `
    <span class="combatEffect">${CARD_DB.heal.synergyLabel || "Heilung"} +${survivalBonus}</span>
  ` : ""}
`;

  const antidoteCount = state.consumables.filter(itemId => itemId === "gegenmittel").length;
  document.getElementById("combatItemActions").innerHTML = combat.poisonTurns > 0 && antidoteCount > 0
    ? `<button class="combatItemBtn" onclick="useAntidote()">Gegengift benutzen (${antidoteCount}) · Gift entfernen</button>`
    : "";

  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";
  combat.hand.forEach((cardId, index) => {
    const info = CARD_DB[cardId];
    const el = document.createElement("div");
    el.className = "handCard" + (info.cost > combat.ap ? " disabled" : "");
    el.innerHTML = `
  <span class="cCost">${info.cost} AP</span>

  <div class="cName">
    <img src="${CARD_ICON_FILES[cardId]}" alt="">
    ${info.name}
  </div>

  <div class="cDesc"><span class="cardCategory">${info.category || "Karte"}</span> · <span class="cardRarity rarity-${info.rarity || "common"}">${getRarityLabel(info)}</span> · ${info.desc}</div>
`;
    el.onclick = () => playCard(index);
    handDiv.appendChild(el);
  });
}

function playCard(index) {
  const cardId = combat.hand[index];
  const info = CARD_DB[cardId];
  if (combat.ap < info.cost) return;
  combat.ap -= info.cost;
  const str = state.attributes.staerke;
  const dex = state.attributes.geschicklichkeit;
  const weaponBonus = getWeaponBonus();
  const armorBonus = getArmorBonus();

  const enemyBox = document.getElementById("enemyBox");
  const playerBarWrap = document.getElementById("playerBarWrap");

  if (cardId === "attack" || cardId === "attack_plus" || cardId === "heavy" || cardId === "precise_strike") {
    let dmg;
    if (cardId === "attack") dmg = 8 + Math.floor(Math.random() * 5) + str * 2 + weaponBonus;
    else if (cardId === "attack_plus") dmg = 14 + Math.floor(Math.random() * 5) + str * 2 + weaponBonus;
    else if (cardId === "precise_strike") dmg = 10 + Math.floor(Math.random() * 5) + str * 2 + weaponBonus;
    else dmg = 18 + Math.floor(Math.random() * 5) + str * 3 + weaponBonus;
    if (combat.nextAttackBonus > 0) {
      dmg += combat.nextAttackBonus;
      log(`Dein Konter verstärkt ${info.name} um +${combat.nextAttackBonus} Schaden.`);
      combat.nextAttackBonus = 0;
    }
    if (cardId === "heavy" && combat.nextHeavyBonus > 0) {
      dmg += combat.nextHeavyBonus;
      log(`Die Markierung verstärkt Schwerer Schlag um +${combat.nextHeavyBonus} Schaden.`);
      combat.nextHeavyBonus = 0;
      combat.nextHeavyLabel = "";
    }
    const absorbed = Math.min(combat.enemyBlock, dmg);
    const dealt = dmg - absorbed;
    combat.enemyBlock -= absorbed;
    combat.enemyHp -= dealt;
    spawnFloatNumber(enemyBox, absorbed > 0 ? `-${dealt} (${absorbed} Block)` : "-" + dealt, dealt > 0 ? "dmg" : "block");
    document.getElementById("enemyName").classList.remove("hit");
    void document.getElementById("enemyName").offsetWidth;
    document.getElementById("enemyName").classList.add("hit");
  } else if (cardId === "defend" || cardId === "defend_plus") {
    const blockGain = cardId === "defend" ? 8 + dex * 2 + armorBonus : 14 + dex * 2 + armorBonus;
    combat.block += blockGain;
    spawnFloatNumber(playerBarWrap, "+" + blockGain + " Block", "block");
  } else if (cardId === "dodge") {
    combat.block += 999;
    spawnFloatNumber(playerBarWrap, "Ausgewichen!", "block");
  } else if (cardId === "heal" || cardId === "emergency_bandage") {
    const before = state.health;
    const baseHeal = cardId === "heal" ? 15 : 25;
    const healBonus = getSurvivalBuildBonus(cardId);
    state.health = Math.min(getMaxHealth(), state.health + baseHeal + healBonus);
    const healed = state.health - before;
    spawnFloatNumber(playerBarWrap, "+" + healed, "heal");
    if (healBonus > 0 && healed > 0) {
      log(`Survival-Build verstärkt ${info.name} um +${healBonus} Heilung.`);
    }
  }

  if (info.category === "Verteidigung") {
    combat.nextAttackBonus = 4;
    log("Deine Verteidigung bereitet einen Konter vor: nächster Angriff +4 Schaden.");
  }
  if (info.marksFor === "heavy") {
    combat.nextHeavyBonus = info.markBonus || 0;
    combat.nextHeavyLabel = info.markLabel || "Ziel";
    log(`${info.name} markiert den Gegner: nächster Schwerer Schlag +${combat.nextHeavyBonus} Schaden.`);
  }

  combat.discardPile.push(cardId);
  combat.hand.splice(index, 1);

  if (combat.enemyHp <= 0) { winCombat(); return; }
  renderCombat();
}

function getAppliedPoisonTurns(baseTurns) {
  return Math.max(1, baseTurns - getPoisonResistance());
}

function stealOneResource() {
  const isResource = itemId => Boolean(RESOURCE_DB[itemId] || FOOD_DB[itemId]);
  const expeditionItems = state.expedition?.loot?.inventory;
  if (Array.isArray(expeditionItems)) {
    const expeditionIndex = expeditionItems.findIndex(isResource);
    if (expeditionIndex >= 0) return expeditionItems.splice(expeditionIndex, 1)[0];
  }
  const inventoryIndex = state.inventory.findIndex(isResource);
  if (inventoryIndex >= 0) return state.inventory.splice(inventoryIndex, 1)[0];
  return null;
}

function endTurn() {
  if (combat.poisonTurns > 0) {
    const poisonDamage = 3;
    combat.poisonTurns -= 1;
    state.health -= poisonDamage;
    spawnFloatNumber(document.getElementById("playerBarWrap"), "-" + poisonDamage + " Gift", "dmg");
    if (state.health <= 0) { loseCombat(); return; }
  }

  let dmg = 0;
  if (combat.intentType === "block") {
    combat.enemyBlock += combat.intentBlock;
    log(`${combat.enemyName} geht in Deckung und erhält ${combat.intentBlock} Block.`);
  } else if (combat.intentType === "heal") {
    const healed = Math.min(combat.intentHeal || 0, combat.enemyMaxHp - combat.enemyHp);
    combat.enemyHp += healed;
    log(`${combat.enemyName} zieht sich ans Ufer zurück und heilt ${healed} Leben.`);
  } else {
    const hitCount = combat.intentHits || 1;
    let remainingBlock = combat.intentType === "heavy"
      ? Math.floor(combat.block * 0.5)
      : combat.block;
    if (combat.intentBlockBreak > 0) {
      remainingBlock = Math.max(0, remainingBlock - combat.intentBlockBreak);
    }
    for (let hit = 0; hit < hitCount; hit += 1) {
      const absorbed = Math.min(remainingBlock, combat.intentDamage);
      remainingBlock -= absorbed;
      dmg += combat.intentDamage - absorbed;
    }
    state.health -= dmg;
    if (combat.intentType === "heavy") {
      log(`${combat.enemyName} setzt einen wuchtigen Hieb ein – nur die Hälfte deines Blocks zählt.`);
    }
    if (combat.intentType === "poison") {
      const appliedPoison = getAppliedPoisonTurns(combat.intentPoison);
      combat.poisonTurns = Math.max(combat.poisonTurns, appliedPoison);
      log(`${combat.enemyName} vergiftet dich für ${appliedPoison} Züge.`);
    }
  }
  combat.block = 0;
  combat.nextAttackBonus = 0;
  combat.nextHeavyBonus = 0;
  combat.nextHeavyLabel = "";

  if (dmg > 0) {
    spawnFloatNumber(document.getElementById("playerBarWrap"), "-" + dmg, "dmg");
  }

  if (state.health <= 0) { loseCombat(); return; }

  if (combat.intentType === "root") {
    log(`${combat.enemyName} fesselt dich mit Wurzeln – dein nächster Zug hat 1 AP weniger.`);
  }

  if (combat.intentType === "steal") {
    const stolenItems = [];
    for (let i = 0; i < (combat.intentSteal || 1); i += 1) {
      const stolen = stealOneResource();
      if (!stolen) break;
      stolenItems.push(stolen);
    }
    if (stolenItems.length > 0) {
      log(`${combat.enemyName} stiehlt: ${stolenItems.join(", ")}.`);
    } else {
      log(`${combat.enemyName} findet keine Beute zum Stehlen.`);
    }
  }

  combat.discardPile.push(...combat.hand);
  combat.hand = [];
  const apPenalty = combat.intentType === "root" ? (combat.intentApPenalty || 1) : 0;
  combat.ap = Math.max(1, combat.maxAp - apPenalty);
  drawCards(5);
  rollEnemyIntent();
  renderCombat();
}

function winCombat() {
  if (!state.runStats || typeof state.runStats !== "object") state.runStats = { expeditions:0, victories:0 };
  state.runStats.victories += 1;
  const expeditionLootBonus = state.expedition
    ? Math.min(0.2, state.expedition.risk / 100 * 0.2)
    : 0;
  const xpReward = combat.boss ? 60 : 20;
  state.xp += xpReward;
  changeCampStatus(combat.boss ? 10 : 6, combat.boss ? 10 : 3);
  checkLevelUp();
  let lootMsg = "";
  if (combat.boss && combat.bossLocationId) {
    if (!state.bossesDefeated || typeof state.bossesDefeated !== "object") state.bossesDefeated = {};
    state.bossesDefeated[combat.bossLocationId] = true;
    const bossReward = ITEM_DB[combat.bossReward];
    if (bossReward) {
      addExpeditionLoot(combat.bossReward, "equipment");
      lootMsg += ` Einzigartige Beute: ${bossReward.name} (${getRarityLabel(bossReward)}).`;
    }
  }
  if (Math.random() < 0.65 + expeditionLootBonus) {
    addExpeditionLoot("Fleisch");
    lootMsg += " Fleisch gefunden.";
  }
  if (Math.random() < 0.4 + expeditionLootBonus) {
    const lootTable = getLootTableForEnemy(combat.enemyId);
    const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];
    addExpeditionLoot(itemId, "equipment");
    lootMsg += ` Beute gefunden: ${ITEM_DB[itemId].name} (${getRarityLabel(ITEM_DB[itemId])}).`;
  }
  const resultLabel = combat.boss ? "Gebietsjäger besiegt" : "Sieg";
  state.pendingCardReward = shuffle(CARD_REWARD_POOL).slice(0, 3);
  lootMsg += " Eine Kartenbelohnung wartet.";
  endCombatOverlay(`${resultLabel} gegen ${combat.enemyName}! +${xpReward} XP.${lootMsg}`);
}

function loseCombat() {
  const lostLoot = abandonExpeditionLoot();
  state.health = getMaxHealth();
  state.hunger = Math.max(0, state.hunger - 20);
  state.energy = Math.max(0, state.energy - 20);
  changeCampStatus(-8, -6);
  const lootNote = lostLoot > 0
    ? ` ${lostLoot} unsichere Beute ging verloren.`
    : "";
  endCombatOverlay(`Du wurdest besiegt und konntest fliehen. Leben wurde wiederhergestellt.${lootNote}`, true);
}

function endCombatOverlay(message, returnToCamp = false) {
  combat = null;
  document.getElementById("combatOverlay").classList.remove("active");
  log(message);
  saveGame();
  render();
  maybeShowPerkSelection();
  maybeShowCardReward();
  if (returnToCamp) switchTab("screenCamp");
}
