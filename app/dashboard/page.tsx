'use client';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { addTechnology, getTechnologies, deleteTechnology, checkDaily, markAsMastered } from '../../lib/techActions';
import confetti from 'canvas-confetti'; // Importamos el confeti

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [techs, setTechs] = useState<any[]>([]);
  const router = useRouter();

  // Función para refrescar la lista de tecnologías
  const refresh = async () => {
    if (user?.email) {
      const data = await getTechnologies(user.email);
      setTechs(data || []);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) router.replace('/login');
      else {
        setUser(currentUser);
        const data = await getTechnologies(currentUser.email || "");
        setTechs(data || []);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Si está cargando, mostramos un spinner bonito
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#1a1a1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-500 font-black text-xs uppercase tracking-widest">Sincronizando Stack...</p>
      </div>
    </div>
  );

  // Lógica del confeti al dominar una tecnología
  const handleMarkAsMastered = async (techId: string) => {
    await markAsMastered(techId);
    confetti({
      particleCount: 200, // Más partículas para más celebración
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#10b981', '#ffffff', '#3b82f6', '#f97316'] // Colores vibrantes
    });
    refresh();
  };

  const dominadasCount = techs.filter(t => t.status === 'Dominado').length;
  const totalTechs = techs.length;
  const porcentajeProgreso = totalTechs > 0 ? Math.round((dominadasCount / totalTechs) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white pb-20 selection:bg-blue-500/30 font-sans">
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-8 h-20 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center font-black italic text-lg shadow-md">D</div>
           <h1 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">Dev<span className="text-white">Track</span></h1>
        </div>
        <button onClick={() => signOut(auth)} className="text-[10px] font-bold border border-white/10 px-5 py-2 rounded-full hover:bg-red-500/20 transition-all uppercase tracking-widest text-red-400 hover:text-red-300">Cerrar Sesión</button>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12 mt-12">
        {/* SECCIÓN DE RESUMEN Y PROGRESO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tarjeta de Progreso General */}
          <div className="md:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-800 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-2">Progreso Global</p>
              <div className="text-7xl font-extrabold tracking-tighter mb-6">{porcentajeProgreso}%</div>
              <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 shadow-[0_0_25px_rgba(255,255,255,0.7)] transition-all duration-1000 ease-out" 
                  style={{ width: `${porcentajeProgreso}%` }} 
                />
              </div>
            </div>
            {/* Elemento decorativo */}
            <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700 opacity-20" />
          </div>

          {/* Tarjeta de Tecnologías Dominadas */}
          <div className="bg-white/[0.03] border border-white/10 p-12 rounded-[3.5rem] flex flex-col items-center justify-center text-center backdrop-blur-md shadow-2xl">
            <span className="text-6xl font-extrabold text-emerald-500 mb-2">{dominadasCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-tight">Tecnologías<br/>Dominadas</span>
          </div>
        </div>

        {/* INPUT FORM */}
        <section className="bg-white/[0.02] border border-white/5 p-3 rounded-[2.5rem] max-w-3xl mx-auto shadow-xl">
          <form action={async (fd) => { await addTechnology(fd, user?.email); refresh(); }} className="flex gap-2">
            <input 
              name="techName" 
              placeholder="¿Qué vas a dominar hoy?" 
              required 
              className="flex-1 bg-transparent px-6 py-5 outline-none font-bold text-lg placeholder:text-white/20 focus:bg-white/[0.04] rounded-2xl transition-all" 
            />
            <button className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:from-blue-600 hover:to-cyan-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">AÑADIR STACK</button>
          </form>
        </section>

        {/* TECH GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {techs.map((t) => (
            <div key={t.id} className="bg-white/[0.03] border border-white/10 p-8 rounded-[3rem] group relative transition-all hover:border-blue-500/40 shadow-xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${t.status === 'Dominado' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-orange-500/20 text-orange-400'}`}>
                  {t.status === 'Dominado' ? '🥇 COMPLETADO' : '🔥 ESTUDIANDO'}
                </span>
                <button onClick={() => deleteTechnology(t.id).then(refresh)} className="text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>

              <h3 className={`text-2xl font-extrabold tracking-tighter mb-4 ${t.status === 'Dominado' ? 'text-white/30 line-through' : 'text-white'}`}>{t.name}</h3>

              {/* CONTADOR DE RACHA MEJORADO */}
              <div className="bg-white/5 p-5 rounded-3xl mb-8 flex items-center justify-between border border-white/5 shadow-inner">
                <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Días de racha</span>
                   <span className={`text-4xl font-extrabold ${t.status === 'Dominado' ? 'text-emerald-400' : 'text-orange-500'}`}>{t.streak || 0}</span>
                </div>
                <div className={`text-4xl ${t.status === 'Dominado' ? 'text-emerald-500 opacity-90' : 'text-orange-500 opacity-30 animate-pulse'}`}>
                   {t.status === 'Dominado' ? '🏆' : '🔥'}
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex flex-col gap-3">
                {t.status !== 'Dominado' ? (
                  <>
                    <button 
                      onClick={async () => {
                        const res = await checkDaily(t.id);
                        if (res?.error) alert(res.error); // Podríamos cambiar esto por un toast más elegante
                        refresh();
                      }}
                      className="w-full py-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:from-blue-600 hover:to-cyan-700 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                    >
                      ⚡ FICHAR DÍA
                    </button>
                    <button 
                      onClick={() => handleMarkAsMastered(t.id)} // Llama a la nueva función con confeti
                      className="w-full py-3 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                      Marcar como Dominado
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4 bg-emerald-600/10 rounded-2xl border border-emerald-500/20 shadow-md">
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">¡Meta alcanzada en {t.streak} días! 🚀</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}