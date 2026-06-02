import { getUserPublicProfile } from '../../../lib/techActions';
import Link from 'next/link';

export default async function PublicProfilePage({ params }: { params: { email: string } }) {
  const decodedEmail = decodeURIComponent(params.email);
  const profile = await getUserPublicProfile(decodedEmail);

  if (!profile.email) {
    return (
      <div className="min-h-screen bg-[#1e2227] flex flex-col items-center justify-center text-white font-sans">
        <h1 className="text-4xl font-black italic uppercase mb-4">Usuario no encontrado</h1>
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 transition-all font-black uppercase tracking-widest text-xs">Volver al inicio</Link>
      </div>
    );
  }

  // Calculate Gamification Stats based on their techs
  let xp = 0;
  const stats = { learning: 0, practicing: 0, mastered: 0, notes: 0, resources: 0, maxStreak: 0 };
  
  profile.techs.forEach((t: any) => {
    if (t.status === 'Dominado') { xp += 1000; stats.mastered++; }
    else if (t.status === 'Practicando') { xp += 300; stats.practicing++; }
    else { xp += 100; stats.learning++; }
    
    const notesCount = t.notes?.length || 0;
    const resCount = t.resources?.length || 0;
    const currentStreak = t.streak || 0;

    xp += notesCount * 150;
    xp += resCount * 50;
    xp += currentStreak * 50;

    stats.notes += notesCount;
    stats.resources += resCount;
    if (currentStreak > stats.maxStreak) stats.maxStreak = currentStreak;
  });

  const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
  const currentLvlBaseXp = Math.pow(level - 1, 2) * 100;
  const nextLvlBaseXp = Math.pow(level, 2) * 100;
  const progress = ((xp - currentLvlBaseXp) / (nextLvlBaseXp - currentLvlBaseXp)) * 100;

  let rank = { name: "Hierro", color: "text-slate-400", bg: "bg-slate-400", border: "border-slate-400/20" };
  if (level >= 5 && level < 10) rank = { name: "Bronce", color: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400/20" };
  else if (level >= 10 && level < 15) rank = { name: "Plata", color: "text-gray-300", bg: "bg-gray-300", border: "border-gray-300/20" };
  else if (level >= 15 && level < 20) rank = { name: "Oro", color: "text-yellow-400", bg: "bg-yellow-400", border: "border-yellow-400/20" };
  else if (level >= 20 && level < 30) rank = { name: "Platino", color: "text-cyan-400", bg: "bg-cyan-400", border: "border-cyan-400/20" };
  else if (level >= 30 && level < 50) rank = { name: "Diamante", color: "text-indigo-400", bg: "bg-indigo-400", border: "border-indigo-400/20" };
  else if (level >= 50) rank = { name: "Leyenda", color: "text-fuchsia-500", bg: "bg-fuchsia-500", border: "border-fuchsia-500/20" };

  // Calcular Badges / Logros del Usuario
  const badges = [];
  if (profile.techs.length > 0) badges.push({ icon: "🌱", name: "Primeros Pasos", desc: "Añadió su primera tecnología." });
  if (stats.notes >= 5) badges.push({ icon: "📚", name: "Erudito", desc: "Ha escrito 5 o más apuntes." });
  if (stats.mastered >= 1) badges.push({ icon: "🏆", name: "Maestro", desc: "Ha dominado al menos 1 tecnología." });
  if (stats.maxStreak >= 5) badges.push({ icon: "🔥", name: "Imparable", desc: "Alcanzó una racha de 5 días o más." });
  if (stats.resources >= 10) badges.push({ icon: "💾", name: "Librería Viva", desc: "Guardó 10 o más recursos." });

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans selection:bg-indigo-500/30 text-left">
      <nav className="bg-[#16191d] sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-xl">
        <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
           <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform -rotate-3">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-indigo-400">Track</span></h1>
        </Link>
        <div className="flex gap-4">
          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Comunidad</Link>
          <Link href="/dashboard" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-12">
        {/* HEADER DEL PERFIL PUBLICO */}
        <div className="bg-[#282c34] rounded-[4rem] border border-white/5 p-12 mb-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className={`absolute inset-0 opacity-5 bg-gradient-to-r from-transparent via-current to-transparent ${rank.color}`}></div>
          
          <div className="relative z-10 flex-shrink-0">
            <div className="relative">
              <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-lg border-2 ${rank.bg} ${rank.border} shadow-current/20`}>
                {rank.name.charAt(0)}
              </div>
              <div className="absolute -bottom-4 -right-4 bg-[#1e2227] border-2 border-white/10 text-white font-black text-sm px-4 py-2 rounded-full shadow-xl">
                Lvl {level}
              </div>
            </div>
          </div>
          
          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[12px] font-black text-white/50 tracking-[0.4em] uppercase mb-2 italic">Perfil Público</p>
                <h2 className={`text-6xl font-black italic uppercase tracking-tighter ${rank.color}`}>{profile.username}</h2>
              </div>
              <div className="text-right hidden md:block">
                <span className="block text-3xl font-black text-white">{xp} XP</span>
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Experiencia Total</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
              <span className="px-5 py-2 bg-black/20 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-400">🏆 {stats.mastered} Dominadas</span>
              <span className="px-5 py-2 bg-black/20 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-indigo-400">📝 {profile.posts.length} Posts</span>
              <span className="px-5 py-2 bg-black/20 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-orange-400">🔥 Racha Máxima: {stats.maxStreak}</span>
            </div>
          </div>
        </div>

        {/* VITRINA DE TROFEOS (LOGROS) */}
        {badges.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-black italic uppercase text-white/50 mb-6 tracking-widest">Vitrina de Trofeos</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {badges.map((badge, i) => (
                <div key={i} className="bg-[#282c34] p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center shadow-lg group hover:border-indigo-500/30 transition-all">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{badge.icon}</span>
                  <h4 className="text-xs font-black text-white/90 uppercase tracking-widest mb-1">{badge.name}</h4>
                  <p className="text-[9px] text-white/40 uppercase leading-tight">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* STACK DEL USUARIO */}
          <div className="bg-[#282c34] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase text-white/90 mb-8 tracking-tighter border-b border-white/5 pb-6">Stack Tecnológico</h3>
            
            <div className="space-y-4">
              {profile.techs.length > 0 ? profile.techs.map((t: any) => (
                <div key={t.id} className="bg-[#1a1d23] p-5 rounded-3xl border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">🚀</span>
                    <span className="text-lg font-black uppercase text-white/80 group-hover:text-white transition-colors">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.streak > 0 && <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">🔥 {t.streak}</span>}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border italic ${
                      t.status === 'Dominado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      t.status === 'Practicando' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>{t.status}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-white/30 text-xs font-black uppercase tracking-widest mb-2">Workspace Vacío</p>
                  <p className="text-white/10 text-[10px] uppercase">Este usuario aún no ha configurado su stack.</p>
                </div>
              )}
            </div>
          </div>

          {/* POSTS DEL USUARIO */}
          <div className="bg-[#282c34] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase text-white/90 mb-8 tracking-tighter border-b border-white/5 pb-6">Aportes a la Comunidad</h3>
            
            <div className="space-y-6 max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
              {profile.posts.length > 0 ? profile.posts.map((post: any) => (
                <div key={post.id} className="bg-[#1a1d23] p-8 rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{post.tech}</p>
                    <span className="text-[10px] font-black bg-white/5 text-white/30 px-3 py-1 rounded-full">▲ {post.likes?.length || 0} Likes</span>
                  </div>
                  <h4 className="text-xl font-black uppercase text-white/90 mb-4 tracking-tight">{post.title}</h4>
                  <div className="bg-black/20 p-5 rounded-2xl text-white/50 text-sm italic border border-white/5 leading-relaxed">
                    "{post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}"
                  </div>
                  {post.video_url && (
                    <div className="mt-4 text-[10px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2">
                      <span>🎥</span> Contiene Video Adjunto
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-white/30 text-xs font-black uppercase tracking-widest mb-2">Sin Actividad</p>
                  <p className="text-white/10 text-[10px] uppercase">No hay publicaciones recientes.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}