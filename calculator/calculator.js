// @ts-nocheck
(() => {

    const MIN_ATK = 0.05,
      ATK_A = 231,
      ATK_B = 8900;
    const SEG = [20, 40, 70, 90, 110, 130, 150, 160, 170, 180, 190, 200];
    const LCOEF = [
      0.0248, 0.0248, 0.0248, 0.0248, 0.0248, 0.0248, 0.0248, 0.0248, 0.0248,
      0.0248, 0.0248, 0.0248,
    ];
    const GREV = [
      0, 0.21, 0.315, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42,
    ];
    const GRADE_COEF = [null, [11, 50], [33, 100], [11, 25]];
    const DATA_BASE = new URL("characters/", document.baseURI).pathname.replace(/\/$/, "");
    const MAX_TEAM = 6;

    let isExactBreakpoint = false;

    function monRatios(lv) {
      let lr = 0,
        gr = 0,
        prev = 1;
      for (let i = 0; i < SEG.length; i++) {
        const s = SEG[i];
        if (lv >= s) {
          lr += (s - prev) * LCOEF[i];
          gr += GREV[i];
        } else {
          lr += (lv - prev) * LCOEF[i];
          gr += GREV[i] * Math.min((lv - prev) / 5, 1);
          return [lr, gr];
        }
        prev = s;
      }
      lr += (lv - SEG[SEG.length - 1]) * LCOEF[LCOEF.length - 1];
      return [lr, gr];
    }
    function monStat(base, lv) {
      const [lr, gr] = monRatios(lv);
      return Math.floor(base + base * lr + base * gr);
    }
    function calcHeroBaseAtk(base, lv, grade) {
      const lvPart = Math.floor(base * (1 + (ATK_A / ATK_B) * (lv - 1)));
      let gPart = 0;
      for (let g = 1; g <= grade; g++) {
        const [a, b] = GRADE_COEF[g];
        gPart += base * (a / b);
      }
      return Math.floor(lvPart + gPart);
    }

    // ── State ──────────────────────────────────────────────────────────────────
    let grade = 0,
      damageType = "AP",
      skillType = "normal",
      heroBaseAtk = null;
    let currentHeroSkills = null,
      currentSkillMeta = null;
    let currentHeroChains = null,
      chainEnabled = {};
    let currentHeroPhasePassives = null,
      phaseEnabled = {};
    let charEffectsEnabled = {}; // statusId → bool (default true)
    let skillBuffEnabled = {}; // `slot_statusId` → bool (default false)
    let characterIndex = [];

    let teamSlots = Array.from({ length: MAX_TEAM }, () => ({
      data: null,
      chainEnabled: {},
      phaseEnabled: {},
      charEffectsEnabled: {},
      skillBuffEnabled: {},
    }));

    const SKILL_SLOT_LABELS = {
      characteristic: "Characteristic",
      normalAttack: "Normal Attack",
      ultimate: "Ultimate",
      skill1: "Active Skill (S1)",
      passive: "Passive (S1)",
      exclusive: "Exclusive Skill",
      extra1: "Extra Skill 1",
      extra2: "Extra Skill 2",
      extra3: "Extra Skill 3",
      extra4: "Extra Skill 4",
      extra5: "Extra Skill 5",
      extra6: "Extra Skill 6",
      extra7: "Extra Skill 7",
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    async function loadIndex() {
      try {
        const res = await fetch(`${DATA_BASE}/index.json`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        characterIndex = await res.json();
        const sel = document.getElementById("hero-select");
        characterIndex.forEach((e) => {
          const o = document.createElement("option");
          o.value = e.file;
          o.textContent = e.name;
          sel.appendChild(o);
        });
        initTeamGrid();
      } catch (e) {
        console.warn("index:", e);
        const error = document.getElementById("calculator-data-error");
        if (error) {
          error.hidden = false;
          error.textContent = "Character data could not be loaded. Check your connection and reload.";
        }
      }
    }

    async function loadCharacterFile(filename) {
      try {
        const res = await fetch(`${DATA_BASE}/${filename}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        applyHeroData(await res.json());
      } catch (e) {
        console.warn("char:", e);
        const error = document.getElementById("calculator-data-error");
        if (error) {
          error.hidden = false;
          error.textContent = "That sinner's data could not be loaded. Check your connection and try again.";
        }
      }
    }

    async function loadTeamCharacter(slotIdx, filename) {
      const slot = teamSlots[slotIdx];
      if (!filename) {
        slot.data = null;
        slot.chainEnabled = {};
        slot.phaseEnabled = {};
        slot.charEffectsEnabled = true;
        slot.skillBuffEnabled = {};
        renderTeamSlot(slotIdx);
        update();
        return;
      }
      try {
        const res = await fetch(`${DATA_BASE}/${filename}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        slot.data = data;
        slot.chainEnabled = {};
        slot.skillBuffEnabled = {};
        slot.charEffectsOn = true;
        slot.phaseEnabled = {};
        (data.phasePassives || []).forEach((p) => {
          slot.phaseEnabled[p.phase] = true;
        });

        (data.skills?.characteristic?.buffs || []).forEach((b) => {
          (b.maxLevelEffects || []).forEach((e) => {
            slot.charEffectsEnabled[`char_${b.statusId}_${e.propertyId}`] =
              true;
          });
        });

        (data.phasePassives || []).forEach((p) => {
          p.effects.forEach((e) => {
            slot.phaseEnabled[`${p.phase}_${e.propertyId}`] = true;
          });
        });
        renderTeamSlot(slotIdx);
        update();
      } catch (e) {
        console.warn("team char:", e);
      }
    }

    // ── Apply hero ─────────────────────────────────────────────────────────────
    function applyHeroData(data) {
      heroBaseAtk = data.baseAtk || null;
      currentHeroSkills = data.skills || null;
      currentHeroChains = data.chains || null;
      currentHeroPhasePassives = data.phasePassives || null;
      chainEnabled = {};
      phaseEnabled = {};
      charEffectsEnabled = {};
      skillBuffEnabled = {};
      document.getElementById("hero-badge").textContent =
        data.name + " #" + data.id;

      (currentHeroPhasePassives || []).forEach((p) => {
        p.effects.forEach((e) => {
          phaseEnabled[`${p.phase}_${e.propertyId}`] = true;
        });
      });
      const charSkill = currentHeroSkills?.characteristic;
      (charSkill?.buffs || []).forEach((b) => {
        (b.maxLevelEffects || []).forEach((e) => {
          charEffectsEnabled[getCharEffectKey(b.statusId, e.propertyId)] = true;
        });
      });

      const skillSel = document.getElementById("skill-select");
      skillSel.innerHTML = "";
      if (currentHeroSkills) {
        Object.entries(currentHeroSkills).forEach(([slot, skill]) => {
          if (!skill || !skill.id || slot === "characteristic") return;
          const o = document.createElement("option");
          o.value = slot;
          o.textContent =
            (SKILL_SLOT_LABELS[slot] || slot) +
            (skill.name ? ` — ${skill.name}` : "") +
            (skill.isSummonSkill ? " [Summon]" : "");
          skillSel.appendChild(o);
        });
        skillSel.value = "normalAttack";
        const defaultSkill = currentHeroSkills?.normalAttack;
        const dt = defaultSkill?.damageType || 0;
        if (dt & 2) setDT("AD");
        else if (dt & 1) setDT("AP");
        applySelectedSkill();
      }
      renderChains();
      renderCharacteristic();
      renderPhasePassives();
      update();
    }

    // ── Render shackles ────────────────────────────────────────────────────────
    function renderChains() {
      const field = document.getElementById("chains-field"),
        sep = document.getElementById("chains-sep"),
        list = document.getElementById("chains-list");
      if (!currentHeroChains || !currentHeroChains.length) {
        field.style.display = sep.style.display = "none";
        return;
      }
      field.style.display = sep.style.display = "";
      list.innerHTML = "";
      currentHeroChains.forEach((chain) => {
        const hasE = chain.effects && chain.effects.length > 0,
          isOn = chainEnabled[chain.id] || false;
        const item = document.createElement("div");
        item.className =
          "chain-item" + (isOn ? " on" : "") + (hasE ? "" : " no-effect");
        let pills = "";
        if (hasE) {
          pills = chain.effects
            .map(
              (e) =>
                `<span class="chain-pill">${e.label} ${e.add >= 0 ? "+" : ""}${e.add}${e.isPercent ? "%" : ""}</span>`,
            )
            .join("");
          pills = `<div class="chain-effect-pills">${pills}</div>`;
        }
        item.innerHTML = `<div class="chain-check"></div><div><div class="chain-name">${chain.name}</div><div class="chain-desc">${chain.description}</div>${pills}</div>`;
        if (hasE)
          item.addEventListener("click", () => {
            chainEnabled[chain.id] = !chainEnabled[chain.id];
            renderChains();
            update();
          });
        list.appendChild(item);
      });
      const total = getChainAtkPct();
      document.getElementById("chains-atk-label").textContent =
        total > 0 ? `+${total}% ATK active` : "";
    }

    // Key helper
    function getCharEffectKey(statusId, propertyId) {
      return `${statusId}_${propertyId}`;
    }

    // ── Render characteristic ──────────────────────────────────────────────────
    function renderCharacteristic() {
      const field = document.getElementById("char-field"),
        sep = document.getElementById("char-sep"),
        list = document.getElementById("char-list");
      const charSkill = currentHeroSkills?.characteristic;
      const useful = (charSkill?.buffs || []).filter(
        (b) => !b.scripted && b.maxLevelEffects?.length > 0,
      );
      const scripted = (charSkill?.buffs || []).filter((b) => b.scripted);
      if (!useful.length && !scripted.length) {
        field.style.display = sep.style.display = "none";
        return;
      }
      field.style.display = sep.style.display = "";
      list.innerHTML = "";

      useful.forEach((buff) => {
        // One row per effect
        buff.maxLevelEffects.forEach((effect) => {
          const key = getCharEffectKey(buff.statusId, effect.propertyId);
          if (charEffectsEnabled[key] === undefined)
            charEffectsEnabled[key] = true;
          const isOn = charEffectsEnabled[key];
          const sign = effect.add >= 0 ? "+" : "";
          const pct = effect.isPercent ? "%" : "";
          const item = document.createElement("div");
          item.className = "chain-item" + (isOn ? " on" : "");
          item.innerHTML = `
        <div class="chain-check"></div>
        <div>
          <div class="chain-name">${effect.label}</div>
          ${buff.description ? `<div class="chain-desc">${buff.description}</div>` : ""}
          <div class="chain-effect-pills"><span class="chain-pill">${sign}${effect.add}${pct}</span></div>
        </div>`;
          item.addEventListener("click", () => {
            charEffectsEnabled[key] = !charEffectsEnabled[key];
            renderCharacteristic();
            update();
          });
          list.appendChild(item);
        });
      });

      scripted.forEach((buff) => {
        const item = document.createElement("div");
        item.className = "chain-item no-effect";
        item.innerHTML = `<div class="chain-check"></div><div><div class="chain-name">Scripted Effect</div><div class="chain-desc">${buff.description || buff.scriptName || ""}</div></div>`;
        list.appendChild(item);
      });
    }

    // Replace phaseEnabled state usage — new key format: `${phase}_${propertyId}`
    function getPhaseEffectKey(phase, effect) {
      return `${phase.phase}_${effect.propertyId}`;
    }

    function renderPhasePassives() {
      const field = document.getElementById("phase-field"),
        sep = document.getElementById("phase-sep"),
        list = document.getElementById("phase-list");
      if (!currentHeroPhasePassives || !currentHeroPhasePassives.length) {
        field.style.display = sep.style.display = "none";
        return;
      }
      field.style.display = sep.style.display = "";
      list.innerHTML = "";

      currentHeroPhasePassives.forEach((phase) => {
        // Section label (non-clickable)
        const header = document.createElement("div");
        header.style.cssText =
          "font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.2);font-weight:700;padding:.3rem 0 .2rem;";
        header.textContent = phase.label;
        list.appendChild(header);

        // One row per effect
        phase.effects.forEach((effect) => {
          const key = getPhaseEffectKey(phase, effect);
          // Default to ON
          if (phaseEnabled[key] === undefined) phaseEnabled[key] = true;
          const isOn = phaseEnabled[key];

          const item = document.createElement("div");
          item.className = "chain-item" + (isOn ? " on" : "");
          const sign = effect.add >= 0 ? "+" : "";
          const pct = effect.isPercent ? "%" : "";
          item.innerHTML = `
        <div class="chain-check"></div>
        <div>
          <div class="chain-name">${effect.label}</div>
          <div class="chain-effect-pills"><span class="chain-pill">${sign}${effect.add}${pct}</span></div>
        </div>`;
          item.addEventListener("click", () => {
            phaseEnabled[key] = !phaseEnabled[key];
            renderPhasePassives();
            update();
          });
          list.appendChild(item);
        });
      });
    }

    // ── Render skill buffs ─────────────────────────────────────────────────────
    function renderSkillBuffs() {
      const field = document.getElementById("skill-buffs-field"),
        sep = document.getElementById("skill-buffs-sep"),
        list = document.getElementById("skill-buffs-list");
      const slot = document.getElementById("skill-select").value;
      const buffs = currentSkillMeta?.buffs || [];
      if (!buffs.length) {
        field.style.display = sep.style.display = "none";
        return;
      }
      field.style.display = sep.style.display = "";
      list.innerHTML = "";
      buffs.forEach((buff) => {
        const buffKey = `${slot}_${buff.statusId}`;
        const isOn = !!skillBuffEnabled[buffKey];
        const hasE = !buff.scripted && buff.maxLevelEffects?.length > 0;
        const item = document.createElement("div");
        item.className =
          "chain-item" +
          (isOn ? " on" : "") +
          (buff.scripted ? " no-effect" : "");
        const tLabel =
          buff.target === "enemy"
            ? "debuff → enemy"
            : buff.target === "self"
              ? "self buff"
              : "ally buff";
        let pills = "";
        if (hasE) {
          pills = buff.maxLevelEffects
            .map(
              (e) =>
                `<span class="chain-pill">${e.label} ${e.add >= 0 ? "+" : ""}${e.add}${e.isPercent ? "%" : ""}</span>`,
            )
            .join("");
          pills = `<div class="chain-effect-pills">${pills}</div>`;
        }
        item.innerHTML = `<div class="chain-check"></div><div><div class="chain-name">${buff.scripted ? "Scripted" : "[" + tLabel + "]"}</div>${buff.description ? `<div class="chain-desc">${buff.description}</div>` : ""}${pills}</div>`;
        if (!buff.scripted)
          item.addEventListener("click", () => {
            skillBuffEnabled[buffKey] = !skillBuffEnabled[buffKey];
            renderSkillBuffs();
            update();
          });
        list.appendChild(item);
      });
    }

    // ── Team panel ─────────────────────────────────────────────────────────────
    function initTeamGrid() {
      const grid = document.getElementById("team-grid");
      if (!grid) return; // Skip if team grid doesn't exist
      grid.innerHTML = "";
      for (let i = 0; i < MAX_TEAM; i++) {
        const card = document.createElement("div");
        card.className = "team-slot-card";
        card.id = `team-slot-${i}`;
        const opts =
          '<option value="">— none —</option>' +
          characterIndex
            .map((e) => `<option value="${e.file}">${e.name}</option>`)
            .join("");
        card.innerHTML = `<div class="team-slot-label">Teammate ${i + 1}</div><select class="team-char-select" id="team-select-${i}">${opts}</select><div class="team-char-buffs" id="team-buffs-${i}" style="display:none"></div>`;
        grid.appendChild(card);
        document
          .getElementById(`team-select-${i}`)
          .addEventListener("change", (e) =>
            loadTeamCharacter(i, e.target.value),
          );
      }
    }

    function makeBuffItem(
      name,
      effects,
      desc,
      isOn,
      onToggle,
      noEffect = false,
    ) {
      const item = document.createElement("div");
      item.className =
        "chain-item" + (isOn ? " on" : "") + (noEffect ? " no-effect" : "");
      const pills = (effects || [])
        .map(
          (e) =>
            `<span class="chain-pill">${e.label} ${e.add >= 0 ? "+" : ""}${e.add}${e.isPercent ? "%" : ""}</span>`,
        )
        .join("");
      item.innerHTML = `<div class="chain-check"></div><div style="min-width:0;flex:1"><div class="chain-name">${name}</div>${desc ? `<div class="chain-desc">${desc}</div>` : ""} ${pills ? `<div class="chain-effect-pills">${pills}</div>` : ""}</div>`;
      if (!noEffect && onToggle) item.addEventListener("click", onToggle);
      return item;
    }

    function renderTeamSlot(slotIdx) {
      const slot = teamSlots[slotIdx],
        buffsEl = document.getElementById(`team-buffs-${slotIdx}`);
      if (!buffsEl) return;
      if (!slot.data) {
        buffsEl.style.display = "none";
        buffsEl.innerHTML = "";
        return;
      }
      buffsEl.style.display = "";
      buffsEl.innerHTML = "";
      const d = slot.data;

      function addSection(label, items) {
        if (!items.length) return;
        const sec = document.createElement("div");
        sec.className = "team-buff-section";
        sec.innerHTML = `<div class="team-buff-section-label">${label}</div>`;
        items.forEach((el) => sec.appendChild(el));
        buffsEl.appendChild(sec);
      }

      // Characteristic
      // Replace the characteristic addSection block:
      const charSkill = d.skills?.characteristic;
      const charBuffs = (charSkill?.buffs || []).filter(
        (b) => !b.scripted && b.maxLevelEffects?.length > 0,
      );
      const charItems = [];
      charBuffs.forEach((buff) => {
        buff.maxLevelEffects.forEach((effect) => {
          const key = `char_${buff.statusId}_${effect.propertyId}`;
          if (slot.charEffectsEnabled[key] === undefined)
            slot.charEffectsEnabled[key] = true;
          const isOn = slot.charEffectsEnabled[key];
          const sign = effect.add >= 0 ? "+" : "";
          const pct = effect.isPercent ? "%" : "";
          charItems.push(
            makeBuffItem(effect.label, [effect], buff.description, isOn, () => {
              slot.charEffectsEnabled[key] = !slot.charEffectsEnabled[key];
              renderTeamSlot(slotIdx);
              update();
            }),
          );
        });
      });
      addSection("Characteristic", charItems);

      // Shackles
      addSection(
        "Shackles",
        (d.chains || [])
          .filter((c) => c.effects?.length > 0)
          .map((chain) =>
            makeBuffItem(
              chain.name,
              chain.effects,
              chain.description,
              !!slot.chainEnabled[chain.id],
              () => {
                slot.chainEnabled[chain.id] = !slot.chainEnabled[chain.id];
                renderTeamSlot(slotIdx);
                update();
              },
            ),
          ),
      );

      // Phase passives
      const phaseItems = [];
      (d.phasePassives || []).forEach((phase) => {
        phase.effects.forEach((effect) => {
          const key = `${phase.phase}_${effect.propertyId}`;
          if (slot.phaseEnabled[key] === undefined)
            slot.phaseEnabled[key] = true;
          const isOn = slot.phaseEnabled[key];
          phaseItems.push(
            makeBuffItem(
              `${phase.label} — ${effect.label}`,
              [effect],
              "",
              isOn,
              () => {
                slot.phaseEnabled[key] = !slot.phaseEnabled[key];
                renderTeamSlot(slotIdx);
                update();
              },
            ),
          );
        });
      });
      addSection("Phase Passives", phaseItems);

      // Skill buffs (ally/self, non-scripted, with useful calcCat)
      const skillItems = [];
      Object.entries(d.skills || {}).forEach(([ss, sk]) => {
        if (ss === "characteristic") return;
        (sk.buffs || []).forEach((buff) => {
          if (buff.scripted) return;
          if (buff.target !== "ally" && buff.target !== "self") return;
          const useful = (buff.maxLevelEffects || []).filter(
            (e) => !e.statScreen && e.calcCat,
          );
          if (!useful.length) return;
          const k = `${ss}_${buff.statusId}`;
          skillItems.push(
            makeBuffItem(
              sk.name || SKILL_SLOT_LABELS[ss] || ss,
              useful,
              buff.description,
              !!slot.skillBuffEnabled[k],
              () => {
                slot.skillBuffEnabled[k] = !slot.skillBuffEnabled[k];
                renderTeamSlot(slotIdx);
                update();
              },
            ),
          );
        });
      });
      addSection("Skill Buffs", skillItems);

      // Scripted info
      const scriptedItems = [];
      Object.entries(d.skills || {}).forEach(([ss, sk]) => {
        (sk.buffs || []).forEach((buff) => {
          if (!buff.scripted) return;
          if (buff.target !== "ally" && buff.target !== "self") return;
          scriptedItems.push(
            makeBuffItem(
              sk.name || ss,
              [],
              buff.description,
              false,
              null,
              true,
            ),
          );
        });
      });
      addSection("Scripted Effects (info)", scriptedItems);

      if (!buffsEl.children.length)
        buffsEl.innerHTML =
          '<div class="team-empty-hint">no extractable buffs</div>';
    }

    // ── Skill ──────────────────────────────────────────────────────────────────
    function applySelectedSkill() {
      const slot = document.getElementById("skill-select").value;
      if (!currentHeroSkills || !slot) return;
      const skill = currentHeroSkills[slot];
      if (!skill) return;
      currentSkillMeta = skill;
      skillBuffEnabled = {};

      const typeMap = {
        normalAttack: "normal",
        ultimate: "ultimate",
        skill1: "skill",
        passive: "skill",
        exclusive: "skill",
        extra1: "normal",
        extra2: "normal",
        extra3: "normal",
        extra4: "normal",
        extra5: "normal",
        extra6: "normal",
        extra7: "normal",
      };
      skillType = typeMap[slot] || "any";
      document
        .querySelectorAll("#skill-type-seg .seg-btn")
        .forEach((b) => b.classList.toggle("on", b.dataset.st === skillType));
      document.getElementById("skill-type-note").textContent =
        {
          normal:
            "Normal Attack Damage Bonus applies · Skill Damage Bonus does not",
          skill:
            "Skill Damage Bonus applies · Normal Attack Damage Bonus does not",
          ultimate:
            "Skill Damage Bonus applies · Normal Attack Damage Bonus does not",
          any: "All damage bonus types apply",
        }[skillType] || "";

      const coefs = skill.coefs || [];
      const lv = document.getElementById("skillLv");
      lv.max = coefs.length > 0 ? coefs.length : 10;
      lv.value = lv.max;
      document.getElementById("skill-lv-v").textContent = lv.value;
      updateSkillCoef();
      renderSkillBuffs();
    }

    function updateSkillCoef() {
      const slot = document.getElementById("skill-select").value;
      if (!currentHeroSkills || !slot) return;
      const skill = currentHeroSkills[slot];
      if (!skill || !skill.coefs || !skill.coefs.length) return;
      const lv = parseInt(document.getElementById("skillLv").value);
      const coef = skill.coefs[Math.min(lv - 1, skill.coefs.length - 1)];
      if (coef != null)
        document.getElementById("skillCo").value = Math.round(coef * 10) / 10;
      document.getElementById("skill-lv-v").textContent = lv;
      update();
    }

    // ── Effect getters ─────────────────────────────────────────────────────────
    function getChainAtkPct() {
      if (!currentHeroChains) return 0;
      let t = 0;
      currentHeroChains.forEach((c) => {
        if (!chainEnabled[c.id]) return;
        (c.effects || []).forEach((e) => {
          if (e.key === "atk" && e.isPercent) t += e.add;
        });
      });
      return t;
    }
    function getChainAtkFlat() {
      if (!currentHeroChains) return 0;
      let t = 0;
      currentHeroChains.forEach((c) => {
        if (!chainEnabled[c.id]) return;
        (c.effects || []).forEach((e) => {
          if (e.key === "atk" && !e.isPercent) t += e.add;
        });
      });
      return t;
    }
    function getChainMults() {
      if (!currentHeroChains) return [];
      const out = [];
      currentHeroChains.forEach((c) => {
        if (!chainEnabled[c.id]) return;
        (c.effects || []).forEach((e) => {
          if (!e.statScreen && e.calcCat)
            out.push({ cat: e.calcCat, val: e.add });
        });
      });
      return out;
    }
    function getCharAtkPct() {
      let t = 0;
      (currentHeroSkills?.characteristic?.buffs || []).forEach((b) => {
        (b.maxLevelEffects || []).forEach((e) => {
          const key = getCharEffectKey(b.statusId, e.propertyId);
          if (charEffectsEnabled[key] === false) return;
          if (e.key === "atk" && e.isPercent) t += e.add;
        });
      });
      return t;
    }

    function getCharMults() {
      const out = [];
      (currentHeroSkills?.characteristic?.buffs || []).forEach((b) => {
        (b.maxLevelEffects || []).forEach((e) => {
          const key = getCharEffectKey(b.statusId, e.propertyId);
          if (charEffectsEnabled[key] === false) return;
          if (!e.statScreen && e.calcCat)
            out.push({ cat: e.calcCat, val: e.add });
        });
      });
      return out;
    }
    function getPhaseAtkPct() {
      if (!currentHeroPhasePassives) return 0;
      let t = 0;
      currentHeroPhasePassives.forEach((p) => {
        p.effects.forEach((e) => {
          const key = `${p.phase}_${e.propertyId}`;
          if (phaseEnabled[key] === false) return;
          if (e.key === "atk" && e.isPercent) t += e.add;
        });
      });
      return t;
    }

    function getPhaseMults() {
      if (!currentHeroPhasePassives) return [];
      const out = [];
      currentHeroPhasePassives.forEach((p) => {
        p.effects.forEach((e) => {
          const key = `${p.phase}_${e.propertyId}`;
          if (phaseEnabled[key] === false) return;
          if (!e.statScreen && e.calcCat)
            out.push({ cat: e.calcCat, val: e.add });
        });
      });
      return out;
    }
    function getSkillBuffMults() {
      if (!currentSkillMeta) return [];
      const slot = document.getElementById("skill-select").value;
      const out = [];
      (currentSkillMeta.buffs || []).forEach((buff) => {
        if (buff.scripted) return;
        const k = `${slot}_${buff.statusId}`;
        if (!skillBuffEnabled[k]) return;
        (buff.maxLevelEffects || []).forEach((e) => {
          if (!e.statScreen && e.calcCat)
            out.push({ cat: e.calcCat, val: e.add });
        });
      });
      return out;
    }
    function getTeamAtkPct() {
      let t = 0;
      teamSlots.forEach((slot) => {
        if (!slot.data) return;
        const d = slot.data;
        // characteristic — per-effect key
        (d.skills?.characteristic?.buffs || []).forEach((b) => {
          (b.maxLevelEffects || []).forEach((e) => {
            const key = `char_${b.statusId}_${e.propertyId}`;
            if (slot.charEffectsEnabled?.[key] === false) return;
            if (e.key === "atk" && e.isPercent) t += e.add;
          });
        });
        // chains
        (d.chains || []).forEach((c) => {
          if (!slot.chainEnabled[c.id]) return;
          (c.effects || []).forEach((e) => {
            if (e.key === "atk" && e.isPercent) t += e.add;
          });
        });
        // phase passives — per-effect key
        (d.phasePassives || []).forEach((p) => {
          p.effects.forEach((e) => {
            const key = `${p.phase}_${e.propertyId}`;
            if (slot.phaseEnabled?.[key] === false) return;
            if (e.key === "atk" && e.isPercent) t += e.add;
          });
        });
        // skill buffs
        Object.entries(d.skills || {}).forEach(([ss, sk]) => {
          (sk.buffs || []).forEach((buff) => {
            if (buff.scripted) return;
            const k = `${ss}_${buff.statusId}`;
            if (!slot.skillBuffEnabled[k]) return;
            (buff.maxLevelEffects || []).forEach((e) => {
              if (e.key === "atk" && e.isPercent) t += e.add;
            });
          });
        });
      });
      return t;
    }

    function getTeamMults() {
      const out = [];
      teamSlots.forEach((slot) => {
        if (!slot.data) return;
        const d = slot.data;
        (d.skills?.characteristic?.buffs || []).forEach((b) => {
          (b.maxLevelEffects || []).forEach((e) => {
            const key = `char_${b.statusId}_${e.propertyId}`;
            if (slot.charEffectsEnabled?.[key] === false) return;
            if (!e.statScreen && e.calcCat)
              out.push({ cat: e.calcCat, val: e.add });
          });
        });
        (d.chains || []).forEach((c) => {
          if (!slot.chainEnabled[c.id]) return;
          (c.effects || []).forEach((e) => {
            if (!e.statScreen && e.calcCat)
              out.push({ cat: e.calcCat, val: e.add });
          });
        });
        (d.phasePassives || []).forEach((p) => {
          p.effects.forEach((e) => {
            const key = `${p.phase}_${e.propertyId}`;
            if (slot.phaseEnabled?.[key] === false) return;
            if (!e.statScreen && e.calcCat)
              out.push({ cat: e.calcCat, val: e.add });
          });
        });
        Object.entries(d.skills || {}).forEach(([ss, sk]) => {
          (sk.buffs || []).forEach((buff) => {
            if (buff.scripted) return;
            const k = `${ss}_${buff.statusId}`;
            if (!slot.skillBuffEnabled[k]) return;
            (buff.maxLevelEffects || []).forEach((e) => {
              if (!e.statScreen && e.calcCat)
                out.push({ cat: e.calcCat, val: e.add });
            });
          });
        });
      });
      return out;
    }

    // ── Multiplier categories ──────────────────────────────────────────────────
    const CAT_KEYS = [
      "Damage Bonus (general)",
      "Normal Attack Damage Bonus",
      "Skill Damage Bonus",
      "Physical Damage Bonus",
      "Magic Damage Bonus",
      "True Damage Bonus",
      "Breaking Damage Bonus",
      "Bonus vs Boss",
      "Bonus vs Elite",
      "No Weakness Damage Bonus",
      "Summon Damage Bonus",
      "Summon Normal Attack Damage Bonus",
      "Bleed Damage Bonus",
      "Electric Damage Bonus",
      "Burning Damage Bonus",
      "Blades Damage Bonus",
      "Flaw Legacy Damage Bonus",
      "Enemy takes more damage",
      "Enemy takes more physical damage",
      "Enemy takes more magic damage",
      "Custom",
    ];
    let multipliers = [];

    function calcChain(dt) {
      const groups = {};
      const coreBroken = document.getElementById("coreBroken").checked;
      const isBoss = document.getElementById("isBoss").checked;
      const isElite = document.getElementById("isElite").checked;
      const isSummon = currentSkillMeta?.isSummonSkill || false;

      multipliers.forEach((m) => {
        if (!m.on) return;
        const c = m.cat;
        if (isSummon) {
          if (
            c === "Normal Attack Damage Bonus" ||
            c === "Skill Damage Bonus" ||
            c === "Damage Bonus (general)"
          )
            return;
          if (
            c === "Summon Normal Attack Damage Bonus" &&
            skillType !== "normal"
          )
            return;
        } else {
          if (
            c === "Summon Damage Bonus" ||
            c === "Summon Normal Attack Damage Bonus"
          )
            return;
          if (c === "Normal Attack Damage Bonus" && skillType !== "normal")
            return;
          if (
            c === "Skill Damage Bonus" &&
            (skillType === "normal" || skillType === "any")
          )
            return;
        }
        if (c === "Physical Damage Bonus" && dt !== "AD") return;
        if (c === "Magic Damage Bonus" && dt !== "AP") return;
        if (c === "True Damage Bonus" && dt !== "TD") return;
        if (c === "Breaking Damage Bonus" && !coreBroken) return;
        if (c === "Bonus vs Boss" && !isBoss) return;
        if (c === "Bonus vs Elite" && !isElite) return;
        groups[c] = (groups[c] || 0) + m.val;
      });

      const addAll = (effects) =>
        effects.forEach(({ cat, val }) => {
          groups[cat] = (groups[cat] || 0) + val;
        });
      addAll(getChainMults());
      addAll(getCharMults());
      addAll(getPhaseMults());
      addAll(getSkillBuffMults());
      addAll(getTeamMults());

      const tdr = parseFloat(document.getElementById("takeDmgRate").value) || 0;
      const tpdr =
        parseFloat(document.getElementById("takePDmgRate").value) || 0;
      const tmdr =
        parseFloat(document.getElementById("takeMDmgRate").value) || 0;
      if (tdr > 0)
        groups["Enemy takes more damage"] =
          (groups["Enemy takes more damage"] || 0) + tdr;
      if (tpdr > 0 && dt === "AD")
        groups["Enemy takes more physical damage"] =
          (groups["Enemy takes more physical damage"] || 0) + tpdr;
      if (tmdr > 0 && dt === "AP")
        groups["Enemy takes more magic damage"] =
          (groups["Enemy takes more magic damage"] || 0) + tmdr;

      let total = 1;
      const catList = [];
      Object.entries(groups).forEach(([cat, sum]) => {
        const f = 1 + sum / 100;
        total *= f;
        catList.push({ cat, sum, factor: f });
      });
      return { total, catList };
    }

    function renderMults() {
      const c = document.getElementById("mult-container");
      const byCat = {};
      multipliers.forEach((m, i) => {
        if (!byCat[m.cat]) byCat[m.cat] = [];
        byCat[m.cat].push({ ...m, i });
      });
      let html = "";
      if (!multipliers.length) {
        html +=
          '<div style="font-size:.75rem;color:rgba(255,255,255,0.2);padding:.5rem 0;font-style:italic">No bonuses added yet.</div>';
      } else {
        Object.entries(byCat).forEach(([cat, items]) => {
          const sum = items.filter((m) => m.on).reduce((a, m) => a + m.val, 0);
          html += `<div class="mult-section"><div class="mult-cat-label"><span>${cat}</span>${sum > 0 ? `<span class="cat-fx">×${(1 + sum / 100).toFixed(3)}</span>` : ""}</div><div class="tags">`;
          items.forEach((m) => {
            html += `<div class="tag ${m.on ? "on" : ""}" data-idx="${m.i}">${m.name} <span style="opacity:.5">+${m.val}%</span><span class="tx" data-remove="${m.i}">✕</span></div>`;
          });
          html += `</div></div>`;
        });
        html += '<div class="sep"></div>';
      }
      html += `<div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.2);margin-bottom:.5rem;font-weight:700">Add a bonus</div>
        <div class="add-tag-row">
          <input type="text" id="new-mult-name" placeholder="e.g. Mania Intensify +10%">
          <input type="number" id="new-mult-val" placeholder="%" value="10" min="0">
          <select id="new-mult-cat">${CAT_KEYS.map((k) => `<option value="${k}">${k}</option>`).join("")}</select>
          <button class="add-tag-btn" id="add-mult-btn">+ Add</button>
        </div>`;
      c.innerHTML = html;
      c.querySelectorAll(".tag").forEach((t) => {
        t.addEventListener("click", (e) => {
          if (e.target.dataset.remove !== undefined) return;
          multipliers[+t.dataset.idx].on = !multipliers[+t.dataset.idx].on;
          renderMults();
          update();
        });
      });
      c.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          multipliers.splice(+btn.dataset.remove, 1);
          renderMults();
          update();
        });
      });
      document.getElementById("add-mult-btn")?.addEventListener("click", () => {
        const name =
          document.getElementById("new-mult-name").value.trim() || "Bonus";
        const val =
          parseFloat(document.getElementById("new-mult-val").value) || 0;
        const cat = document.getElementById("new-mult-cat").value;
        multipliers.push({ name, val, cat, on: true });
        renderMults();
        update();
      });
    }

    function setDT(type) {
      damageType = type;
      ["AP", "AD", "TD"].forEach((t) =>
        document
          .getElementById("dt-" + t.toLowerCase())
          .classList.toggle("on", type === t),
      );
      update();
    }

    const fmt = (n, d = 2) =>
      typeof n === "number"
        ? n.toLocaleString("en-US", { maximumFractionDigits: d })
        : n;
    const fmti = (n) => Math.floor(Math.max(1, n)).toLocaleString("en-US");
    const S = (id) => document.getElementById(id);

    function update() {
      const level = parseInt(S("level").value),
        monLv = parseInt(S("monLv").value);
      const skillCo = (parseFloat(S("skillCo").value) || 100) / 100;
      const isCrit = S("isCrit").checked,
        critB = parseInt(S("critB").value) / 100;
      const penPct = parseFloat(S("penPct").value) || 0,
        penFlat = parseFloat(S("penFlat").value) || 0;
      const compAtk = parseFloat(S("complianceAtk").value) || 0;
      const override = S("statAtkOverride").value;
      const atkPct =
        (parseFloat(S("atkPct").value) || 0) +
        getChainAtkPct() +
        getCharAtkPct() +
        getPhaseAtkPct() +
        getTeamAtkPct();

      S("lv-v").textContent = level;
      S("ml-v").textContent = monLv;
      S("cb-v").textContent = Math.round(critB * 100) + "%";

      const baseAtkCalc = heroBaseAtk
        ? calcHeroBaseAtk(heroBaseAtk, level, grade)
        : null;
      const statAtk =
        override && override !== ""
          ? parseFloat(override)
          : baseAtkCalc !== null
            ? baseAtkCalc + compAtk + getChainAtkFlat()
            : 0;
      const combatAtk = statAtk * (1 + atkPct / 100);

      S("strip-base").textContent =
        baseAtkCalc !== null ? fmt(baseAtkCalc, 0) : "—";
      S("strip-combat").textContent = statAtk > 0 ? fmt(combatAtk, 2) : "—";

      const baseArmor = parseFloat(S("baseArmor").value) || 0,
        baseMR = parseFloat(S("baseMR").value) || 0;
      const baseDef =
        damageType === "AP" ? baseMR : damageType === "AD" ? baseArmor : 0;
      const scaledDef = damageType === "TD" ? 0 : monStat(baseDef, monLv);
      const effDef =
        damageType === "TD"
          ? 0
          : Math.max(0, scaledDef * (1 - penPct / 100) - penFlat);

      S("scaled-def-val").textContent = fmt(scaledDef, 0);
      S("eff-def-val").textContent = fmt(effDef, 1);

      if (statAtk <= 0) {
        ["o-hit", "o-raw", "o-crit", "o-floor"].forEach(
          (id) => (S(id).textContent = "—"),
        );
        S("o-floor-sub").textContent = "load a hero or enter ATK override";
        S("bdown").innerHTML =
          S("chain-cats").innerHTML =
          S("chain-eq").innerHTML =
            "";
        return;
      }

      const atkA = combatAtk - effDef,
        atkB = combatAtk * MIN_ATK;
      const floorActive = atkA < atkB,
        pre = Math.max(atkA, atkB);
      const { total: mult, catList } = calcChain(damageType);
      const raw = pre * skillCo * mult,
        rawCrit = raw * critB,
        hit = isCrit ? rawCrit : raw;

      S("o-hit").textContent = fmti(hit);
      S("o-co").textContent = "coef " + Math.round(skillCo * 100) + "%";
      S("o-raw").textContent = raw.toFixed(3);
      S("o-crit").textContent = fmti(rawCrit);
      S("o-cn").textContent = "×" + critB.toFixed(2);
      S("o-floor").textContent = floorActive ? "YES" : "NO";
      S("o-floor-sub").textContent = floorActive
        ? "min = atk×0.05 = " + atkB.toFixed(1)
        : "pre = " + atkA.toFixed(1);

      const [lr, gr] = monRatios(monLv);
      const rows = [
        ["Stat-screen ATK", fmt(statAtk, 1), "white"],
        ["In-battle ATK% (total)", "+" + atkPct.toFixed(1) + "%", ""],
        ["Combat ATK", fmt(combatAtk, 2), "red"],
        ["Skill coefficient", Math.round(skillCo * 100) + "%", ""],
        ["base = atk × coef", fmt(combatAtk * skillCo, 2), ""],
        [
          "Damage type",
          damageType === "AP"
            ? "Magic (vs MagRes)"
            : damageType === "AD"
              ? "Physical (vs Armor)"
              : "True",
          "",
        ],
        ["Base enemy defense", fmt(baseDef, 0), "dim"],
        ["Monster level ratio", (lr * 100).toFixed(2) + "%", "dim"],
        ["Monster grade revision", (gr * 100).toFixed(2) + "%", "dim"],
        ["Scaled defense", fmt(scaledDef, 0), "white"],
        ["Pen % removed", fmt(scaledDef * (penPct / 100), 1), ""],
        ["Flat pen removed", fmt(penFlat, 0), ""],
        ["Effective defense", fmt(effDef, 1), "white"],
        ["pre = max(atk−def, atk×0.05)", fmt(pre, 2), "red"],
        [
          "MIN floor active?",
          floorActive ? "YES" : "no",
          floorActive ? "red" : "dim",
        ],
        ["Total multiplier", (mult * 100).toFixed(2) + "%", "lit"],
        ["Hit (no crit)", fmti(raw), "red"],
        ["Hit (crit)", fmti(rawCrit), "lit"],
      ];
      const h = Math.ceil(rows.length / 2);
      let l = "",
        r = "";
      rows.forEach(([k, v, c], i) => {
        const row = `<div class="brow"><span class="bk">${k}</span><span class="bv ${c}">${v}</span></div>`;
        if (i < h) l += row;
        else r += row;
      });
      S("bdown").innerHTML = `<div>${l}</div><div>${r}</div>`;

      let cats = "",
        eq = `<span style="color:rgba(255,255,255,0.2)">pre × coef</span>`;
      catList.forEach(({ cat, sum, factor }) => {
        cats += `<div class="chain-cat"><div class="cn">${cat}</div><div class="cv">+${sum.toFixed(1)}% → ×${factor.toFixed(3)}</div></div>`;
        eq += ` <span style="color:rgba(255,255,255,0.2)">×</span> <span style="color:#ff6b6b">${factor.toFixed(3)}</span>`;
      });
      if (isCrit)
        eq += ` <span style="color:rgba(255,255,255,0.2)">×</span> <span style="color:#ff4444">CRIT(${critB.toFixed(2)})</span>`;
      eq += ` <span style="color:rgba(255,255,255,0.2)">=</span> <span style="color:#ff4444">${raw.toFixed(3)}</span> <span style="color:rgba(255,255,255,0.2)">→ floor →</span> <span style="color:#ff4444">${fmti(raw)}</span>`;
      S("chain-cats").innerHTML =
        cats ||
        '<span style="color:rgba(255,255,255,0.2);font-size:.7rem">no bonuses active</span>';
      S("chain-eq").innerHTML = eq;
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    function switchTab(tabName) {
      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
      });
      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("on");
      });
      const tabEl = document.querySelector(
        `.tab-content[data-tab="${tabName}"]`,
      );
      const btnEl = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
      if (tabEl) tabEl.classList.add("active");
      if (btnEl) btnEl.classList.add("on");
    }

    // Initialize tabs — use DOMContentLoaded
    function initTabs() {
      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
      });
      switchTab("damage");
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initTabs);
    } else {
      initTabs();
    }

    // ── Init ───────────────────────────────────────────────────────────────────
    renderMults();
    loadIndex();

    document.querySelectorAll("#boss-presets .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll("#boss-presets .seg-btn")
          .forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        S("baseArmor").value = b.dataset.armor;
        S("baseMR").value = b.dataset.mr;
        S("mon-badge").textContent = b.textContent.trim();
        S("boss-hint").textContent =
          {
            "Rancor Desire": "Physical (high armor, low MR) — use Magic damage",
            "Apostle of Stardust":
              "Magic (low armor, high MR) — use Physical damage",
            "Alchemic Beast": "S rank in both — tough regardless",
          }[b.textContent.trim()] || "";
        setDT(b.dataset.dt);
        update();
      }),
    );

    document.getElementById("hero-select").addEventListener("change", (e) => {
      if (e.target.value) loadCharacterFile(e.target.value);
    });
    document.getElementById("skill-select").addEventListener("change", () => {
      applySelectedSkill();
      update();
    });
    document
      .getElementById("skillLv")
      .addEventListener("input", updateSkillCoef);

    document.querySelectorAll("#grade-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll("#grade-seg .seg-btn")
          .forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        grade = +b.dataset.g;
        update();
      }),
    );

    document.querySelectorAll("#skill-type-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll("#skill-type-seg .seg-btn")
          .forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        skillType = b.dataset.st;
        S("skill-type-note").textContent =
          {
            normal:
              "Normal Attack Damage Bonus applies · Skill Damage Bonus does not",
            skill:
              "Skill Damage Bonus applies · Normal Attack Damage Bonus does not",
            ultimate:
              "Skill Damage Bonus applies · Normal Attack Damage Bonus does not",
            any: "All damage bonus types apply",
          }[skillType] || "";
        update();
      }),
    );

    document.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    update();

    /* ── Attack Speed Calculator ──────────────────────────────────────────── */
    (function () {
      /* ── constants ─────────────────────────────────────── */
      const RATE = 15;

      /* ── helpers ───────────────────────────────────────── */
      function frames(spd) {
        return Math.ceil(RATE / spd);
      }
      function breakpoint(n) {
        return RATE / n;
      }
      function r(n, d = 4) {
        return parseFloat(n.toFixed(d));
      }
      function pct(n, d = 2) {
        return r(n, d) + "%";
      }

      /* ── multi-entry state ─────────────────────────────── */
      const asBonuses = []; // { name, val, on }
      const asFlats = []; // { name, val, on }

      /* ── help modal ────────────────────────────────────── */
      const modal = document.getElementById("as-help-modal");
      const helpBtn = document.getElementById("as-help-btn");
      const closeBtn = document.getElementById("as-help-close");

      helpBtn?.addEventListener("click", () => {
        modal.style.display = "flex";
        document.querySelector(".calculator-page").classList.add("modal-open");
      });

      closeBtn?.addEventListener("click", () => {
        modal.style.display = "none";
        document.querySelector(".calculator-page").classList.remove("modal-open");
      });

      modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
          document.querySelector(".calculator-page").classList.remove("modal-open");
        }
      });

      /* ── renderers ─────────────────────────────────────── */
      function renderBonuses() {
        const c = document.getElementById("as-bonus-container");
        let html = "";
        html += `<div class="add-tag-row" style="margin-bottom:.3rem">
          <input type="text" class="as-bonus-name" placeholder="label (e.g. CB 5%)" style="flex:1;min-width:60px">
          <input type="number" class="as-bonus-val" placeholder="%" value="10" min="0" step="0.1" style="width:55px">
          <button class="add-tag-btn as-add-bonus-btn">+ Add</button>
        </div>`;
        html += `<div class="tags">`;
        asBonuses.forEach((m, i) => {
          html += `<div class="tag ${m.on ? "on" : ""}" data-idx="${i}">${m.name} <span style="opacity:.5">+${m.val}%</span><span class="tx" data-remove-bonus="${i}">X</span></div>`;
        });
        html += `</div>`;
        c.innerHTML = html;

        c.querySelectorAll(".tag").forEach((t) => {
          t.addEventListener("click", (e) => {
            if (e.target.dataset.removeBonus !== undefined) return;
            asBonuses[+t.dataset.idx].on = !asBonuses[+t.dataset.idx].on;
            renderBonuses();
            asUpdate();
          });
        });
        c.querySelectorAll("[data-remove-bonus]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            asBonuses.splice(+btn.dataset.removeBonus, 1);
            renderBonuses();
            asUpdate();
          });
        });
        c.querySelector(".as-add-bonus-btn")?.addEventListener("click", () => {
          const name =
            c.querySelector(".as-bonus-name").value.trim() || "Bonus";
          const val = parseFloat(c.querySelector(".as-bonus-val").value) || 0;
          asBonuses.push({ name, val, on: true });
          renderBonuses();
          asUpdate();
        });
      }

      function renderFlats() {
        const c = document.getElementById("as-flat-container");
        let html = "";
        html += `<div class="add-tag-row" style="margin-bottom:.3rem">
          <input type="text" class="as-flat-name" placeholder="label" style="flex:1;min-width:60px">
          <input type="number" class="as-flat-val" placeholder="flat" value="0.1" min="0" step="0.01" style="width:55px">
          <button class="add-tag-btn as-add-flat-btn">+ Add</button>
        </div>`;
        html += `<div class="tags">`;
        asFlats.forEach((m, i) => {
          html += `<div class="tag ${m.on ? "on" : ""}" data-idx="${i}">${m.name} <span style="opacity:.5">+${m.val}</span><span class="tx" data-remove-flat="${i}">X</span></div>`;
        });
        html += `</div>`;
        c.innerHTML = html;

        c.querySelectorAll(".tag").forEach((t) => {
          t.addEventListener("click", (e) => {
            if (e.target.dataset.removeFlat !== undefined) return;
            asFlats[+t.dataset.idx].on = !asFlats[+t.dataset.idx].on;
            renderFlats();
            asUpdate();
          });
        });
        c.querySelectorAll("[data-remove-flat]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            asFlats.splice(+btn.dataset.removeFlat, 1);
            renderFlats();
            asUpdate();
          });
        });
        c.querySelector(".as-add-flat-btn")?.addEventListener("click", () => {
          const name = c.querySelector(".as-flat-name").value.trim() || "Flat";
          const val = parseFloat(c.querySelector(".as-flat-val").value) || 0;
          asFlats.push({ name, val, on: true });
          renderFlats();
          asUpdate();
        });
      }

      /* ── aggregate ──────────────────────────────────────── */
      function totalBonus() {
        return asBonuses.filter((m) => m.on).reduce((s, m) => s + m.val, 0);
      }
      function totalFlat() {
        return asFlats.filter((m) => m.on).reduce((s, m) => s + m.val, 0);
      }

      /* ── main update ───────────────────────────────────── */
      function asUpdate() {
        const base = parseFloat(document.getElementById("as-base").value) || 1;
        const bonus = totalBonus();
        const flat = totalFlat();
        const checkVal =
          parseFloat(document.getElementById("as-check").value) || 0;

        const speed = base + bonus / 100 + flat;
        const f = frames(speed);
        const bp = breakpoint(f);
        const bpNext = f > 1 ? breakpoint(f - 1) : null;

        const ratio = RATE / speed;
        isExactBreakpoint = ratio === Math.floor(ratio);
        /* clear hint */
        const noteEl = document.getElementById("as-base-note");
        noteEl.textContent = "";

        /* strip */
        document.getElementById("as-final").textContent = r(speed, 4);
        document.getElementById("as-frames").textContent =
          f + (f === 1 ? " frame" : " frames");

        /* current breakpoint box */
        const effBase = base + flat;
        const bonusNeeded = r((bpNext - base - flat) * 100 - bonus, 5);  

        document.getElementById("as-bp-current").innerHTML = `
          <div class="as-current-box">
            <div class="as-box-item">
              <div class="as-box-lbl">Frames / attack</div>
              <div class="as-box-val red">${f}</div>
            </div>

            <div class="as-box-item">
              <div class="as-box-lbl">Breakpoint min speed</div>
              <div class="as-box-val">${r(bp, 4)}</div>
            </div>
            ${
              bpNext !== null
                ? `
            <div class="as-box-item">
              <div class="as-box-lbl">Next breakpoint</div>
              <div class="as-box-val amber">${r(bpNext, 4)}</div>
            </div>
            <div class="as-box-item">
              <div class="as-box-lbl">Bonus needed</div>
              <div class="as-box-val amber">+${bonusNeeded}%</div>
            </div>`
                : `
            <div class="as-box-item">
              <div class="as-box-lbl">Next breakpoint</div>
              <div class="as-box-val" style="color:rgba(255,255,255,.3)">max tier</div>
            </div>`
            }
          </div>`;

        /* worth-it checker */
        if (bpNext !== null) {
          const newSpeed = base + ((bonus + checkVal) / 100) + flat;
          const newFrames = frames(newSpeed);
          const pushes = newFrames < f;
          const howManyTiers = f - newFrames;
          document.getElementById("as-check-result").innerHTML = `
            <div class="as-check-box ${pushes ? "yes" : "no"}">
              <div class="as-box-lbl">Adding +${r(checkVal, 2)}%</div>
              <div class="result-line">${
                pushes
                  ? `Yes — drops to ${newFrames} frame${newFrames > 1 ? "s" : ""} (+${howManyTiers} tier${howManyTiers > 1 ? "s" : ""})`
                  : `No — still at ${f} frames`
              }</div>
              <div class="detail-line">${
                pushes
                  ? `New speed: ${r(newSpeed, 4)} ≥ ${r(bpNext, 4)}`
                  : `Need +${bonusNeeded}%, have +${r(checkVal, 2)}% (short by ${r(bonusNeeded - checkVal, 5)}%)`
              }</div>
            </div>`;
        } else {
          document.getElementById("as-check-result").innerHTML = `
            <div class="as-check-box no">
              <div class="as-box-lbl">Adding +${r(checkVal, 2)}%</div>
              <div class="result-line">Already at max tier (1 frame)</div>
              <div class="detail-line">no further breakpoints</div>
            </div>`;
        }

        /* nearby breakpoints list */
        const SHOW = 4;
        let html = "";
        for (let i = f + SHOW; i >= Math.max(f - SHOW, 1); i--) {
          const thr = breakpoint(i);
          const isCur = i === f;
          const isNext = bpNext !== null && i === f - 1;
          const prog = Math.min(speed / thr, 1) * 100;
          const neededHere =
            !isCur && thr > speed
              ? r((thr - base - flat) * 100 - bonus, 5)
              : null;
          const labelTxt = isCur
            ? "✓ current"
            : neededHere !== null
              ? `need +${neededHere}%`
              : "passed";
          html += `
            <div class="as-bp-row ${isCur ? "as-current" : ""} ${isNext ? "as-next" : ""}">
              <div class="as-bp-frames">${i} frame${i > 1 ? "s" : ""}</div>
              <div class="as-bp-thresh">≥ ${r(thr, 4)}</div>
              <div class="as-bp-track"><div class="as-bp-fill" style="width:${r(prog, 1)}%"></div></div>
              <div class="as-bp-label">${labelTxt}</div>
            </div>`;
        }
        document.getElementById("as-bp-list").innerHTML = html;

        /* keep attacks-over-time in sync */
        renderAttackCount();
      }

      /* ── listeners ─────────────────────────────────────── */
      document.getElementById("as-base").addEventListener("input", asUpdate);
      document.getElementById("as-check").addEventListener("input", asUpdate);

      renderBonuses();
      renderFlats();
      asUpdate();

      /* ── attacks over time ────────────────────────────── */
      function renderAttackCount() {
        const mins =
          parseFloat(document.getElementById("as-attack-minutes").value) || 0;
        const secs =
          parseFloat(document.getElementById("as-attack-seconds").value) || 0;
        const totalSecs = mins * 60 + secs;
        const base = parseFloat(document.getElementById("as-base").value) || 1;
        const bonus = totalBonus();
        const flat = totalFlat();
        const speed = base + bonus / 100 + flat;
        const f = frames(speed);
        const atkPerSec = RATE / f;
        const atkPerMin = atkPerSec * 60;
        const totalAttacks =
          totalSecs > 0 ? Math.floor(atkPerSec * totalSecs) : 0;

        // Previous frame (slower)
        const prevF = f + 1;
        const prevAtkPerSec = RATE / prevF;
        const prevTotal =
          totalSecs > 0 ? Math.floor(prevAtkPerSec * totalSecs) : 0;
        const prevDiff = prevTotal - totalAttacks;

        // Next frame (faster)
        const nextF = Math.max(1, f - 1);
        const nextAtkPerSec = RATE / nextF;
        const nextTotal =
          totalSecs > 0 ? Math.floor(nextAtkPerSec * totalSecs) : 0;
        const nextDiff = nextTotal - totalAttacks;

        let html =
          '<div class="as-box-item"><div class="as-box-lbl">Attacks / second</div><div class="as-box-val">' +
          r(atkPerSec, 3) +
          "</div></div>";
        html +=
          '<div class="as-box-item"><div class="as-box-lbl">Attacks / minute</div><div class="as-box-val">' +
          r(atkPerMin, 1) +
          "</div></div>";

        if (totalSecs > 0) {
          html +=
            '<div class="as-box-item"><div class="as-box-lbl">In ' +
            (mins > 0 ? mins + "m " : "") +
            secs +
            's</div><div class="as-box-val red">' +
            totalAttacks.toLocaleString("en-US") +
            " attacks</div></div>";
          html +=
            '<div class="as-box-item"><div class="as-box-lbl">One attack every</div><div class="as-box-val">' +
            r(f / RATE, 3) +
            "s</div></div>";
        }

        html +=
          '<div class="as-box-item" style="opacity:.6"><div class="as-box-lbl">At ' +
          prevF +
          ' frames (prev tier)</div><div class="as-box-val" style="color:#94a3b8;font-size:.82rem">' +
          prevTotal.toLocaleString("en-US") +
          ' <span style="font-size:.65rem;opacity:.6">' +
          prevDiff +
          "</span></div></div>";
        html +=
          '<div class="as-box-item" style="opacity:.7"><div class="as-box-lbl">At ' +
          nextF +
          ' frames (next tier)</div><div class="as-box-val" style="color:#fbbf24;font-size:.82rem">' +
          nextTotal.toLocaleString("en-US") +
          ' <span style="font-size:.65rem;opacity:.6">+' +
          nextDiff +
          "</span></div></div>";

        if (isExactBreakpoint) {
          html += `<div class="hint" style="color:#fbbf24">
                  ⚠ Your speed lands exactly on a breakpoint threshold. 
                  Due to fixed-point precision in-game, you may get ${f + 1} frames 
                  instead of ${f} — test in-game to confirm.
                </div>`;
        }

        document.getElementById("as-attacks-result").innerHTML = html;
      }
      document
        .getElementById("as-attack-minutes")
        .addEventListener("input", renderAttackCount);
      document
        .getElementById("as-attack-seconds")
        .addEventListener("input", renderAttackCount);
      renderAttackCount();
    })();
})();
