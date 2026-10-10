// =========================================================================
// 2. INTERACTIVE CIRCUIT SCHEMATIC COMPONENT
// =========================================================================
function CircuitSchematic({ params, currentPoint, onToggleSwitch, onToggleFWD, lightMode }) {
  const { phase, wave, switches, freewheelingDiode, loadType, R, L_mH, E, I_dc_const, Ls_mH } = params;
  const activeSet = new Set(currentPoint.activeSwitches);
  const hasCurrent = currentPoint.i_o > 0.01;

  const wireBase = lightMode ? '#CBD5E1' : '#334155';
  const wireActive = '#10B981';
  const wireParticle = lightMode ? '#047857' : '#6EE7B7';
  const bgCard = lightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#111827] border-slate-800 text-slate-100';
  const canvasBg = lightMode ? 'bg-[#F8FAFC]' : 'bg-[#0B0F19]';
  const headerBorder = lightMode ? 'border-slate-200' : 'border-slate-800';

  const renderSwitch = (slotKey, cx, cy, subLabel, orientation = 'UP') => {
    const label = getSwitchLabel(slotKey, switches);
    const isThyristor = switches[slotKey] === 'T';
    const isOn = activeSet.has(label) && hasCurrent;
    const swCurrent = currentPoint.switchCurrents[label] || 0;
    const strokeCol = isOn ? '#10B981' : '#64748B';
    const boxFill = isOn ? 'rgba(16, 185, 129, 0.15)' : lightMode ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.85)';
    const boxStroke = isOn ? '#10B981' : lightMode ? '#CBD5E1' : '#334155';

    return (
      <g key={slotKey} className="cursor-pointer" onClick={() => onToggleSwitch(slotKey)}>
        <rect x={cx - 34} y={cy - 42} width={68} height={84} rx={10} fill={boxFill} stroke={boxStroke} strokeWidth={isOn ? 2.2 : 1.2} />
        <text x={cx - 24} y={cy - 24} fill={isOn ? '#10B981' : lightMode ? '#0F172A' : '#E2E8F0'} className="text-[12px] font-mono font-bold select-none">{label}</text>
        <text x={cx} y={cy - 12} textAnchor="middle" fill="#64748B" className="text-[9px] font-mono select-none">{subLabel}</text>
        {orientation === 'UP' ? (
          <g>
            <line x1={cx} y1={cy + 20} x2={cx} y2={cy - 8} stroke={strokeCol} strokeWidth={2} />
            <polygon points={`${cx},${cy - 6} ${cx - 11},${cy + 12} ${cx + 11},${cy + 12}`} fill={isOn ? '#10B981' : 'none'} fillOpacity={isOn ? 0.35 : 0} stroke={strokeCol} strokeWidth={2} />
            <line x1={cx - 12} y1={cy - 6} x2={cx + 12} y2={cy - 6} stroke={strokeCol} strokeWidth={2.2} />
            {isThyristor && (
              <g>
                <polyline points={`${cx - 5},${cy - 6} ${cx - 14},${cy - 13} ${cx - 22},${cy - 13}`} fill="none" stroke={isOn ? '#10B981' : '#3B82F6'} strokeWidth={1.8} />
                <text x={cx - 28} y={cy - 10} fill="#3B82F6" className="text-[9px] font-mono font-semibold select-none">G</text>
              </g>
            )}
          </g>
        ) : (
          <g>
            <line x1={cx - 18} y1={cy + 4} x2={cx + 18} y2={cy + 4} stroke={strokeCol} strokeWidth={2} />
            <polygon points={`${cx + 10},${cy + 4} ${cx - 10},${cy - 7} ${cx - 10},${cy + 15}`} fill={isOn ? '#10B981' : 'none'} fillOpacity={isOn ? 0.35 : 0} stroke={strokeCol} strokeWidth={2} />
            <line x1={cx + 10} y1={cy - 8} x2={cx + 10} y2={cy + 16} stroke={strokeCol} strokeWidth={2.2} />
            {isThyristor && (
              <g>
                <polyline points={`${cx + 10},${cy - 2} ${cx + 18},${cy - 12} ${cx + 25},${cy - 12}`} fill="none" stroke={isOn ? '#10B981' : '#3B82F6'} strokeWidth={1.8} />
                <text x={cx + 26} y={cy - 9} fill="#3B82F6" className="text-[9px] font-mono font-semibold select-none">G</text>
              </g>
            )}
          </g>
        )}
        <text x={cx} y={cy + 33} textAnchor="middle" fill={isOn ? '#10B981' : '#64748B'} className="text-[10px] font-mono font-semibold select-none">
          {isOn ? `ON (${swCurrent.toFixed(1)}A)` : 'OFF'}
        </text>
      </g>
    );
  };

  const renderFreewheelingBranch = (x, topY, botY) => {
    const midY = (topY + botY) / 2;
    const isFWOn = activeSet.has('D_FW') && hasCurrent;
    const strokeCol = isFWOn ? '#10B981' : freewheelingDiode ? '#64748B' : lightMode ? '#CBD5E1' : '#1E293B';
    return (
      <g className="cursor-pointer" onClick={onToggleFWD}>
        <line x1={x} y1={topY} x2={x} y2={botY} stroke={isFWOn ? wireActive : strokeCol} strokeWidth={isFWOn ? 2.5 : 1.5} strokeDasharray={freewheelingDiode ? undefined : '5 5'} />
        {isFWOn && <line x1={x} y1={botY} x2={x} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />}
        <circle cx={x} cy={topY} r={3.5} fill={isFWOn ? wireActive : strokeCol} />
        <circle cx={x} cy={botY} r={3.5} fill={isFWOn ? wireActive : strokeCol} />
        <rect x={x - 28} y={midY - 30} width={56} height={60} rx={8} fill={isFWOn ? 'rgba(16,185,129,0.16)' : lightMode ? '#FFFFFF' : '#0F172A'} stroke={isFWOn ? '#10B981' : strokeCol} strokeWidth={isFWOn ? 2 : 1.2} strokeDasharray={freewheelingDiode ? undefined : '4 4'} />
        <polygon points={`${x},${midY - 8} ${x - 10},${midY + 10} ${x + 10},${midY + 10}`} fill={isFWOn ? '#10B981' : 'none'} fillOpacity={isFWOn ? 0.35 : 0} stroke={strokeCol} strokeWidth={1.8} />
        <line x1={x - 11} y1={midY - 8} x2={x + 11} y2={midY - 8} stroke={strokeCol} strokeWidth={2} />
        <text x={x + 34} y={midY - 2} fill={isFWOn ? '#10B981' : '#64748B'} className="text-[10px] font-mono font-semibold select-none">D_FW</text>
        <text x={x} y={midY + 24} textAnchor="middle" fill={isFWOn ? '#10B981' : '#64748B'} className="text-[9px] font-mono select-none">
          {isFWOn ? `ON (${currentPoint.i_fw.toFixed(1)}A)` : freewheelingDiode ? 'READY' : 'OFF'}
        </text>
      </g>
    );
  };

  const renderLoadStage = (x, topY, botY) => {
    const midY = (topY + botY) / 2;
    const isLoadActive = hasCurrent;
    const loadStroke = isLoadActive ? wireActive : wireBase;
    return (
      <g>
        <line x1={x} y1={topY} x2={x} y2={midY - 62} stroke={loadStroke} strokeWidth={isLoadActive ? 2.5 : 1.8} />
        <line x1={x} y1={midY + 62} x2={x} y2={botY} stroke={loadStroke} strokeWidth={isLoadActive ? 2.5 : 1.8} />
        {isLoadActive && (
          <>
            <line x1={x} y1={topY} x2={x} y2={midY - 62} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
            <line x1={x} y1={midY + 62} x2={x} y2={botY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
          </>
        )}
        <text x={x + 14} y={topY + 4} fill="#EF4444" className="text-[11px] font-mono font-semibold select-none">+ Vo ({currentPoint.v_o.toFixed(1)} V)</text>
        <text x={x + 14} y={botY + 4} fill="#3B82F6" className="text-[11px] font-mono font-semibold select-none">- Vo (GND)</text>
        <rect x={x - 36} y={midY - 62} width={72} height={124} rx={10} fill={lightMode ? '#FFFFFF' : '#111827'} stroke={isLoadActive ? '#10B981' : lightMode ? '#CBD5E1' : '#334155'} strokeWidth={isLoadActive ? 2 : 1.5} />
        <text x={x} y={midY - 44} textAnchor="middle" fill={isLoadActive ? '#10B981' : '#3B82F6'} className="text-[11px] font-mono font-semibold select-none">
          {loadType === 'CURRENT_SOURCE' ? 'I_dc Load' : `${loadType} Load`}
        </text>
        {loadType === 'CURRENT_SOURCE' ? (
          <text x={x} y={midY + 5} textAnchor="middle" fill="#F59E0B" className="text-[11px] font-mono font-bold select-none">I_dc = {I_dc_const}A</text>
        ) : (
          <g>
            <text x={x} y={midY - 12} textAnchor="middle" fill={lightMode ? '#334155' : '#CBD5E1'} className="text-[10px] font-mono select-none">R = {R} Ω</text>
            {(loadType === 'RL' || loadType === 'RLE') && (
              <text x={x} y={midY + 14} textAnchor="middle" fill="#F59E0B" className="text-[10px] font-mono select-none">L = {L_mH} mH</text>
            )}
            {loadType === 'RLE' && (
              <text x={x} y={midY + 40} textAnchor="middle" fill="#3B82F6" className="text-[10px] font-mono select-none">E = {E} V</text>
            )}
          </g>
        )}
        <rect x={x - 46} y={midY + 72} width={92} height={24} rx={6} fill={isLoadActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(100, 116, 139, 0.12)'} stroke={isLoadActive ? '#10B981' : '#64748B'} strokeWidth={1.2} />
        <text x={x} y={midY + 88} textAnchor="middle" fill={isLoadActive ? '#10B981' : '#64748B'} className="text-[10.5px] font-mono font-semibold select-none">
          i_o = +{currentPoint.i_o.toFixed(2)}A ▸
        </text>
      </g>
    );
  };

  const renderCircuitCanvas = () => {
    const topY = 95, botY = 355, midY = 225, loadX = 595;

    if (phase === '1P' && wave === 'HALF') {
      const l1 = getSwitchLabel('S1', switches);
      const isS1On = activeSet.has(l1) && hasCurrent;
      const isFWOn = activeSet.has('D_FW') && hasCurrent;
      const fwX = 445;
      return (
        <svg viewBox="0 0 740 430" className="w-full h-full select-none">
          <polyline points={`85,${midY - 28} 85,${topY} ${loadX},${topY}`} fill="none" stroke={wireBase} strokeWidth={1.8} />
          <polyline points={`${loadX},${botY} 85,${botY} 85,${midY + 28}`} fill="none" stroke={wireBase} strokeWidth={1.8} />
          {isS1On && (
            <>
              <polyline points={`85,${midY - 28} 85,${topY} ${fwX},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} />
              <polyline points={`85,${midY - 28} 85,${topY} ${fwX},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
              <polyline points={`${fwX},${botY} 85,${botY} 85,${midY + 28}`} fill="none" stroke={wireActive} strokeWidth={2.6} />
              <polyline points={`${fwX},${botY} 85,${botY} 85,${midY + 28}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
            </>
          )}
          {(isS1On || isFWOn) && (
            <>
              <line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireActive} strokeWidth={2.6} />
              <line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
              <line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireActive} strokeWidth={2.6} />
              <line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
            </>
          )}
          <circle cx={85} cy={midY} r={28} fill={lightMode ? '#FFFFFF' : '#0F172A'} stroke={isS1On ? '#10B981' : '#3B82F6'} strokeWidth={2.2} />
          <path d={`M 73 ${midY} Q 79 ${midY - 12} 85 ${midY} T 97 ${midY}`} fill="none" stroke={isS1On ? '#10B981' : '#3B82F6'} strokeWidth={2.2} />
          <text x={85} y={midY + 48} textAnchor="middle" fill="#64748B" className="text-[10px] font-mono">vs = {currentPoint.v_sa.toFixed(1)}V</text>
          {renderSwitch('S1', 274, topY - 4, 'Main Switch', 'RIGHT')}
          {renderFreewheelingBranch(fwX, topY, botY)}
          {renderLoadStage(loadX, topY, botY)}
        </svg>
      );
    }

    if (phase === '1P' && wave === 'FULL') {
      const l1 = getSwitchLabel('S1', switches), l4 = getSwitchLabel('S4', switches), l3 = getSwitchLabel('S3', switches), l2 = getSwitchLabel('S2', switches);
      const on1 = activeSet.has(l1) && hasCurrent, on2 = activeSet.has(l2) && hasCurrent, on3 = activeSet.has(l3) && hasCurrent, on4 = activeSet.has(l4) && hasCurrent, onFW = activeSet.has('D_FW') && hasCurrent;
      const acLineActive = Math.abs(currentPoint.i_sa) > 0.01 && hasCurrent;
      const acPositiveDir = currentPoint.i_sa > 0.01;
      const legAX = 215, legBX = 335, fwX = 455, acTopY = 185, acBotY = 265;

      return (
        <svg viewBox="0 0 740 430" className="w-full h-full select-none">
          <line x1={legAX} y1={topY} x2={loadX} y2={topY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={legAX} y1={botY} x2={loadX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={legAX} y1={topY} x2={legAX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={legBX} y1={topY} x2={legBX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
          <polyline points={`85,${midY - 27} 85,${acTopY} ${legAX},${acTopY}`} fill="none" stroke={wireBase} strokeWidth={1.8} />
          <polyline points={`85,${midY + 27} 85,${acBotY} ${legBX},${acBotY}`} fill="none" stroke={wireBase} strokeWidth={1.8} />

          {acLineActive && (
            <>
              <polyline points={acPositiveDir ? `85,${midY - 27} 85,${acTopY} ${legAX},${acTopY}` : `${legAX},${acTopY} 85,${acTopY} 85,${midY - 27}`} fill="none" stroke={wireActive} strokeWidth={2.6} />
              <polyline points={acPositiveDir ? `85,${midY - 27} 85,${acTopY} ${legAX},${acTopY}` : `${legAX},${acTopY} 85,${acTopY} 85,${midY - 27}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
              <polyline points={acPositiveDir ? `${legBX},${acBotY} 85,${acBotY} 85,${midY + 27}` : `85,${midY + 27} 85,${acBotY} ${legBX},${acBotY}`} fill="none" stroke={wireActive} strokeWidth={2.6} />
              <polyline points={acPositiveDir ? `${legBX},${acBotY} 85,${acBotY} 85,${midY + 27}` : `85,${midY + 27} 85,${acBotY} ${legBX},${acBotY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" />
            </>
          )}
          {on1 && (<><line x1={legAX} y1={acTopY} x2={legAX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={legAX} y1={acTopY} x2={legAX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on4 && (<><line x1={legAX} y1={botY} x2={legAX} y2={acTopY} stroke={wireActive} strokeWidth={2.6} /><line x1={legAX} y1={botY} x2={legAX} y2={acTopY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on3 && (<><line x1={legBX} y1={acBotY} x2={legBX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={legBX} y1={acBotY} x2={legBX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on2 && (<><line x1={legBX} y1={botY} x2={legBX} y2={acBotY} stroke={wireActive} strokeWidth={2.6} /><line x1={legBX} y1={botY} x2={legBX} y2={acBotY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

          {on1 && (<><line x1={legAX} y1={topY} x2={legBX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={legAX} y1={topY} x2={legBX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {(on1 || on3) && (<><line x1={legBX} y1={topY} x2={fwX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={legBX} y1={topY} x2={fwX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {(on1 || on3 || onFW) && (<><line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

          {(on4 || on2 || onFW) && (<><line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireActive} strokeWidth={2.6} /><line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {(on4 || on2) && (<><line x1={fwX} y1={botY} x2={legBX} y2={botY} stroke={wireActive} strokeWidth={2.6} /><line x1={fwX} y1={botY} x2={legBX} y2={botY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on4 && (<><line x1={legBX} y1={botY} x2={legAX} y2={botY} stroke={wireActive} strokeWidth={2.6} /><line x1={legBX} y1={botY} x2={legAX} y2={botY} stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

          <circle cx={85} cy={midY} r={27} fill={lightMode ? '#FFFFFF' : '#0F172A'} stroke={acLineActive ? '#10B981' : '#3B82F6'} strokeWidth={2.2} />
          <path d={`M 73 ${midY} Q 79 ${midY - 11} 85 ${midY} T 97 ${midY}`} fill="none" stroke={acLineActive ? '#10B981' : '#3B82F6'} strokeWidth={2.2} />
          <text x={85} y={midY + 48} textAnchor="middle" fill="#64748B" className="text-[10px] font-mono">vs = {currentPoint.v_sa.toFixed(1)}V</text>

          {renderSwitch('S1', legAX, 138, 'Ph A (Top)', 'UP')}
          {renderSwitch('S3', legBX, 138, 'Neut (Top)', 'UP')}
          {renderSwitch('S4', legAX, 312, 'Ph A (Bot)', 'UP')}
          {renderSwitch('S2', legBX, 312, 'Neut (Bot)', 'UP')}
          {renderFreewheelingBranch(fwX, topY, botY)}
          {renderLoadStage(loadX, topY, botY)}
        </svg>
      );
    }

    if (phase === '3P' && wave === 'HALF') {
      const l1 = getSwitchLabel('S1', switches), l2 = getSwitchLabel('S2', switches), l3 = getSwitchLabel('S3', switches);
      const on1 = activeSet.has(l1) && hasCurrent, on2 = activeSet.has(l2) && hasCurrent, on3 = activeSet.has(l3) && hasCurrent, onFW = activeSet.has('D_FW') && hasCurrent;
      const leg1X = 200, leg2X = 295, leg3X = 390, fwX = 475, yA = 195, yB = 235, yC = 275;
      const neutralReturnActive = on1 || on2 || on3;

      return (
        <svg viewBox="0 0 740 430" className="w-full h-full select-none">
          <line x1={leg1X} y1={topY} x2={loadX} y2={topY} stroke={wireBase} strokeWidth={1.8} />
          <polyline points={`${loadX},${botY} 45,${botY} 45,${yA}`} fill="none" stroke={wireBase} strokeWidth={1.8} />
          <line x1={leg1X} y1={yA} x2={leg1X} y2={topY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={leg2X} y1={yB} x2={leg2X} y2={topY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={leg3X} y1={yC} x2={leg3X} y2={topY} stroke={wireBase} strokeWidth={1.8} />
          <line x1={95} y1={yA} x2={leg1X} y2={yA} stroke={on1 ? wireActive : '#22C55E'} strokeOpacity={on1 ? 1 : 0.45} strokeWidth={on1 ? 2.6 : 1.6} />
          <line x1={95} y1={yB} x2={leg2X} y2={yB} stroke={on2 ? wireActive : '#EF4444'} strokeOpacity={on2 ? 1 : 0.45} strokeWidth={on2 ? 2.6 : 1.6} />
          <line x1={95} y1={yC} x2={leg3X} y2={yC} stroke={on3 ? wireActive : '#3B82F6'} strokeOpacity={on3 ? 1 : 0.45} strokeWidth={on3 ? 2.6 : 1.6} />

          {on1 && (<><polyline points={`95,${yA} ${leg1X},${yA} ${leg1X},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yA} ${leg1X},${yA} ${leg1X},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on2 && (<><polyline points={`95,${yB} ${leg2X},${yB} ${leg2X},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yB} ${leg2X},${yB} ${leg2X},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
          {on3 && (<><polyline points={`95,${yC} ${leg3X},${yC} ${leg3X},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yC} ${leg3X},${yC} ${leg3X},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

          {on1 && <line x1={leg1X} y1={topY} x2={leg2X} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
          {(on1 || on2) && <line x1={leg2X} y1={topY} x2={leg3X} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
          {(on1 || on2 || on3) && <line x1={leg3X} y1={topY} x2={fwX} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
          {(on1 || on2 || on3 || onFW) && (<><line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireActive} strokeWidth={2.6} /><line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireActive} strokeWidth={2.6} /></>)}
          {neutralReturnActive && (<><polyline points={`${fwX},${botY} 45,${botY} 45,${on1 ? yA : on2 ? yB : yC} 60,${on1 ? yA : on2 ? yB : yC}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`${fwX},${botY} 45,${botY} 45,${on1 ? yA : on2 ? yB : yC} 60,${on1 ? yA : on2 ? yB : yC}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

          {renderSwitch('S1', leg1X, 138, 'Phase A', 'UP')}
          {renderSwitch('S2', leg2X, 138, 'Phase B', 'UP')}
          {renderSwitch('S3', leg3X, 138, 'Phase C', 'UP')}
          {renderFreewheelingBranch(fwX, topY, botY)}
          {renderLoadStage(loadX, topY, botY)}
        </svg>
      );
    }

    // 3P FULL-BRIDGE
    const l1 = getSwitchLabel('S1', switches), l3 = getSwitchLabel('S3', switches), l5 = getSwitchLabel('S5', switches);
    const l4 = getSwitchLabel('S4', switches), l6 = getSwitchLabel('S6', switches), l2 = getSwitchLabel('S2', switches);
    const on1 = activeSet.has(l1) && hasCurrent, on3 = activeSet.has(l3) && hasCurrent, on5 = activeSet.has(l5) && hasCurrent;
    const on4 = activeSet.has(l4) && hasCurrent, on6 = activeSet.has(l6) && hasCurrent, on2 = activeSet.has(l2) && hasCurrent, onFW = activeSet.has('D_FW') && hasCurrent;
    const legAX = 195, legBX = 295, legCX = 395, fwX = 480, yA = 195, yB = 225, yC = 255;
    const upY = on1 ? yA : on3 ? yB : on5 ? yC : null;
    const lowY = on4 ? yA : on6 ? yB : on2 ? yC : null;

    return (
      <svg viewBox="0 0 740 430" className="w-full h-full select-none">
        <line x1={legAX} y1={topY} x2={loadX} y2={topY} stroke={wireBase} strokeWidth={1.8} />
        <line x1={legAX} y1={botY} x2={loadX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
        <line x1={legAX} y1={topY} x2={legAX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
        <line x1={legBX} y1={topY} x2={legBX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
        <line x1={legCX} y1={topY} x2={legCX} y2={botY} stroke={wireBase} strokeWidth={1.8} />
        <line x1={52} y1={yA} x2={52} y2={yC} stroke={wireBase} strokeWidth={1.8} />
        <line x1={95} y1={yA} x2={legAX} y2={yA} stroke={on1 || on4 ? wireActive : '#22C55E'} strokeOpacity={on1 || on4 ? 1 : 0.45} strokeWidth={on1 || on4 ? 2.6 : 1.6} />
        <line x1={95} y1={yB} x2={legBX} y2={yB} stroke={on3 || on6 ? wireActive : '#EF4444'} strokeOpacity={on3 || on6 ? 1 : 0.45} strokeWidth={on3 || on6 ? 2.6 : 1.6} />
        <line x1={95} y1={yC} x2={legCX} y2={yC} stroke={on5 || on2 ? wireActive : '#3B82F6'} strokeOpacity={on5 || on2 ? 1 : 0.45} strokeWidth={on5 || on2 ? 2.6 : 1.6} />

        {upY !== null && lowY !== null && upY !== lowY && (
          <><polyline points={`63,${lowY} 52,${lowY} 52,${upY} 63,${upY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`63,${lowY} 52,${lowY} 52,${upY} 63,${upY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>
        )}
        {on1 && (<><polyline points={`95,${yA} ${legAX},${yA} ${legAX},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yA} ${legAX},${yA} ${legAX},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
        {on3 && (<><polyline points={`95,${yB} ${legBX},${yB} ${legBX},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yB} ${legBX},${yB} ${legBX},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
        {on5 && (<><polyline points={`95,${yC} ${legCX},${yC} ${legCX},${topY}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`95,${yC} ${legCX},${yC} ${legCX},${topY}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
        {on4 && (<><polyline points={`${legAX},${botY} ${legAX},${yA} 95,${yA}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`${legAX},${botY} ${legAX},${yA} 95,${yA}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
        {on6 && (<><polyline points={`${legBX},${botY} ${legBX},${yB} 95,${yB}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`${legBX},${botY} ${legBX},${yB} 95,${yB}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}
        {on2 && (<><polyline points={`${legCX},${botY} ${legCX},${yC} 95,${yC}`} fill="none" stroke={wireActive} strokeWidth={2.6} /><polyline points={`${legCX},${botY} ${legCX},${yC} 95,${yC}`} fill="none" stroke={wireParticle} strokeWidth={3} strokeDasharray="6 6" className="animate-current-flow" /></>)}

        {on1 && <line x1={legAX} y1={topY} x2={legBX} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
        {(on1 || on3) && <line x1={legBX} y1={topY} x2={legCX} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
        {(on1 || on3 || on5) && <line x1={legCX} y1={topY} x2={fwX} y2={topY} stroke={wireActive} strokeWidth={2.6} />}
        {(on1 || on3 || on5 || onFW) && <line x1={fwX} y1={topY} x2={loadX} y2={topY} stroke={wireActive} strokeWidth={2.6} />}

        {(on4 || on6 || on2 || onFW) && <line x1={loadX} y1={botY} x2={fwX} y2={botY} stroke={wireActive} strokeWidth={2.6} />}
        {(on4 || on6 || on2) && <line x1={fwX} y1={botY} x2={legCX} y2={botY} stroke={wireActive} strokeWidth={2.6} />}
        {(on4 || on6) && <line x1={legCX} y1={botY} x2={legBX} y2={botY} stroke={wireActive} strokeWidth={2.6} />}
        {on4 && <line x1={legBX} y1={botY} x2={legAX} y2={botY} stroke={wireActive} strokeWidth={2.6} />}

        {renderSwitch('S1', legAX, 138, 'Ph A (Top)', 'UP')}
        {renderSwitch('S3', legBX, 138, 'Ph B (Top)', 'UP')}
        {renderSwitch('S5', legCX, 138, 'Ph C (Top)', 'UP')}
        {renderSwitch('S4', legAX, 312, 'Ph A (Bot)', 'UP')}
        {renderSwitch('S6', legBX, 312, 'Ph B (Bot)', 'UP')}
        {renderSwitch('S2', legCX, 312, 'Ph C (Bot)', 'UP')}
        {renderFreewheelingBranch(fwX, topY, botY)}
        {renderLoadStage(loadX, topY, botY)}
      </svg>
    );
  };

  return (
    <div className={`rounded-2xl border ${bgCard} flex flex-col justify-between overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${headerBorder} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="text-base font-bold tracking-tight">Interactive Circuit Schematic</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any switch on the diagram to toggle <span className="text-blue-600 font-semibold">Diode (D)</span> ⇄ <span className="text-emerald-600 font-semibold">Thyristor (T)</span>, or click <span className="font-mono font-semibold">D_FW</span>.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-slate-500">ACTIVE CONDUCTION PATH</div>
          <div className="text-xs font-mono font-semibold text-emerald-600">{currentPoint.activeLoopLabel}</div>
        </div>
      </div>
      <div className={`relative flex-1 min-h-[430px] ${canvasBg} flex items-center justify-center p-4`}>
        {renderCircuitCanvas()}
      </div>
    </div>
  );
}

