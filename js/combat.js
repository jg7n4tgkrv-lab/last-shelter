/* Last Shelter – combat services
   Phase 1 foundation: card combat, enemy turns and combat outcomes.
*/
function startCombat(enemyType, locName, extraNote) {
  const nightBonus = isNight() ? 1.2 : 1.0;
  const enemyId = Object.keys(ENEMY_DB).find(id => ENEMY_DB[id] === enemyType) || "wolf";
  combat = {
    enemyId,
    enemyName: enemyType.name,
    intentLabel: enemyType.intent || "Angriff",
    intentType: "attack",
    intentBlock: 0,
    intentPoison: 0,
    enemyBlock: 0,
    poisonTurns: 0,
    enemyHp: enemyType.maxHp,
    enemyMaxHp: enemyType.maxHp,
    dmgMin: Math.round(enemyType.dmgMin * nightBonus),
    dmgMax: Math.round(enemyType.dmgMax * nightBonus),
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
  if (extraNote) log(extraNote);
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
  combat.intentType = "attack";
  combat.intentLabel = ENEMY_DB[combat.enemyId]?.intent || "Angriff";
  combat.intentDamage = combat.dmgMin + Math.floor(Math.random() * (combat.dmgMax - combat.dmgMin + 1));
  combat.intentBlock = 0;
  combat.intentPoison = 0;

  if (combat.enemyId === "looter" && Math.random() < 0.28) {
    combat.intentType = "block";
    combat.intentLabel = "Deckung";
    combat.intentDamage = 0;
    combat.intentBlock = 8;
  } else if ((combat.enemyId === "bear" || combat.enemyId === "mountain_titan") && Math.random() < 0.35) {
    combat.intentType = "heavy";
    combat.intentLabel = "Wuchtiger Hieb";
    combat.intentDamage += combat.enemyId === "mountain_titan" ? 8 : 6;
  } else if ((combat.enemyId === "swamp_thing" || combat.enemyId === "swamp_queen") && Math.random() < 0.5) {
    combat.intentType = "poison";
    combat.intentLabel = "Giftiger Biss";
    combat.intentPoison = 3;
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

function renderCombat() {
  updateBodyClass();
  const maxHp = getMaxHealth();
  const enemyBlockLabel = combat.enemyBlock > 0 ? ` · ${combat.enemyBlock} Block` : "";
  document.getElementById("enemyName").textContent = `${combat.enemyName}  (${combat.enemyHp}/${combat.enemyMaxHp})${enemyBlockLabel}`;
  document.getElementById("enemyBar").style.width = Math.max(0, (combat.enemyHp / combat.enemyMaxHp) * 100) + "%";
  const intentDetail = combat.intentType === "block"
    ? `+${combat.intentBlock} Block`
    : combat.intentType === "poison"
      ? `· ${combat.intentDamage} Schaden + Gift`
      : combat.intentType === "heavy"
        ? `· ${combat.intentDamage} Schaden · halber Block`
        : `· ${combat.intentDamage} Schaden`;
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

  <div class="cDesc">${info.desc}</div>
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
  } else if (cardId === "heal") {
    const before = state.health;
    state.health = Math.min(getMaxHealth(), state.health + 15);
    spawnFloatNumber(playerBarWrap, "+" + (state.health - before), "heal");
  } else if (cardId === "emergency_bandage") {
    const before = state.health;
    state.health = Math.min(getMaxHealth(), state.health + 25);
    spawnFloatNumber(playerBarWrap, "+" + (state.health - before), "heal");
  }

  combat.discardPile.push(cardId);
  combat.hand.splice(index, 1);

  if (combat.enemyHp <= 0) { winCombat(); return; }
  renderCombat();
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
  } else {
    const effectiveBlock = combat.intentType === "heavy" ? Math.floor(combat.block * 0.5) : combat.block;
    dmg = Math.max(0, combat.intentDamage - effectiveBlock);
    state.health -= dmg;
    if (combat.intentType === "heavy") {
      log(`${combat.enemyName} setzt einen wuchtigen Hieb ein – nur die Hälfte deines Blocks zählt.`);
    }
    if (combat.intentType === "poison") {
      combat.poisonTurns = Math.max(combat.poisonTurns, combat.intentPoison);
      log(`${combat.enemyName} vergiftet dich für ${combat.intentPoison} Züge.`);
    }
  }
  combat.block = 0;

  if (dmg > 0) {
    spawnFloatNumber(document.getElementById("playerBarWrap"), "-" + dmg, "dmg");
  }

  if (state.health <= 0) { loseCombat(); return; }

  combat.discardPile.push(...combat.hand);
  combat.hand = [];
  combat.ap = combat.maxAp;
  drawCards(5);
  rollEnemyIntent();
  renderCombat();
}

function winCombat() {
  if (!state.runStats || typeof state.runStats !== "object") state.runStats = { expeditions:0, victories:0 };
  state.runStats.victories += 1;
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
      state.equipmentInventory.push(combat.bossReward);
      lootMsg += ` Einzigartige Beute: ${bossReward.name} (${getRarityLabel(bossReward)}).`;
    }
  }
  if (Math.random() < 0.65) {
    state.inventory.push("Fleisch");
    lootMsg += " Fleisch gefunden.";
  }
  if (Math.random() < 0.4) {
    const lootTable = getLootTableForEnemy(combat.enemyId);
    const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];
    state.equipmentInventory.push(itemId);
    lootMsg += ` Beute gefunden: ${ITEM_DB[itemId].name} (${getRarityLabel(ITEM_DB[itemId])}).`;
  }
  const resultLabel = combat.boss ? "Gebietsjäger besiegt" : "Sieg";
  state.pendingCardReward = shuffle(CARD_REWARD_POOL).slice(0, 3);
  lootMsg += " Eine Kartenbelohnung wartet.";
  endCombatOverlay(`${resultLabel} gegen ${combat.enemyName}! +${xpReward} XP.${lootMsg}`);
}

function loseCombat() {
  state.health = getMaxHealth();
  state.hunger = Math.max(0, state.hunger - 20);
  state.energy = Math.max(0, state.energy - 20);
  changeCampStatus(-8, -6);
  endCombatOverlay(`Du wurdest besiegt und konntest fliehen. Leben wurde wiederhergestellt.`);

}

function endCombatOverlay(message) {
  combat = null;
  document.getElementById("combatOverlay").classList.remove("active");
  log(message);
  saveGame();
  render();
  maybeShowPerkSelection();
  maybeShowCardReward();
}
