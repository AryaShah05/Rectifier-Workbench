// =========================================================================
// 3. WAVEFORM OSCILLOSCOPE COMPONENT
// =========================================================================
function WaveformOscilloscope({ params, result, currentDeg, onChangeDeg, lightMode }) {
  const [activeTab, setActiveTab] = useState('SUPERIMPOSED');
  const [numCycles, setNumCycles] = useState(1);
  const [showVavg, setShowVavg] = useState(true);
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const maxDeg = numCycles === 1 ? 360 : 720;
  const visiblePoints = result.points.slice(0, maxDeg + 1);
  const { metrics } = result;

  const conductionBlocks = [];
  for (let i = 0; i < visiblePoints.length; i++) {
    const pt = visiblePoints[i];
    const isOff = pt.activeSwitches.length === 0 || pt.i_o <= 0.01;
    const lbl = isOff ? 'OFF' : pt.activeSwitches.join(' ');
    if (conductionBlocks.length === 0 || conductionBlocks[conductionBlocks.length - 1].label !== lbl) {
      conductionBlocks.push({ startDeg: pt.deg, endDeg: pt.deg + 1, label: lbl, isOff });
    } else {
      conductionBlocks[conductionBlocks.length - 1].endDeg = pt.deg + 1;
    }
  }

  const padLeft = 46, padRight = 18, plotW = 680 - padLeft - padRight;
  const degToX = (deg) => padLeft + (deg / maxDeg) * plotW;

  const handlePointerEvent = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 680;
    const clampedX = Math.max(padLeft, Math.min(padLeft + plotW, relX));
    const deg = ((clampedX - padLeft) / plotW) * maxDeg;
    onChangeDeg(Math.round(deg * 2) / 2);
  };

  const vMax = Math.ceil(((params.phase === '3P' ? metrics.V_m_LL : metrics.V_m) * 1.15) / 25) * 25;
  const iPeak = Math.max(1, ...visiblePoints.map((p) => Math.max(Math.abs(p.i_o), Math.abs(p.i_sa))));
  const iMax = Math.ceil(iPeak * 1.2);

  const buildPath = (pts, getVal, yZero, yHalfSpan, maxVal) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${degToX(p.deg).toFixed(1)} ${(yZero - (getVal(p) / maxVal) * yHalfSpan).toFixed(1)}`).join(' ');

  const bgCard = lightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#111827] border-slate-800 text-slate-100';
  const plotBg = lightMode ? '#F8FAFC' : '#0B0F19';
  const gridCol = lightMode ? '#E2E8F0' : '#1E293B';
  const headerBorder = lightMode ? 'border-slate-200' : 'border-slate-800';
  const cursorDegInView = currentDeg % maxDeg;
  const cursorX = degToX(cursorDegInView);
  const activePt = visiblePoints[Math.min(visiblePoints.length - 1, Math.round(cursorDegInView))] || visiblePoints[0];

  const renderSuperimposedPlot = () => {
    const vTop = 18, vHeight = 164, vZero = vTop + vHeight / 2, vSpan = vHeight / 2 - 10;
    const iTop = 204, iHeight = 132, iZero = iTop + iHeight / 2, iSpan = iHeight / 2 - 10;
    const barTop = 352, barHeight = 24;

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 680 388"
        className="w-full h-full select-none cursor-crosshair touch-none"
        onPointerDown={(e) => { setIsDragging(true); handlePointerEvent(e); }}
        onPointerMove={(e) => { if (isDragging) handlePointerEvent(e); }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <rect x={padLeft} y={vTop} width={plotW} height={vHeight} rx={4} fill={plotBg} stroke={gridCol} />
        <rect x={padLeft} y={iTop} width={plotW} height={iHeight} rx={4} fill={plotBg} stroke={gridCol} />
        <line x1={padLeft} y1={vZero} x2={padLeft + plotW} y2={vZero} stroke={gridCol} />
        <line x1={padLeft} y1={iZero} x2={padLeft + plotW} y2={iZero} stroke={gridCol} />
        <text x={padLeft + 10} y={vTop + 15} fill="#64748B" className="text-[10.5px] font-semibold">Voltage Waveforms (v_s &amp; v_o)</text>
        <text x={padLeft + 10} y={iTop + 15} fill="#64748B" className="text-[10.5px] font-semibold">Current Waveforms (i_o &amp; i_s)</text>

        <path d={buildPath(visiblePoints, (p) => p.v_sa, vZero, vSpan, vMax)} fill="none" stroke="#38BDF8" strokeWidth={1.3} strokeDasharray="4 4" />
        {showVavg && (
          <line x1={padLeft} y1={vZero - (metrics.V_dc / vMax) * vSpan} x2={padLeft + plotW} y2={vZero - (metrics.V_dc / vMax) * vSpan} stroke="#A855F7" strokeWidth={1.4} strokeDasharray="5 4" />
        )}
        <path d={buildPath(visiblePoints, (p) => p.v_o, vZero, vSpan, vMax)} fill="none" stroke="#10B981" strokeWidth={2.4} />
        <path d={buildPath(visiblePoints, (p) => p.i_sa, iZero, iSpan, iMax)} fill="none" stroke="#6366F1" strokeWidth={1.6} />
        <path d={buildPath(visiblePoints, (p) => p.i_o, iZero, iSpan, iMax)} fill="none" stroke="#F59E0B" strokeWidth={2.3} />

        {conductionBlocks.map((blk, i) => {
          const x1 = degToX(blk.startDeg), x2 = degToX(Math.min(maxDeg, blk.endDeg)), w = Math.max(1, x2 - x1);
          return (
            <g key={i}>
              <rect x={x1} y={barTop} width={w} height={barHeight} rx={2} fill={blk.isOff ? plotBg : 'rgba(16, 185, 129, 0.16)'} stroke={blk.isOff ? gridCol : '#10B981'} />
              {w > 22 && <text x={x1 + w / 2} y={barTop + 15} textAnchor="middle" fill={blk.isOff ? '#64748B' : '#059669'} className="text-[9.5px] font-mono font-bold">{blk.label}</text>}
            </g>
          );
        })}

        <line x1={cursorX} y1={vTop} x2={cursorX} y2={barTop + barHeight} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="3 3" />
      </svg>
    );
  };

  const renderFourChannelStack = () => {
    const chHeight = 76, chGap = 14;
    const channels = [
      { title: 'Ch 1: AC Supply Voltage [V]', yTop: 10, maxVal: vMax, fn: (p) => p.v_sa, col: '#22C55E' },
      { title: 'Ch 2: AC Line Current [A]', yTop: 10 + (chHeight + chGap), maxVal: iMax, fn: (p) => p.i_sa, col: '#3B82F6' },
      { title: 'Ch 3: DC Output Voltage [V]', yTop: 10 + 2 * (chHeight + chGap), maxVal: vMax, fn: (p) => p.v_o, col: '#10B981' },
      { title: 'Ch 4: DC Load Current [A]', yTop: 10 + 3 * (chHeight + chGap), maxVal: iMax, fn: (p) => p.i_o, col: '#F59E0B' },
    ];
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 680 388"
        className="w-full h-full select-none cursor-crosshair touch-none"
        onPointerDown={(e) => { setIsDragging(true); handlePointerEvent(e); }}
        onPointerMove={(e) => { if (isDragging) handlePointerEvent(e); }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        {channels.map((ch, idx) => {
          const yZero = ch.yTop + chHeight / 2, ySpan = chHeight / 2 - 6;
          return (
            <g key={idx}>
              <rect x={padLeft} y={ch.yTop} width={plotW} height={chHeight} rx={3} fill={plotBg} stroke={gridCol} />
              <line x1={padLeft} y1={yZero} x2={padLeft + plotW} y2={yZero} stroke={gridCol} />
              <text x={padLeft + 8} y={ch.yTop + 12} fill="#64748B" className="text-[9.5px] font-semibold">{ch.title}</text>
              <path d={buildPath(visiblePoints, ch.fn, yZero, ySpan, ch.maxVal)} fill="none" stroke={ch.col} strokeWidth={2} />
            </g>
          );
        })}
        <line x1={cursorX} y1={10} x2={cursorX} y2={370} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="3 3" />
      </svg>
    );
  };

  return (
    <div className={`rounded-2xl border ${bgCard} flex flex-col justify-between overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${headerBorder} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-1 p-1 rounded-xl border bg-slate-100 border-slate-200">
          <button onClick={() => setActiveTab('SUPERIMPOSED')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeTab === 'SUPERIMPOSED' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Superimposed Waveforms</button>
          <button onClick={() => setActiveTab('CHANNELS')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeTab === 'CHANNELS' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>4-Channel Split</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setNumCycles(numCycles === 1 ? 2 : 1)} className={`px-3 py-1.5 rounded-lg border ${headerBorder} text-xs font-mono cursor-pointer`}>{numCycles === 1 ? '1 Cycle (360°)' : '2 Cycles (720°)'}</button>
          <button onClick={() => setShowVavg(!showVavg)} className="px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-600 text-xs font-mono font-semibold cursor-pointer">V_avg</button>
        </div>
      </div>
      {activeTab === 'SUPERIMPOSED' && (
        <div className="px-6 pt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono font-semibold">
          <span style={{ color: '#38BDF8' }}>┄ v_s</span>
          <span style={{ color: '#10B981' }}>━ v_o</span>
          <span style={{ color: '#A855F7' }}>┄ V_avg</span>
          <span style={{ color: '#6366F1' }}>━ i_s</span>
          <span style={{ color: '#F59E0B' }}>━ i_o</span>
        </div>
      )}
      <div className="relative flex-1 min-h-[400px] p-2">
        {activeTab === 'SUPERIMPOSED' ? renderSuperimposedPlot() : renderFourChannelStack()}
      </div>
      <div className={`px-6 py-3.5 border-t ${headerBorder} flex items-center gap-4 bg-slate-50`}>
        <span className="text-xs font-mono font-medium text-slate-500 shrink-0">Scrub Phase Angle ωt:</span>
        <input type="range" min={0} max={maxDeg} step={0.5} value={cursorDegInView} onChange={(e) => onChangeDeg(parseFloat(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer" />
        <div className="shrink-0 text-right font-mono text-xs font-bold text-blue-600 w-32">{cursorDegInView.toFixed(1)}° ({activePt.timeMs.toFixed(1)}ms)</div>
      </div>
    </div>
  );
}

