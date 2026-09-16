/* Last Shelter – Character, deck and progression UI */

function renderCharacter() {
  const needed = state.level * 50;

  document.getElementById("charLevel").textContent = state.level;
  document.getElementById("charXp").textContent = `${state.xp} / ${needed}`;
  document.getElementById("xpBarInner").style.width =
    Math.min(100, (state.xp / needed) * 100) + "%";

  const a = state.attributes;
  const runStats = state.runStats || { expeditions:0, victories:0 };
  const defeatedGuardians = Object.values(state.bossesDefeated || {}).filter(Boolean).length;

  document.getElementById("attrsBox").innerHTML = `
    <h2 class="sectionTitle">
      <img src="images/icons/character.png" alt="">
      Attribute
    </h2>

    <div class="stat-row">
      <span class="stat-label">
        <span class="icn"><img src="${ATTRIBUTE_ICON_FILES.staerke}" alt=""></span>
        Stärke
      </span>
      <span>${a.staerke}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">
        <span class="icn"><img src="${ATTRIBUTE_ICON_FILES.vitalitaet}" alt=""></span>
        Vitalität
      </span>
      <span>${a.vitalitaet}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">
        <span class="icn"><img src="${ATTRIBUTE_ICON_FILES.geschicklichkeit}" alt=""></span>
        Geschicklichkeit
      </span>
      <span>${a.geschicklichkeit}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">
        <span class="icn"><img src="${ATTRIBUTE_ICON_FILES.ueberleben}" alt=""></span>
        Überleben
      </span>
      <span>${a.ueberleben}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">
        <span class="icn"><img src="${ATTRIBUTE_ICON_FILES.wahrnehmung}" alt=""></span>
        Wahrnehmung
      </span>
      <span>${a.wahrnehmung}</span>
    </div>

    <div class="runStats">
      <div class="runStat"><span>Tage</span><strong>${state.day}</strong><small>überlebt</small></div>
      <div class="runStat"><span>Expeditionen</span><strong>${runStats.expeditions}</strong><small>gestartet</small></div>
      <div class="runStat"><span>Siege</span><strong>${runStats.victories}</strong><small>errungen</small></div>
      <div class="runStat"><span>Wächter</span><strong>${defeatedGuardians}</strong><small>besiegt</small></div>
    </div>
  `;

  const weapon = state.equipped.weapon
    ? ITEM_DB[state.equipped.weapon]
    : null;

  const armor = state.equipped.armor
    ? ITEM_DB[state.equipped.armor]
    : null;

  const tool = state.equipped.tool
    ? ITEM_DB[state.equipped.tool]
    : null;

  let html = `
    <h2 class="sectionTitle">
      <img src="images/icons/settings.png" alt="">
      Ausrüstung
    </h2>
  `;

  html += `
    <div class="stat-row">
      <span class="stat-label">
        <span class="icn">
          <img src="${
            state.equipped.weapon
              ? ITEM_ICON_FILES[state.equipped.weapon]
              : "images/icons/attack.png"
          }" alt="">
        </span>
        Waffe
      </span>

      <span class="${weapon ? "equipItem" : "equipEmpty"}">
        ${weapon ? weapon.name + " (+" + weapon.bonus + ")" : "keine"}
      </span>
    </div>
  `;

  html += `
    <div class="stat-row">
      <span class="stat-label">
        <span class="icn">
          <img src="${
            state.equipped.tool
              ? ITEM_ICON_FILES[state.equipped.tool]
              : "images/icons/chop-wood.png"
          }" alt="">
        </span>
        Werkzeug
      </span>

      <span class="${tool ? "equipItem" : "equipEmpty"}">
        ${tool ? tool.name + " (+" + tool.bonus + " Holz)" : "keines"}
      </span>
    </div>
  `;

  html += `
    <div class="stat-row">
      <span class="stat-label">
        <span class="icn">
          <img src="${
            state.equipped.armor
              ? ITEM_ICON_FILES[state.equipped.armor]
              : "images/icons/shield.png"
          }" alt="">
        </span>
        Rüstung
      </span>

      <span class="${armor ? "equipItem" : "equipEmpty"}">
        ${armor ? armor.name + " (+" + armor.bonus + ")" : "keine"}
      </span>
    </div>
  `;

  if (state.equipmentInventory.length > 0) {
    html += `
      <div style="margin-top:8px; font-size:12px; color:#9a9689;">
        Zum Ausrüsten antippen:
      </div>
    `;

    state.equipmentInventory.forEach((itemId, index) => {
      const item = ITEM_DB[itemId];

      const protectionLabels = [];
      if (item.coldProtection) protectionLabels.push("Kälte −" + item.coldProtection);
      if (item.poisonResistance) protectionLabels.push("Gift −" + item.poisonResistance + " Zug");
      const specialLabel = protectionLabels.length ? " · " + protectionLabels.join(" · ") : "";
      const bonusLabel = item.type === "weapon"
        ? "+" + item.bonus + " Schaden" + specialLabel
        : item.type === "armor"
          ? "+" + item.bonus + " Block" + specialLabel
          : "+" + item.bonus + " Holz beim Sammeln" + specialLabel;

      html += `
        <div class="equipList-item" onclick="equipItem(${index})">
          <span class="equipName">
            <img src="${ITEM_ICON_FILES[itemId]}" alt="">
            ${item.name}
          </span>

          <span class="iBonus">${bonusLabel}</span>
        </div>
      `;
    });
  }

  document.getElementById("equipmentBox").innerHTML = html;

  renderDeckOverview();
}

function renderDeckOverview() {
  const counts = {};

  state.deck.forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
  });

  let html = `
    <h2 class="sectionTitle">
      <img src="images/icons/attack.png" alt="">
      Deck (${state.deck.length} Karten)
    </h2>
    <div class="deckHint">Entferne einzelne Karten, um dein Deck gezielt zu schärfen. Mindestens 8 Karten bleiben erhalten.</div>
  `;

  Object.keys(counts).forEach(cardId => {
    const info = CARD_DB[cardId];

    html += `
      <div class="deckRow">
        <span class="stat-label">
          <span class="icn">
            <img src="${CARD_ICON_FILES[cardId]}" alt="">
          </span>
          ${info.name}
        </span>
        <span class="deckMeta">
          <span class="deckCount">x${counts[cardId]} · ${info.category || "Karte"}</span>
          <span class="cardRarity rarity-${info.rarity || "common"}">${getRarityLabel(info)}</span>
        </span>
        <button class="deckRemove" type="button" onclick="removeDeckCard(&quot;${cardId}&quot;)" ${state.deck.length <= 8 ? "disabled" : ""}>Entfernen</button>
      </div>
    `;
  });

  document.getElementById("deckBox").innerHTML = html;
}

function removeDeckCard(cardId) {
  if (state.deck.length <= 8) {
    log("Dein Deck muss mindestens 8 Karten enthalten.");
    return;
  }
  const idx = state.deck.indexOf(cardId);
  if (idx === -1 || !CARD_DB[cardId]) return;
  const cardName = CARD_DB[cardId].name;
  state.deck.splice(idx, 1);
  log(cardName + " wurde aus dem Deck entfernt.");
  saveGame();
  renderCharacter();
}

function equipItem(index) {
  const itemId = state.equipmentInventory[index];
  if (!itemId || !ITEM_DB[itemId]) return;
  const item = ITEM_DB[itemId];
  const slot = item.type;
  const currentlyEquipped = state.equipped[slot];
  if (currentlyEquipped) state.equipmentInventory.push(currentlyEquipped);
  state.equipped[slot] = itemId;
  state.equipmentInventory.splice(index, 1);
  log(`${item.name} ausgerüstet.`);
  saveGame();
  render();
  renderCharacter();
}


function getAvailablePerks() {
  return PERKS.filter(p => {
    if (p.type === "card" && p.requiresCard) {
      if (!state.deck.includes(p.requiresCard)) return false;
      if (p.effect === "removeCard" && state.deck.length <= 8) return false;
    }
    return true;
  });
}

function maybeShowPerkSelection() {
  if (state.pendingLevelUps > 0) showPerkOverlay();
}

function maybeShowCardReward() {
  if (state.pendingLevelUps === 0 && Array.isArray(state.pendingCardReward) && state.pendingCardReward.length > 0) {
    showCardRewardOverlay();
  }
}

function showCardRewardOverlay() {
  const overlay = document.getElementById("cardRewardOverlay");
  const list = document.getElementById("cardRewardList");
  const skip = document.getElementById("cardRewardSkip");
  if (!overlay || !list || !skip || !state.pendingCardReward.length) return;

  list.innerHTML = "";
  state.pendingCardReward.forEach(cardId => {
    const info = CARD_DB[cardId];
    const button = document.createElement("button");
    button.className = "rewardChoice";
    button.type = "button";
    button.innerHTML = "<img class=\"rewardChoiceIcon\" src=\"" + CARD_ICON_FILES[cardId] + "\" alt=\"\">" +
      "<span class=\"rewardChoiceBody\"><span class=\"rewardChoiceName\">" + info.name + "</span>" +
      "<span class=\"rewardChoiceDesc\">" + info.cost + " AP · " + (info.category || "Karte") + " · " + getRarityLabel(info) + " · " + info.desc + "</span></span>";
    button.onclick = () => chooseCardReward(cardId);
    list.appendChild(button);
  });

  const closeWithoutCard = () => chooseCardReward(null);
  skip.onclick = closeWithoutCard;
  overlay.classList.add("active");
}

function chooseCardReward(cardId) {
  if (!Array.isArray(state.pendingCardReward) || state.pendingCardReward.length === 0) return;
  if (cardId && CARD_DB[cardId]) {
    state.deck.push(cardId);
    log(CARD_DB[cardId].name + " wurde deinem Deck hinzugefügt.");
  } else {
    log("Du hast die Kartenbelohnung übersprungen.");
  }
  state.pendingCardReward = [];
  document.getElementById("cardRewardOverlay").classList.remove("active");
  saveGame();
  render();
}

function showPerkOverlay() {
  document.getElementById("perkOverlay").classList.add("active");
  const pool = getAvailablePerks();
  const choices = shuffle(pool).slice(0, 3);
  const list = document.getElementById("perkList");
  list.innerHTML = "";
  choices.forEach(perk => {
    const el = document.createElement("div");
    el.className = "perkCard";
    el.innerHTML = `
  <span class="pIcon">
    <img src="${PERK_ICON_FILES[perk.id]}" alt="">
  </span>

  <div class="pName">${perk.name}</div>
  <div class="pDesc">${perk.desc}</div>
`;
    el.onclick = () => choosePerk(perk);
    list.appendChild(el);
  });
}

function choosePerk(perk) {
  if (perk.type === "attr") {
    state.attributes[perk.attr] += 1;
  } else if (perk.effect === "addCard") {
    state.deck.push(perk.card);
  } else if (perk.effect === "removeCard") {
    if (!removeOneFromDeck(perk.card)) {
      log("Dein Deck hat bereits die Mindestgröße von 8 Karten.");
    }
  } else if (perk.effect === "upgradeCard") {
    const idx = state.deck.indexOf(perk.from);
    if (idx !== -1) state.deck[idx] = perk.to;
  }

  state.pendingLevelUps -= 1;
  saveGame();

  if (state.pendingLevelUps > 0) {
    showPerkOverlay();
  } else {
    document.getElementById("perkOverlay").classList.remove("active");
    render();
    maybeShowCardReward();
  }
}

