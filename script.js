const fs = require('fs');
const path = 'app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for active tab in gamification modal
const stateHookStr = "  const [showGamificationModal, setShowGamificationModal] = useState(false);";
const newStateHooks = "  const [showGamificationModal, setShowGamificationModal] = useState(false);\n  const [gamiTab, setGamiTab] = useState('stats'); // stats, quests, rewards";
content = content.replace(stateHookStr, newStateHooks);

// 2. Add Quests logic inside gamification useMemo
const gamificationMemoStart = "const badges = [];";
const questsLogic = `
    // Daily Quests (Misiones Diarias Generadas Dinámicamente)
    const today = new Date().toLocaleDateString();
    // Deterministic random based on today's date and user email length to keep quests consistent for the day
    const seed = today.split('/').join('') + techs.length;
    
    const quests = [
      { id: 1, title: 'El Coleccionista', desc: 'Guarda al menos 3 recursos en total.', target: 3, current: stats.resources, xp: 150, icon: '💾' },
      { id: 2, title: 'Erudito Constante', desc: 'Alcanza una racha de fuego de 3 días.', target: 3, current: stats.maxStreak, xp: 300, icon: '🔥' },
      { id: 3, title: 'Maestro del Código', desc: 'Domina al menos 1 tecnología.', target: 1, current: stats.mastered, xp: 500, icon: '🏆' },
      { id: 4, title: 'Lector Empedernido', desc: 'Escribe 5 apuntes en total.', target: 5, current: stats.notes, xp: 200, icon: '📝' }
    ].sort((a, b) => (a.id * Number(seed)) % 5 - (b.id * Number(seed)) % 5).slice(0, 3); // Pick 3 daily

    // Rewards (Unlockables)
    const rewards = [
      { level: 5, name: 'Borde de Bronce', type: 'Marco', icon: '🥉' },
      { level: 10, name: 'Título: El Coder', type: 'Título', icon: '🏷️' },
      { level: 15, name: 'Tema Oscuro Profundo', type: 'Tema', icon: '🌙' },
      { level: 20, name: 'Borde de Platino', type: 'Marco', icon: '💎' },
      { level: 30, name: 'Modo Dios', type: 'Especial', icon: '⚡' }
    ];

    const badges = [];`;
content = content.replace(gamificationMemoStart, questsLogic);

// 3. Add quests and rewards to return
const returnStr = "return { xp, level, nextLvlBaseXp, progress, rank, stats, badges };";
const newReturnStr = "return { xp, level, nextLvlBaseXp, progress, rank, stats, badges, quests, rewards };";
content = content.replace(returnStr, newReturnStr);


// 4. Update the Gamification Modal HTML
const oldModalMarker = "{/* MODAL PERFIL GAMIFICACIÓN */}";

const parts = content.split(oldModalMarker);
if (parts.length > 1) {
  const beforeModal = parts[0];

  const newModal = `{/* MODAL PERFIL GAMIFICACIÓN (GAMIFICATION HUB 2.0) */}
      {showGamificationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:p-8 bg-[#0f1115]/95 backdrop-blur-sm" onClick={() => setShowGamificationModal(false)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1e2227] overflow-hidden rounded-[3rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            
            {/* HEADER DEL PERFIL */}
            <div className="p-8 lg:p-10 border-b border-white/5 relative overflow-hidden flex items-center justify-between shrink-0">
              <div className={\`absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-current to-transparent \${gamification.rank.color}\`}></div>
              <div className="relative z-10 flex items-center gap-8">
                <div className="relative">
                  <div className={\`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg border \${gamification.rank.bg} \${gamification.rank.border} shadow-current/20\`}>
                    {gamification.rank.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-[#1e2227] border border-white/10 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
                    Lvl {gamification.level}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-black text-white/50 tracking-[0.4em] uppercase mb-1 italic">DevTrack Profile</p>
                  <h2 className={\`text-5xl font-black italic uppercase tracking-tighter \${gamification.rank.color}\`}>{user?.email?.split('@')[0] || 'Developer'}</h2>
                  <p className={\`text-sm font-bold uppercase tracking-widest mt-2 \${gamification.rank.color} opacity-80\`}>Rango: {gamification.rank.name}</p>
                </div>
              </div>
              <button onClick={() => setShowGamificationModal(false)} className="relative z-10 w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-2xl font-light text-white/50 hover:text-white">✕</button>
            </div>

            {/* NAVEGACIÓN DE TABS */}
            <div className="flex px-10 border-b border-white/5 shrink-0 bg-[#16191d]">
               {['stats', 'quests', 'rewards'].map((tab) => (
                 <button 
                   key={tab}
                   onClick={() => setGamiTab(tab)}
                   className={\`px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all \${gamiTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}\`}
                 >
                   {tab === 'stats' ? '📊 Estadísticas' : tab === 'quests' ? '🎯 Misiones' : '🎁 Recompensas'}
                 </button>
               ))}
            </div>
            
            {/* CONTENIDO DESLIZABLE */}
            <div className="p-10 lg:p-12 flex-1 overflow-y-auto scrollbar-hide">
              
              {/* TAB: ESTADÍSTICAS */}
              {gamiTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 italic">Estadísticas de Combate</h3>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Tecnologías Dominadas</span>
                      <span className="text-lg font-black text-emerald-400">{gamification.stats.mastered} <span className="text-[10px] text-emerald-400/50 ml-2">({gamification.stats.mastered * 1000} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">En Práctica</span>
                      <span className="text-lg font-black text-amber-400">{gamification.stats.practicing} <span className="text-[10px] text-amber-400/50 ml-2">({gamification.stats.practicing * 300} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Aprendiendo</span>
                      <span className="text-lg font-black text-indigo-400">{gamification.stats.learning} <span className="text-[10px] text-indigo-400/50 ml-2">({gamification.stats.learning * 100} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Apuntes Creados</span>
                      <span className="text-lg font-black text-blue-400">{gamification.stats.notes} <span className="text-[10px] text-blue-400/50 ml-2">({gamification.stats.notes * 150} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Racha Máxima (Días)</span>
                      <span className="text-lg font-black text-orange-400">{gamification.stats.maxStreak} <span className="text-[10px] text-orange-400/50 ml-2">({gamification.stats.maxStreak * 50} XP)</span></span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 italic">Logros Desbloqueados</h3>
                    {gamification.badges.length === 0 ? (
                      <div className="bg-black/20 p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center h-64">
                        <span className="text-5xl block mb-4 opacity-20">🏆</span>
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Aún no tienes logros.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {gamification.badges.map((badge, i) => (
                          <div key={i} className="flex items-center gap-5 bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-indigo-500/50 transition-all group">
                            <div className="w-14 h-14 bg-[#282c34] rounded-xl border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                              {badge.icon}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white/90 uppercase tracking-wider group-hover:text-indigo-300 transition-colors">{badge.name}</h4>
                              <p className="text-[11px] text-white/40 uppercase mt-1 leading-tight">{badge.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: MISIONES DIARIAS */}
              {gamiTab === 'quests' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl mb-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-indigo-400 uppercase tracking-widest italic mb-2">Tablón de Misiones</h3>
                      <p className="text-xs text-indigo-200/60 font-bold uppercase tracking-wider">Completa estos objetivos para ganar XP extra. Se renuevan diariamente.</p>
                    </div>
                    <div className="text-4xl">🎯</div>
                  </div>

                  <div className="space-y-6">
                    {gamification.quests.map((q) => {
                      const isCompleted = q.current >= q.target;
                      const progressPercent = Math.min((q.current / q.target) * 100, 100);
                      
                      return (
                        <div key={q.id} className={\`p-6 rounded-3xl border transition-all flex items-center gap-8 \${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-black/20 border-white/5 hover:border-indigo-500/30'}\`}>
                          <div className={\`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 \${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#282c34] text-white/50'}\`}>
                            {isCompleted ? '✓' : q.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={\`text-lg font-black uppercase tracking-wider \${isCompleted ? 'text-emerald-400' : 'text-white'}\`}>{q.title}</h4>
                              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/5 text-indigo-300 uppercase tracking-widest border border-white/10">+{q.xp} XP</span>
                            </div>
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-4">{q.desc}</p>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex-1 bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                <div className={\`h-full transition-all duration-1000 \${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}\`} style={{ width: \`\${progressPercent}%\` }}></div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 w-12 text-right">
                                {Math.min(q.current, q.target)} / {q.target}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB: RECOMPENSAS */}
              {gamiTab === 'rewards' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl mb-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-amber-400 uppercase tracking-widest italic mb-2">Progreso y Recompensas</h3>
                      <p className="text-xs text-amber-200/60 font-bold uppercase tracking-wider">Desbloquea contenido cosmético al subir de nivel.</p>
                    </div>
                    <div className="text-4xl">🎁</div>
                  </div>

                  <div className="relative border-l-2 border-white/10 ml-8 space-y-12 pb-12">
                    {gamification.rewards.map((r) => {
                      const isUnlocked = gamification.level >= r.level;
                      
                      return (
                        <div key={r.level} className="relative pl-12 flex items-center gap-8">
                          {/* Nodo del Timeline */}
                          <div className={\`absolute -left-[25px] w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-black transition-all \${isUnlocked ? 'bg-amber-500 border-[#1e2227] text-[#1e2227] shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-[#282c34] border-[#1e2227] text-white/30'}\`}>
                            {r.level}
                          </div>

                          <div className={\`flex-1 p-6 rounded-3xl border flex items-center gap-6 transition-all \${isUnlocked ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10' : 'bg-black/20 border-white/5 opacity-60 grayscale'}\`}>
                            <div className="text-4xl">{r.icon}</div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 block mb-1">Recompensa Nvl {r.level} • {r.type}</span>
                              <h4 className={\`text-xl font-black uppercase italic tracking-tighter \${isUnlocked ? 'text-amber-400' : 'text-white/50'}\`}>{r.name}</h4>
                            </div>
                            <div className="ml-auto">
                               {isUnlocked ? (
                                 <span className="px-4 py-2 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-amber-500/30">Desbloqueado</span>
                               ) : (
                                 <span className="px-4 py-2 bg-black/50 text-white/30 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5">Bloqueado</span>
                               )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
  content = beforeModal + newModal;
  fs.writeFileSync(path, content, 'utf8');
}
