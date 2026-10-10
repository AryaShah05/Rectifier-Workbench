function getSwitchLabel(slotId, switches) {
  const num = slotId.replace(/^[SDT]/, '');
  const type = switches[slotId] || 'D';
  return `${type}${num}`;
}

function hasAnyThyristor(params) {
  const { phase, wave, switches } = params;
  if (phase === '1P' && wave === 'HALF') return switches['S1'] === 'T';
  if (phase === '1P' && wave === 'FULL') return ['S1', 'S2', 'S3', 'S4'].some((k) => switches[k] === 'T');
  if (phase === '3P' && wave === 'HALF') return ['S1', 'S2', 'S3'].some((k) => switches[k] === 'T');
  return ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].some((k) => switches[k] === 'T');
}

function runRectifierSimulation(params) {
  const {
    phase, wave, switches, alphaDeg, freewheelingDiode: fwdUser,
    loadType, R: rawR, L_mH: rawL, E: rawE, I_dc_const, Ls_mH, V_rms, freq
  } = params;

  const omega = 2 * Math.PI * freq;
  // A constant-current load on a half-wave rectifier has no valid path without D_FW, so it is forced on.
  const freewheelingDiode = fwdUser || (phase === '1P' && wave === 'HALF' && loadType === 'CURRENT_SOURCE');
  const V_m = V_rms * Math.sqrt(2);
  const V_m_LL = V_m * Math.sqrt(3);

  const R = Math.max(0.5, rawR);
  const L = loadType === 'R' ? 0 : Math.max(0, rawL) * 1e-3;
  const E = loadType === 'RLE' ? rawE : 0;
  const Ls = Math.max(0, Ls_mH) * 1e-3;

  const getAlphaRad = (slotKey) => (switches[slotKey] === 'T' ? (alphaDeg * Math.PI) / 180 : 0);

  const tau = L / R;
  const cyclePeriod = 1 / freq;
  const numWarmupCycles =
    L > 0 && loadType !== 'CURRENT_SOURCE'
      ? Math.min(16, Math.max(4, Math.ceil((5 * tau) / cyclePeriod) + 2))
      : 2;
  const totalCycles = numWarmupCycles + 2;

  const subStepsPerDeg = 8;
  const degStep = 1 / subStepsPerDeg;
  const dTheta = (degStep * Math.PI) / 180;
  const dt = dTheta / omega;

  const totalSteps = totalCycles * 360 * subStepsPerDeg;
  const recordStartStep = numWarmupCycles * 360 * subStepsPerDeg;

  const points = [];
  let i_o = loadType === 'CURRENT_SOURCE' ? I_dc_const : 0;
  let activeUpper = 'NONE';
  let activeLower = 'NONE';
  let isFreewheeling = false;
  let muRad = 0;

  for (let step = 0; step <= totalSteps; step++) {
    const totalDeg = step * degStep;
    const degInCycle = totalDeg % 360;
    const rad = (totalDeg * Math.PI) / 180;
    const wt = ((degInCycle * Math.PI) / 180) % (2 * Math.PI);

    const v_sa = V_m * Math.sin(rad);
    const v_sb = V_m * Math.sin(rad - (2 * Math.PI) / 3);
    const v_sc = V_m * Math.sin(rad + (2 * Math.PI) / 3);

    const v_ab = v_sa - v_sb, v_bc = v_sb - v_sc, v_ca = v_sc - v_sa;
    const v_ba = -v_ab, v_cb = -v_bc, v_ac = -v_ca;

    let v_o = 0, i_sa = 0, i_sb = 0, i_sc = 0, i_fw = 0;
    const switchCurrents = {};
    const activeSwitches = [];
    let activeLoopLabel = 'Blocked / Zero Current';
    let gateTriggerPulse = false;

    const l1 = getSwitchLabel('S1', switches);
    const l2 = getSwitchLabel('S2', switches);
    const l3 = getSwitchLabel('S3', switches);
    const l4 = getSwitchLabel('S4', switches);
    const l5 = getSwitchLabel('S5', switches);
    const l6 = getSwitchLabel('S6', switches);

    // 1. SINGLE-PHASE HALF-WAVE
    if (phase === '1P' && wave === 'HALF') {
      const alpha1 = getAlphaRad('S1');
      const alpha1Deg = (alpha1 * 180) / Math.PI;
      if (switches['S1'] === 'T' && Math.abs(degInCycle - alpha1Deg) <= 1.5) gateTriggerPulse = true;

      const gateReady = wt >= alpha1 && wt <= Math.PI;
      if (gateReady && v_sa > (isFreewheeling ? 0 : E)) {
        activeUpper = 'S1';
        isFreewheeling = false;
      }

      if (loadType === 'CURRENT_SOURCE') {
        i_o = I_dc_const;
        if (freewheelingDiode) {
          const cosEnd = Math.cos(alpha1) - (omega * Ls * I_dc_const) / V_m;
          const endAngle = cosEnd >= -1 ? Math.acos(Math.min(1, cosEnd)) : Math.PI;
          muRad = Math.max(0, endAngle - alpha1);
          if (wt >= alpha1 && wt < endAngle && Ls > 0) {
            const i_s1 = (V_m / (omega * Ls)) * (Math.cos(alpha1) - Math.cos(wt));
            const clamped_s1 = Math.max(0, Math.min(I_dc_const, i_s1));
            v_o = 0; i_sa = clamped_s1; i_fw = I_dc_const - clamped_s1;
            switchCurrents[l1] = i_sa; switchCurrents['D_FW'] = i_fw;
            activeSwitches.push(l1, 'D_FW');
            activeLoopLabel = `Commutation Overlap: ${l1} + D_FW`;
          } else if (wt >= endAngle && wt <= Math.PI) {
            v_o = v_sa; i_sa = I_dc_const; switchCurrents[l1] = i_o;
            activeSwitches.push(l1);
            activeLoopLabel = `Active Loop: Source → ${l1} → Load`;
          } else {
            v_o = 0; i_fw = I_dc_const; switchCurrents['D_FW'] = i_fw;
            activeSwitches.push('D_FW');
            activeLoopLabel = 'Freewheeling Loop: D_FW → Load';
          }
        } else {
          v_o = v_sa; i_sa = I_dc_const; switchCurrents[l1] = i_o;
          activeSwitches.push(l1);
          activeLoopLabel = `Active Loop: Source → ${l1} → Load`;
        }
      } else {
        if (activeUpper === 'S1' && freewheelingDiode && v_sa <= 0 && i_o > 0) {
          activeUpper = 'NONE';
          isFreewheeling = true;
        }
        if (activeUpper === 'S1') {
          v_o = v_sa;
          if (L === 0) {
            i_o = Math.max(0, (v_o - E) / R);
            if (i_o <= 0) activeUpper = 'NONE';
          } else {
            i_o += ((v_o - E - R * i_o) / L) * dt;
            if (i_o <= 1e-5 && (wt > Math.PI || v_o <= E)) { i_o = 0; activeUpper = 'NONE'; }
          }
          if (i_o > 0) {
            i_sa = i_o; switchCurrents[l1] = i_o; activeSwitches.push(l1);
            activeLoopLabel = `Active Loop: Source → ${l1} → Load`;
          }
        } else if (isFreewheeling && freewheelingDiode) {
          v_o = 0;
          if (L === 0) { i_o = 0; isFreewheeling = false; }
          else {
            i_o += ((0 - E - R * i_o) / L) * dt;
            if (i_o <= 1e-5) { i_o = 0; isFreewheeling = false; }
          }
          if (i_o > 0) {
            i_fw = i_o; switchCurrents['D_FW'] = i_o; activeSwitches.push('D_FW');
            activeLoopLabel = 'Freewheeling Loop: D_FW → Load';
          }
        } else {
          i_o = 0; v_o = E;
          activeLoopLabel = E > 0 ? 'Blocked (v_o = E)' : 'Blocked / Zero Current';
        }
      }
    }

    // 2. SINGLE-PHASE FULL-BRIDGE
    else if (phase === '1P' && wave === 'FULL') {
      const a1 = getAlphaRad('S1'), a2 = getAlphaRad('S2'), a3 = getAlphaRad('S3'), a4 = getAlphaRad('S4');
      const alphaPos = Math.max(a1, a2);
      const alphaNeg = Math.PI + Math.max(a3, a4);
      if ((switches['S1'] === 'T' || switches['S2'] === 'T') && Math.abs(degInCycle - (alphaPos * 180) / Math.PI) <= 1.5) gateTriggerPulse = true;
      if ((switches['S3'] === 'T' || switches['S4'] === 'T') && Math.abs(degInCycle - (alphaNeg * 180) / Math.PI) <= 1.5) gateTriggerPulse = true;

      const canLegFWFromPos = switches['S4'] === 'D' || switches['S3'] === 'D';
      const canLegFWFromNeg = switches['S2'] === 'D' || switches['S1'] === 'D';
      const hasNaturalLegFW = canLegFWFromPos || canLegFWFromNeg || freewheelingDiode;

      if (loadType === 'CURRENT_SOURCE') {
        i_o = I_dc_const;
        const cosMuEnd = Math.cos(alphaPos) - (2 * omega * Ls * I_dc_const) / V_m;
        const posEndAngle = cosMuEnd >= -1 ? Math.acos(Math.min(1, cosMuEnd)) : Math.PI;
        muRad = Math.max(0, posEndAngle - alphaPos);
        const relWt = (wt - alphaPos + 2 * Math.PI) % (2 * Math.PI);
        if (Ls > 0 && relWt < muRad) {
          v_o = 0;
          const frac = Math.max(0, Math.min(1, (Math.cos(alphaPos) - Math.cos(wt)) / (Math.cos(alphaPos) - Math.cos(posEndAngle) + 1e-9)));
          const i_pos = I_dc_const * frac, i_neg = I_dc_const * (1 - frac);
          i_sa = i_pos - i_neg;
          switchCurrents[l1] = i_pos; switchCurrents[l2] = i_pos; switchCurrents[l3] = i_neg; switchCurrents[l4] = i_neg;
          activeSwitches.push(l1, l2, l3, l4);
          activeLoopLabel = `Commutation Overlap: ${l1},${l2},${l3},${l4} (v_o = 0V)`;
        } else if (Ls > 0 && relWt >= Math.PI && relWt < Math.PI + muRad) {
          v_o = 0;
          const wtNeg = wt - Math.PI;
          const frac = Math.max(0, Math.min(1, (Math.cos(alphaPos) - Math.cos(wtNeg)) / (Math.cos(alphaPos) - Math.cos(posEndAngle) + 1e-9)));
          const i_neg = I_dc_const * frac, i_pos = I_dc_const * (1 - frac);
          i_sa = i_pos - i_neg;
          switchCurrents[l1] = i_pos; switchCurrents[l2] = i_pos; switchCurrents[l3] = i_neg; switchCurrents[l4] = i_neg;
          activeSwitches.push(l1, l2, l3, l4);
          activeLoopLabel = `Commutation Overlap: ${l1},${l2},${l3},${l4} (v_o = 0V)`;
        } else if (relWt < Math.PI) {
          if (hasNaturalLegFW && v_sa < 0) {
            v_o = 0; i_sa = 0;
            if (freewheelingDiode) { i_fw = I_dc_const; switchCurrents['D_FW'] = I_dc_const; activeSwitches.push('D_FW'); activeLoopLabel = 'Freewheeling Diode D_FW'; }
            else { switchCurrents[l1] = I_dc_const; switchCurrents[l4] = I_dc_const; activeSwitches.push(l1, l4); activeLoopLabel = `Leg Freewheeling: ${l1} + ${l4}`; }
          } else {
            v_o = v_sa; i_sa = I_dc_const; switchCurrents[l1] = I_dc_const; switchCurrents[l2] = I_dc_const; activeSwitches.push(l1, l2);
            activeLoopLabel = `Positive Diagonal: ${l1} + ${l2}`;
          }
        } else {
          if (hasNaturalLegFW && -v_sa < 0) {
            v_o = 0; i_sa = 0;
            if (freewheelingDiode) { i_fw = I_dc_const; switchCurrents['D_FW'] = I_dc_const; activeSwitches.push('D_FW'); activeLoopLabel = 'Freewheeling Diode D_FW'; }
            else { switchCurrents[l3] = I_dc_const; switchCurrents[l2] = I_dc_const; activeSwitches.push(l3, l2); activeLoopLabel = `Leg Freewheeling: ${l3} + ${l2}`; }
          } else {
            v_o = -v_sa; i_sa = -I_dc_const; switchCurrents[l3] = I_dc_const; switchCurrents[l4] = I_dc_const; activeSwitches.push(l3, l4);
            activeLoopLabel = `Negative Diagonal: ${l3} + ${l4}`;
          }
        }
      } else {
        const canFirePos = wt >= alphaPos && wt < Math.PI && v_sa > (i_o > 0 ? -1e9 : E);
        const canFireNeg = wt >= alphaNeg && wt < 2 * Math.PI && -v_sa > (i_o > 0 ? -1e9 : E);
        if (canFirePos) activeUpper = 'POS_PAIR';
        else if (canFireNeg) activeUpper = 'NEG_PAIR';

        if (i_o > 0) {
          if (activeUpper === 'POS_PAIR' && v_sa <= 0 && (canLegFWFromPos || freewheelingDiode)) {
            activeUpper = freewheelingDiode ? 'FW_DIODE' : switches['S4'] === 'D' ? 'LEG_FW_A' : 'LEG_FW_B';
          } else if (activeUpper === 'NEG_PAIR' && -v_sa <= 0 && (canLegFWFromNeg || freewheelingDiode)) {
            activeUpper = freewheelingDiode ? 'FW_DIODE' : switches['S2'] === 'D' ? 'LEG_FW_B' : 'LEG_FW_A';
          }
        }

        if (activeUpper === 'POS_PAIR') v_o = v_sa;
        else if (activeUpper === 'NEG_PAIR') v_o = -v_sa;
        else if (activeUpper === 'FW_DIODE' || activeUpper === 'LEG_FW_A' || activeUpper === 'LEG_FW_B') v_o = 0;
        else v_o = E;

        if (activeUpper !== 'NONE') {
          if (L === 0) { i_o = Math.max(0, (v_o - E) / R); if (i_o <= 0) activeUpper = 'NONE'; }
          else {
            const effL = activeUpper === 'POS_PAIR' || activeUpper === 'NEG_PAIR' ? L : L;
            i_o += ((v_o - E - R * i_o) / effL) * dt;
            if (i_o <= 1e-5) { i_o = 0; activeUpper = 'NONE'; v_o = E; }
          }
        } else { i_o = 0; v_o = E; }

        if (i_o > 0) {
          if (activeUpper === 'POS_PAIR') { i_sa = i_o; switchCurrents[l1] = i_o; switchCurrents[l2] = i_o; activeSwitches.push(l1, l2); activeLoopLabel = `Positive Diagonal: ${l1} + ${l2}`; }
          else if (activeUpper === 'NEG_PAIR') { i_sa = -i_o; switchCurrents[l3] = i_o; switchCurrents[l4] = i_o; activeSwitches.push(l3, l4); activeLoopLabel = `Negative Diagonal: ${l3} + ${l4}`; }
          else if (activeUpper === 'FW_DIODE') { i_sa = 0; i_fw = i_o; switchCurrents['D_FW'] = i_o; activeSwitches.push('D_FW'); activeLoopLabel = 'Freewheeling Diode D_FW → Load'; }
          else if (activeUpper === 'LEG_FW_A') { i_sa = 0; switchCurrents[l1] = i_o; switchCurrents[l4] = i_o; activeSwitches.push(l1, l4); activeLoopLabel = `Zero-Voltage Leg Loop: ${l1} + ${l4}`; }
          else if (activeUpper === 'LEG_FW_B') { i_sa = 0; switchCurrents[l3] = i_o; switchCurrents[l2] = i_o; activeSwitches.push(l3, l2); activeLoopLabel = `Zero-Voltage Leg Loop: ${l3} + ${l2}`; }
        }
      }
    }

    // 3. THREE-PHASE HALF-WAVE (3-PULSE)
    else if (phase === '3P' && wave === 'HALF') {
      const a1 = getAlphaRad('S1'), a2 = getAlphaRad('S2'), a3 = getAlphaRad('S3');
      const fire1 = Math.PI / 6 + a1, fire2 = (5 * Math.PI) / 6 + a2, fire3 = (9 * Math.PI) / 6 + a3;
      const fire1Deg = (fire1 * 180) / Math.PI, fire2Deg = (fire2 * 180) / Math.PI, fire3Deg = (fire3 * 180) / Math.PI;
      if (
        (switches['S1'] === 'T' && Math.abs(degInCycle - (fire1Deg % 360)) <= 1.5) ||
        (switches['S2'] === 'T' && Math.abs(degInCycle - (fire2Deg % 360)) <= 1.5) ||
        (switches['S3'] === 'T' && Math.abs(degInCycle - (fire3Deg % 360)) <= 1.5)
      ) gateTriggerPulse = true;

      const wtShift = wt < Math.PI / 6 ? wt + 2 * Math.PI : wt;
      let candidateSwitch = wtShift >= fire3 ? 'S3' : wtShift >= fire2 ? 'S2' : wtShift >= fire1 ? 'S1' : 'S3';
      if (switches['S1'] === 'D' && v_sa >= v_sb && v_sa >= v_sc) candidateSwitch = 'S1';
      else if (switches['S2'] === 'D' && v_sb >= v_sa && v_sb >= v_sc) candidateSwitch = 'S2';
      else if (switches['S3'] === 'D' && v_sc >= v_sa && v_sc >= v_sb) candidateSwitch = 'S3';

      let v_cand = candidateSwitch === 'S1' ? v_sa : candidateSwitch === 'S2' ? v_sb : v_sc;

      if (loadType === 'CURRENT_SOURCE') {
        i_o = I_dc_const;
        if (freewheelingDiode && v_cand < 0) {
          v_o = 0; i_fw = I_dc_const; switchCurrents['D_FW'] = I_dc_const; activeSwitches.push('D_FW');
          activeLoopLabel = 'Freewheeling Diode D_FW → Load';
        } else {
          v_o = v_cand;
          const lbl = getSwitchLabel(candidateSwitch, switches);
          switchCurrents[lbl] = I_dc_const; activeSwitches.push(lbl);
          if (candidateSwitch === 'S1') i_sa = I_dc_const;
          if (candidateSwitch === 'S2') i_sb = I_dc_const;
          if (candidateSwitch === 'S3') i_sc = I_dc_const;
          activeLoopLabel = `3-Pulse Active: ${lbl} Conducting`;
        }
      } else {
        if (v_cand > (i_o > 0 ? -1e9 : E)) activeUpper = candidateSwitch;
        if (freewheelingDiode && v_cand <= 0 && i_o > 0) activeUpper = 'FW_DIODE';

        if (activeUpper === 'S1' || activeUpper === 'S2' || activeUpper === 'S3') {
          v_o = activeUpper === 'S1' ? v_sa : activeUpper === 'S2' ? v_sb : v_sc;
          if (L === 0) { i_o = Math.max(0, (v_o - E) / R); if (i_o <= 0) activeUpper = 'NONE'; }
          else { i_o += ((v_o - E - R * i_o) / L) * dt; if (i_o <= 1e-5) { i_o = 0; activeUpper = 'NONE'; v_o = E; } }
          if (i_o > 0) {
            const lbl = getSwitchLabel(activeUpper, switches);
            switchCurrents[lbl] = i_o; activeSwitches.push(lbl);
            if (activeUpper === 'S1') i_sa = i_o;
            if (activeUpper === 'S2') i_sb = i_o;
            if (activeUpper === 'S3') i_sc = i_o;
            activeLoopLabel = `Phase ${activeUpper === 'S1' ? 'A' : activeUpper === 'S2' ? 'B' : 'C'} → ${lbl} → Load`;
          }
        } else if (activeUpper === 'FW_DIODE') {
          v_o = 0;
          if (L === 0) { i_o = 0; activeUpper = 'NONE'; }
          else { i_o += ((0 - E - R * i_o) / L) * dt; if (i_o <= 1e-5) { i_o = 0; activeUpper = 'NONE'; } }
          if (i_o > 0) { i_fw = i_o; switchCurrents['D_FW'] = i_o; activeSwitches.push('D_FW'); activeLoopLabel = 'Freewheeling Diode D_FW → Load'; }
        } else { i_o = 0; v_o = E; }
      }
    }

    // 4. THREE-PHASE FULL-BRIDGE (6-PULSE)
    else {
      const a1 = getAlphaRad('S1'), a3 = getAlphaRad('S3'), a5 = getAlphaRad('S5');
      const a2 = getAlphaRad('S2'), a4 = getAlphaRad('S4'), a6 = getAlphaRad('S6');

      const firingAnglesDeg = [
        (30 + (a1 * 180) / Math.PI) % 360, (90 + (a2 * 180) / Math.PI) % 360,
        (150 + (a3 * 180) / Math.PI) % 360, (210 + (a4 * 180) / Math.PI) % 360,
        (270 + (a5 * 180) / Math.PI) % 360, (330 + (a6 * 180) / Math.PI) % 360,
      ];
      if (hasAnyThyristor(params) && firingAnglesDeg.some((ang) => Math.abs(degInCycle - ang) <= 1.2)) {
        gateTriggerPulse = true;
      }

      const wtUpper = wt < Math.PI / 6 ? wt + 2 * Math.PI : wt;
      const upSw = wtUpper >= (9 * Math.PI) / 6 + a5 ? 'S5' : wtUpper >= (5 * Math.PI) / 6 + a3 ? 'S3' : wtUpper >= Math.PI / 6 + a1 ? 'S1' : 'S5';
      const wtLower = wt < Math.PI / 2 ? wt + 2 * Math.PI : wt;
      const lowSw = wtLower >= (11 * Math.PI) / 6 + a6 ? 'S6' : wtLower >= (7 * Math.PI) / 6 + a4 ? 'S4' : wtLower >= Math.PI / 2 + a2 ? 'S2' : 'S6';

      const v_up = upSw === 'S1' ? v_sa : upSw === 'S3' ? v_sb : v_sc;
      const v_low = lowSw === 'S4' ? v_sa : lowSw === 'S6' ? v_sb : v_sc;
      const v_pair = v_up - v_low;
      const upLbl = getSwitchLabel(upSw, switches), lowLbl = getSwitchLabel(lowSw, switches);

      if (loadType === 'CURRENT_SOURCE') {
        i_o = I_dc_const;
        if (freewheelingDiode && v_pair < 0) {
          v_o = 0; i_fw = I_dc_const; switchCurrents['D_FW'] = I_dc_const; activeSwitches.push('D_FW');
          activeLoopLabel = 'Freewheeling Diode D_FW → Load';
        } else {
          v_o = v_pair;
          switchCurrents[upLbl] = I_dc_const; switchCurrents[lowLbl] = I_dc_const; activeSwitches.push(upLbl, lowLbl);
          if (upSw === 'S1') i_sa += I_dc_const; if (upSw === 'S3') i_sb += I_dc_const; if (upSw === 'S5') i_sc += I_dc_const;
          if (lowSw === 'S4') i_sa -= I_dc_const; if (lowSw === 'S6') i_sb -= I_dc_const; if (lowSw === 'S2') i_sc -= I_dc_const;
          activeLoopLabel = `6-Pulse Pair ${upLbl} + ${lowLbl}`;
        }
      } else {
        if (v_pair > (i_o > 0 ? -1e9 : E)) { activeUpper = upSw; activeLower = lowSw; isFreewheeling = false; }
        if (freewheelingDiode && v_pair <= 0 && i_o > 0) isFreewheeling = true;

        if (isFreewheeling && freewheelingDiode) {
          v_o = 0;
          if (L === 0) { i_o = 0; isFreewheeling = false; }
          else { i_o += ((0 - E - R * i_o) / L) * dt; if (i_o <= 1e-5) { i_o = 0; isFreewheeling = false; } }
          if (i_o > 0) { i_fw = i_o; switchCurrents['D_FW'] = i_o; activeSwitches.push('D_FW'); activeLoopLabel = 'Freewheeling Diode D_FW → Load'; }
        } else if (activeUpper !== 'NONE' && activeLower !== 'NONE') {
          v_o = v_pair;
          if (L === 0) { i_o = Math.max(0, (v_o - E) / R); if (i_o <= 0) { activeUpper = 'NONE'; activeLower = 'NONE'; v_o = E; } }
          else { i_o += ((v_o - E - R * i_o) / (L)) * dt; if (i_o <= 1e-5) { i_o = 0; activeUpper = 'NONE'; activeLower = 'NONE'; v_o = E; } }
          if (i_o > 0) {
            switchCurrents[upLbl] = i_o; switchCurrents[lowLbl] = i_o; activeSwitches.push(upLbl, lowLbl);
            if (upSw === 'S1') i_sa += i_o; if (upSw === 'S3') i_sb += i_o; if (upSw === 'S5') i_sc += i_o;
            if (lowSw === 'S4') i_sa -= i_o; if (lowSw === 'S6') i_sb -= i_o; if (lowSw === 'S2') i_sc -= i_o;
            activeLoopLabel = `6-Pulse Pair ${upLbl} + ${lowLbl}`;
          }
        } else { i_o = 0; v_o = E; }
      }
    }

    if (step >= recordStartStep && (step - recordStartStep) % subStepsPerDeg === 0) {
      const recDeg = (step - recordStartStep) / subStepsPerDeg;
      points.push({
        deg: recDeg, timeMs: (recDeg / 360) * cyclePeriod * 1000,
        v_sa, v_sb, v_sc, v_ab, v_bc, v_ca, v_ba, v_cb, v_ac,
        v_o, i_o, i_sa, i_sb, i_sc, i_fw, switchCurrents, activeSwitches, activeLoopLabel, gateTriggerPulse
      });
    }
  }

  const N = 360;
  const cyclePts = points.slice(0, N);
  let sum_isa = 0, sum_vo = 0, sum_vo_sq = 0, sum_io = 0, sum_io_sq = 0, sum_isa_sq = 0, sum_p = 0, zeroCurrentSteps = 0;
  let betaDeg = null;

  for (let k = 0; k < N; k++) {
    const pt = cyclePts[k];
    sum_vo += pt.v_o; sum_vo_sq += pt.v_o * pt.v_o;
    sum_io += pt.i_o; sum_io_sq += pt.i_o * pt.i_o;
    sum_isa_sq += pt.i_sa * pt.i_sa; sum_isa += pt.i_sa; sum_p += pt.v_o * pt.i_o;
    if (pt.i_o <= 1e-3) zeroCurrentSteps++;
    if (k > 5 && cyclePts[k - 1].i_o > 1e-3 && pt.i_o <= 1e-3 && betaDeg === null) betaDeg = pt.deg;
  }

  const V_dc = sum_vo / N, V_rms_out = Math.sqrt(sum_vo_sq / N);
  const I_dc = sum_io / N, I_rms_out = Math.sqrt(sum_io_sq / N);
  const I_s_rms = Math.sqrt(sum_isa_sq / N), P_load = sum_p / N;
  const S_in = phase === '3P' ? 3 * V_rms * I_s_rms : V_rms * I_s_rms;
  const PF_true = S_in > 1e-3 ? Math.min(1, Math.max(-1, P_load / S_in)) : 0;

  let a1_i = 0, b1_i = 0;
  for (let k = 0; k < N; k++) {
    const theta = (k * 2 * Math.PI) / N;
    a1_i += cyclePts[k].i_sa * Math.cos(theta);
    b1_i += cyclePts[k].i_sa * Math.sin(theta);
  }
  a1_i = (2 / N) * a1_i; b1_i = (2 / N) * b1_i;
  const I1_peak = Math.hypot(a1_i, b1_i);
  const I1_rms = I1_peak / Math.sqrt(2);
  const phi1_rad = Math.atan2(a1_i, b1_i);
  const DPF = I1_peak > 1e-4 ? Math.cos(phi1_rad) : 0;
  const THD_i = I1_rms > 1e-4 ? Math.sqrt(Math.max(0, ((I_s_rms * I_s_rms - Math.pow(sum_isa / N, 2)) / (I1_rms * I1_rms)) - 1)) * 100 : 0;
  const FF = Math.abs(V_dc) > 1e-2 ? V_rms_out / Math.abs(V_dc) : 1;
  const RF = FF > 1 ? Math.sqrt(FF * FF - 1) : 0;
  // Analytic commutation overlap (standard textbook results)
  const aEff = hasAnyThyristor(params) ? (alphaDeg * Math.PI) / 180 : 0;
  const kMu = phase === '1P' ? (wave === 'FULL' ? 2 : 1) : 2 / Math.sqrt(3);
  const xMu = (omega * Ls * Math.abs(I_dc) * kMu) / V_m;
  const muAnalytic = Ls > 0 && I_dc > 1e-3 ? Math.max(0, Math.acos(Math.max(-1, Math.min(1, Math.cos(aEff) - xMu))) - aEff) : 0;
  const muDeg = (muAnalytic * 180) / Math.PI;
  const [nCom, aCom] = phase === '1P' ? (wave === 'FULL' ? [2, 2] : [1, 1]) : (wave === 'FULL' ? [6, 1] : [3, 1]);
  const dVov = Ls > 0 ? (nCom * aCom * omega * Ls * I_dc) / (2 * Math.PI) : 0;
  const overlapInWaveform = loadType === 'CURRENT_SOURCE' && phase === '1P';
  const V_dc_ov = overlapInWaveform ? V_dc : V_dc - dVov;
  const conductionMode = zeroCurrentSteps > 3 ? 'DCM' : 'CCM';

  return {
    points,
    metrics: { V_m, V_m_LL, V_dc, V_rms_out, I_dc, I_rms_out, P_load, S_in, PF_true, DPF, THD_i, FF, RF, conductionMode, betaDeg, muDeg, V_dc_ov, dVov, fwdForced: freewheelingDiode && !fwdUser }
  };
}

