import { getUserPublicProfile } from '../../../lib/techActions';
import Link from 'next/link';

export default async function PublicProfilePage(props: any) {
  // Extraer params resolviendo la Promesa para compatibilidad estricta con Next.js 15
  const params = await props.params;
  const emailParam = params?.email || '';
  const decodedEmail = decodeURIComponent(emailParam);
  
  // Proteger contra enlaces vacíos
  if (!decodedEmail || decodedEmail === 'undefined') {
    return (
      <div className="min-h-screen bg-[#1e2227] flex items-center justify-center flex-col gap-6 text-center px-4">
        <div className="text-6xl mb-4">🕵️‍♂️</div>
        <h1 className="text-4xl font-black text-indigo-400 italic uppercase tracking-tighter">Enlace Inválido</h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-sm mb-4">El enlace al que intentas acceder está vacío.</p>
        <Link href="/dashboard" className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg">Volver al Inicio</Link>
      </div>
    );
  }

  const profile = await getUserPublicProfile(decodedEmail);

  // Si el perfil devuelve null, significa que realmente no existe
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#1e2227] flex items-center justify-center flex-col gap-6 text-center px-4">
        <div className="text-6xl mb-4">🕵️‍♂️</div>
        <h1 className="text-4xl font-black text-indigo-400 italic uppercase tracking-tighter">Usuario no encontrado</h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-sm mb-4">El usuario {decodedEmail} no existe o no tiene perfil público.</p>
        <Link href="/dashboard" className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg">Volver al Inicio</Link>
      </div>
    );
  }

  // Filtrar el marcador oculto de la cuenta
  const validTechs = profile.techs?.filter((t: any) => t.name !== '__DEVTRACK_ACCOUNT__') || [];
  
  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans relative text-left">
      {/* CABECERA */}
      <nav className="bg-[#16191d] px-8 h-24 flex items-center border-b border-white/5 shadow-xl mb-12">
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-[0.3em] text-[10px] transition-colors flex items-center gap-2">
          <span className="text-lg leading-none mb-0.5">←</span> VOLVER A DEVTRACK
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        
        {/* TARJETA PRINCIPAL DEL PERFIL */}
        <div className="bg-[#282c34] p-10 md:p-14 rounded-[4rem] border border-white/5 shadow-2xl mb-12 flex flex-col md:flex-row items-center gap-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-40 h-40 bg-indigo-500/10 rounded-[3rem] flex items-center justify-center text-7xl border border-indigo-500/20 shadow-inner shrink-0 text-indigo-400 font-black italic uppercase">
            {profile.username.charAt(0)}
          </div>
          <div className="text-center md:text-left flex-1 min-w-0">
            <p className="text-indigo-400/80 font-black uppercase tracking-[0.4em] text-[10px] mb-2 italic">Perfil de Desarrollador</p>
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start mb-2">
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-white truncate max-w-full">@{profile.username}</h1>
              {profile.role === 'admin' && <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20 shrink-0">Admin</span>}
              {profile.role === 'banned' && <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-500/20 shrink-0">Baneado</span>}
            </div>
            <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-xs truncate">{profile.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 shrink-0">
            <div className="text-center bg-black/20 px-8 py-5 rounded-3xl border border-white/5">
              <span className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Techs</span>
              <span className="text-4xl font-black text-emerald-400">{validTechs.length}</span>
            </div>
            <div className="text-center bg-black/20 px-8 py-5 rounded-3xl border border-white/5">
              <span className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Aportes</span>
              <span className="text-4xl font-black text-indigo-400">{profile.posts?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* COLUMNA STACK */}
          <div className="animate-in fade-in slide-in-from-bottom-8 delay-100">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl opacity-50">🚀</span>
              <h2 className="text-2xl font-black italic uppercase text-white/90 tracking-widest">Stack Tecnológico</h2>
            </div>
            <div className="space-y-4">
              {validTechs.map((t: any) => (
                <div key={t.id} className="bg-[#1a1d23] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between hover:border-indigo-500/20 transition-all shadow-xl group">
                  <h3 className="text-2xl font-black uppercase text-white/80 italic tracking-tighter group-hover:text-indigo-400 transition-colors">{t.name}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border italic ${
                    t.status === 'Dominado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    t.status === 'Practicando' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>{t.status}</span>
                </div>
              ))}
              {validTechs.length === 0 && (
                <div className="bg-black/20 p-10 rounded-3xl border border-white/5 text-center">
                  <p className="text-white/30 font-bold uppercase tracking-widest text-xs">Este usuario no tiene tecnologías en su stack público.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA POSTS */}
          <div className="animate-in fade-in slide-in-from-bottom-8 delay-200">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl opacity-50">📝</span>
              <h2 className="text-2xl font-black italic uppercase text-white/90 tracking-widest">Aportes Públicos</h2>
            </div>
            <div className="space-y-4">
              {profile.posts?.map((p: any) => (
                <div key={p.id} className="bg-[#1a1d23] p-8 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/20 transition-all shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-indigo-400/70 uppercase tracking-[0.3em] bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">{p.tech}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">▲ {p.likes?.length || 0} Likes</span>
                  </div>
                  <h3 className="text-xl font-black uppercase text-white/90 mb-4 tracking-tight leading-snug">{p.title}</h3>
                  <p className="text-[13px] text-white/40 italic leading-relaxed line-clamp-3">"{p.content}"</p>
                </div>
              ))}
              {(!profile.posts || profile.posts.length === 0) && (
                <div className="bg-black/20 p-10 rounded-3xl border border-white/5 text-center">
                  <p className="text-white/30 font-bold uppercase tracking-widest text-xs">Este usuario no ha publicado contenido.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}