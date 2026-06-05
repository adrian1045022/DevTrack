'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  addTechnology, getTechnologies, deleteTechnology, 
  addResourceToTech, removeResource, addNoteToTech, removeNote,
  getCommunityPosts, toggleLike, globalSearch, updateTechStatus,
  recordUserLogin, getUserRole,
  addTodoToTech, toggleTodoInTech, removeTodoFromTech
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';
import NoteRenderer from '../../components/NoteRenderer';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [techs, setTechs] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{myTechs: any[], communityPosts: any[]}>({myTechs: [], communityPosts: []});
  
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [relatedHacks, setRelatedHacks] = useState<any[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const [gamiTab, setGamiTab] = useState('stats');
  const router = useRouter();

  const refresh = useCallback(async (email: string) => {
    if (!email) return;
    const data = await getTechnologies(email);
    setTechs(data || []);
    if (selectedTech) {
      const updated = data.find((t: any) => t.id === selectedTech.id);
      if (updated) setSelectedTech(updated);
    }
  }, [selectedTech]);

  const handleStatusChange = async (techId: string, newStatus: string) => {
    const success = await updateTechStatus(techId, newStatus);
    if (success && user?.email) {
      await refresh(user.email);
    }
  };

  const filteredTechs = useMemo(() => techs.filter(t => {
    if (t.name === '__DEVTRACK_ACCOUNT__') return false;
    if (activeFilter === "TODOS") return true;
    return t.status.toUpperCase() === activeFilter;
  }), [techs, activeFilter]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery("");
        setViewingNote(null);
        setShowNoteForm(false);
        setSelectedTech(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length > 1 && user?.email) {
        const results = await globalSearch(searchQuery, user.email);
        setSearchResults(results);
      } else {
        setSearchResults({myTechs: [], communityPosts: []});
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user?.email]);

  useEffect(() => {
    if (selectedTech) {
      getCommunityPosts().then((allPosts) => {
        const filtered = allPosts.filter(
          (post: any) => post.tech.toUpperCase() === selectedTech.name.toUpperCase()
        ).slice(0, 4);
        setRelatedHacks(filtered);
      });
    } else {
      setRelatedHacks([]);
    }
  }, [selectedTech]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) router.replace('/login');
      else {
        setUser(currentUser);
        if (currentUser.email) {
          await recordUserLogin(currentUser.email);
          const userRole = await getUserRole(currentUser.email);
          setRole(userRole);
        }
        
        const data = await getTechnologies(currentUser.email || "");
        setTechs(data || []);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const gamification = useMemo(() => {
    let xp = 0;
    const stats = { learning: 0, practicing: 0, mastered: 0, notes: 0, resources: 0, maxStreak: 0 };
    
    techs.forEach(t => {
      if (t.name === '__DEVTRACK_ACCOUNT__') {
        xp += t.streak || 0;
        return;
      }

      if (t.status === 'Dominado') { xp += 1000; stats.mastered++; }
      else if (t.status === 'Practicando') { xp += 300; stats.practicing++; }
      else { xp += 100; stats.learning++; }

      const notesCount = t.notes?.length || 0;
      const resCount = t.resources?.length || 0;
      const currentStreak = t.streak || 0;
      const completedTodos = t.todos?.filter((x: any) => x.completed).length || 0;

      xp += notesCount * 150;
      xp += resCount * 50;
      xp += currentStreak * 50;
      xp += completedTodos * 50;

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

    // Evaluar Logros
    
    const today = new Date().toLocaleDateString();
    const seed = today.split('/').join('') + techs.length;

    const quests = [
      { id: 1, title: 'El Coleccionista', desc: 'Guarda al menos 3 recursos en total.', target: 3, current: stats.resources, xp: 150, icon: '💾' },
      { id: 2, title: 'Erudito Constante', desc: 'Alcanza una racha de fuego de 3 días.', target: 3, current: stats.maxStreak, xp: 300, icon: '🔥' },
      { id: 3, title: 'Maestro del Código', desc: 'Domina al menos 1 tecnología.', target: 1, current: stats.mastered, xp: 500, icon: '🏆' },
      { id: 4, title: 'Lector Empedernido', desc: 'Escribe 5 apuntes en total.', target: 5, current: stats.notes, xp: 200, icon: '📝' }
    ].sort((a, b) => (a.id * Number(seed)) % 5 - (b.id * Number(seed)) % 5).slice(0, 3);

    const rewards = [
      { level: 5, name: 'Borde de Bronce', type: 'Marco', icon: '🥉' },
      { level: 10, name: 'Título: El Coder', type: 'Título', icon: '🏷️' },
      { level: 15, name: 'Tema Oscuro Profundo', type: 'Tema', icon: '🌙' },
      { level: 20, name: 'Borde de Platino', type: 'Marco', icon: '💎' },
      { level: 30, name: 'Modo Dios', type: 'Especial', icon: '⚡' }
    ];

    const badges = [];
    if (techs.length > 0) badges.push({ icon: "🌱", name: "Primeros Pasos", desc: "Añadiste tu primera tecnología." });
    if (stats.notes >= 5) badges.push({ icon: "📚", name: "Erudito", desc: "Has creado 5 o más apuntes." });
    if (stats.mastered >= 1) badges.push({ icon: "🏆", name: "Maestro", desc: "Has dominado al menos 1 tecnología." });
    if (stats.maxStreak >= 5) badges.push({ icon: "🔥", name: "Imparable", desc: "Racha de 5 días o más." });
    if (stats.resources >= 10) badges.push({ icon: "💾", name: "Librería Viva", desc: "Guardaste 10 o más recursos." });

    return { xp, level, nextLvlBaseXp, progress, rank, stats, badges, quests, rewards };
  }, [techs]);

  const exportMyProgress = () => {
    let csv = "Tecnologia,Estado,Apuntes,Recursos,Objetivos,Racha\n";
    techs.forEach(t => {
      if (t.name !== '__DEVTRACK_ACCOUNT__') {
        const compTodos = t.todos?.filter((x: any) => x.completed).length || 0;
        csv += `${t.name},${t.status},${t.notes?.length || 0},${t.resources?.length || 0},${compTodos}/${t.todos?.length || 0},${t.streak || 0}\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progreso_devtrack.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAdding) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const techName = formData.get('techName') as string;
    if (!techName || !user?.email) return;
    setIsAdding(true);
    try {
      await addTechnology(formData, user.email);
      form.reset();
      confetti({
        particleCount: 100, spread: 80, origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });
      await refresh(user.email);
      setShowAddModal(false);
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  const handleAddTodo = () => {
    if (!newTodo.trim() || !selectedTech) return;
    const task = newTodo.trim();
    setNewTodo("");
    addTodoToTech(selectedTech.id, task).then(() => refresh(user?.email));
  };

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Sincronizando Stack...</div>;

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e8f0] pb-20 font-sans relative selection:bg-indigo-500/30 text-left overflow-x-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <nav className="bg-[#16191d]/70 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4 group cursor-pointer">
           <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform group-hover:-rotate-6 transition-transform shadow-lg shadow-indigo-500/30">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Track</span></h1>
        </div>
        

        <div className="hidden md:block relative w-96 text-left">
          <input 
            type="text"
            placeholder="BUSCAR EN EL STACK..."
            className="w-full bg-[#1e2227]/80 border border-white/10 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 focus:bg-[#1e2227] transition-all text-white placeholder:text-white/20 italic shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          

          {(searchResults.myTechs.length > 0 || searchResults.communityPosts.length > 0) && (
            <div className="absolute top-14 left-0 w-[450px] bg-[#282c34] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 z-[100] text-left animate-in fade-in slide-in-from-top-2">
              {searchResults.myTechs.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 italic">Mi Stack</p>
                  <div className="space-y-1">
                    {searchResults.myTechs.map(t => (
                      <button key={t.id} onClick={() => {setSelectedTech(t); setSearchQuery("");}} className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all font-black uppercase italic text-xs text-white/80 hover:text-indigo-400">{t.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">

          {gamification.stats.maxStreak > 0 && (
            <div className="hidden lg:flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-in fade-in" title="Racha Máxima Actual">
               <span className="text-xl animate-pulse">🔥</span>
               <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">{gamification.stats.maxStreak} Días</span>
            </div>
          )}


          <button 
            onClick={() => setShowGamificationModal(true)}
            className={`hidden lg:flex items-center gap-4 bg-black/20 px-5 py-2.5 rounded-2xl border hover:border-white/20 transition-all shadow-inner cursor-pointer ${gamification.rank.border}`}
            title="Ver tu Perfil de Desarrollador"
          >
            <div className="text-right">
              <span className={`text-[10px] ${gamification.rank.color} font-black uppercase tracking-widest block italic`}>
                Lvl {gamification.level} • {gamification.rank.name}
              </span>
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{gamification.xp} / {gamification.nextLvlBaseXp} XP</span>
            </div>
            <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              <div className={`h-full ${gamification.rank.bg} shadow-[0_0_10px_currentColor] transition-all duration-1000`} style={{ width: `${gamification.progress}%` }}></div>
            </div>
          </button>

          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Comunidad</Link>
          {role === 'admin' && (
            <Link href="/admin" className="text-[10px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase tracking-[0.3em] border border-amber-500/20 px-6 py-2.5 rounded-xl bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Panel Admin</Link>
          )}
          <Link href="/profile" className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white text-[10px] font-black px-6 py-2.5 rounded-xl transition-all border border-indigo-500/20 uppercase tracking-widest">Mi Perfil</Link>
          <button onClick={() => signOut(auth)} className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black px-6 py-2.5 rounded-xl transition-all border border-red-500/20 uppercase tracking-widest shadow-lg shadow-red-500/10">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-12 text-center">

        <div className="flex justify-center gap-3 mb-16">
          {["TODOS", "APRENDIENDO", "PRACTICANDO", "DOMINADO"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeFilter === filter 
                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                : 'bg-white/5 border-white/5 text-white/20 hover:text-white/60'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          

          {activeFilter === "TODOS" && (
            <div onClick={() => setShowAddModal(true)} className="bg-white/5 border border-dashed border-white/20 rounded-[3rem] p-10 flex flex-col items-center justify-center h-[350px] cursor-pointer hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-[0_20px_60px_rgba(99,102,241,0.15)] transition-all duration-500 group animate-in fade-in zoom-in hover:-translate-y-2">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 text-4xl font-light mb-6 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                +
              </div>
              <h3 className="text-xl font-black italic uppercase text-white/50 group-hover:text-white tracking-widest transition-colors">Explorar</h3>
              <p className="text-[10px] font-bold text-white/20 uppercase mt-2 group-hover:text-indigo-300/50">Añadir al Stack</p>
            </div>
          )}

          {filteredTechs.map((t) => (
            <Link key={t.id} href={`/tecnologias/${t.name.toLowerCase()}`} className={`bg-[#1a1d24]/60 backdrop-blur-md p-10 rounded-[3rem] border transition-all duration-500 flex flex-col h-[350px] relative overflow-hidden group text-left cursor-pointer animate-in fade-in zoom-in shadow-2xl ${
              t.status === 'Dominado' ? 'border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_20px_60px_rgba(16,185,129,0.15)] hover:-translate-y-2' : 
              t.status === 'Practicando' ? 'border-amber-500/30 hover:border-amber-400 hover:shadow-[0_20px_60px_rgba(245,158,11,0.15)] hover:-translate-y-2' :
              'border-white/10 hover:border-indigo-500/60 hover:shadow-[0_20px_60px_rgba(99,102,241,0.15)] hover:-translate-y-2'
            }`}>
              

              <div className={`absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500 ${
                t.status === 'Dominado' ? 'bg-emerald-500' : t.status === 'Practicando' ? 'bg-amber-500' : 'bg-indigo-500'
              }`}></div>

              <div className="flex justify-between items-center mb-8 relative z-10 text-left">
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border italic backdrop-blur-md ${
                  t.status === 'Dominado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  t.status === 'Practicando' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>{t.status}</span>
                <button onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  Swal.fire({
                    title: '¿Borrar tecnología?',
                    text: '¿Estás seguro de eliminar esto del stack?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#3b82f6',
                    confirmButtonText: 'Sí, borrar',
                    cancelButtonText: 'Cancelar',
                    background: '#1e2227',
                    color: '#fff'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      deleteTechnology(t.id, user.email).then(() => refresh(user.email));
                    }
                  });
                }} className="text-white/10 hover:text-red-500 transition-all p-2 text-xl z-20">✕</button>
              </div>
              <h3 className="text-4xl font-black italic uppercase text-white/90 mb-2 tracking-tighter group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/50 transition-all text-left relative z-10">{t.name}</h3>
              <p className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.3em] mb-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Entrar al Workspace →</p>
              
              <div className="mt-auto flex flex-col gap-4 relative z-10 text-left">
                 <div className="flex gap-3 font-black text-[10px] uppercase tracking-widest text-white/20">
                    <span className="bg-black/30 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm">📄 {t.resources?.length || 0}</span>
                    <span className="bg-black/30 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm">📝 {t.notes?.length || 0}</span>
                    <span className="bg-black/30 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm" title="Objetivos Completados">✅ {(t.todos?.filter((x: any) => x.completed)?.length) || 0}/{t.todos?.length || 0}</span>
                    {(t.streak || 0) > 0 && (
                      <span className="bg-orange-500/10 text-orange-400 px-4 py-2 rounded-xl border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)] transition-all">🔥 {t.streak}</span>
                    )}
                 </div>
                 <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-1000 relative ${
                        t.status === 'Dominado' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 
                        t.status === 'Practicando' ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b]' : 'bg-indigo-500 shadow-[0_0_15px_#6366f1]'
                      }`} 
                      style={{ width: t.status === 'Dominado' ? '100%' : t.status === 'Practicando' ? '60%' : '25%' }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-[-20deg] animate-[shimmer_2s_infinite]"></div>
                    </div>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="absolute inset-0 bg-[#0f1115]/95" onClick={() => setSelectedTech(null)} />
          <div className={`relative w-full bg-[#21252b] overflow-hidden rounded-[4rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300 ${
            'max-w-6xl h-[90vh]'
          }`}>
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-[#1a1d23]/50 text-left">
              <div className="text-left">
                <div className="flex flex-wrap items-center gap-4 mb-2 pr-20">
                  <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter leading-none">{selectedTech.name}</h2>
                  <select 
                    value={selectedTech.status}
                    onChange={(e) => handleStatusChange(selectedTech.id, e.target.value)}
                    className={`ml-4 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border bg-transparent outline-none cursor-pointer transition-all ${
                      selectedTech.status === 'Dominado' ? 'border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                      selectedTech.status === 'Practicando' ? 'border-amber-500 text-amber-400' : 
                      'border-indigo-500 text-indigo-400'
                    }`}
                  >
                    <option value="Aprendiendo" className="bg-[#282c34]">🚀 Aprendiendo</option>
                    <option value="Practicando" className="bg-[#282c34]">🛠️ Practicando</option>
                    <option value="Dominado" className="bg-[#282c34]">🏆 Dominado</option>
                  </select>
                </div>
                <p className="text-[11px] font-black text-indigo-400 tracking-[0.5em] uppercase mt-1 italic">Technical Workspace</p>
              </div>
              <button onClick={() => setSelectedTech(null)} className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-red-500 transition-all text-3xl font-light">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-left">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                <div className="space-y-8">

                  <div className="bg-[#1a1d23] border border-white/5 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[12px] font-black uppercase text-emerald-400 italic tracking-[0.2em]">Objetivos / Roadmap</h4>
                      <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">{selectedTech.todos?.filter((t: any) => t.completed).length || 0} / {selectedTech.todos?.length || 0}</span>
                    </div>
                    <div className="flex gap-3 mb-6">
                      <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTodo()} placeholder="Ej: Aprender Hooks..." className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white outline-none focus:border-emerald-500 transition-all" />
                      <button onClick={handleAddTodo} disabled={!newTodo.trim()} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-lg disabled:opacity-50 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">+</button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide pr-2">
                      {Array.isArray(selectedTech.todos) && selectedTech.todos.length > 0 ? selectedTech.todos.map((todo: any) => (
                        <div key={todo.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${todo.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/20 border-white/5 hover:border-emerald-500/30'}`}>
                          <input type="checkbox" checked={todo.completed} onChange={(e) => toggleTodoInTech(selectedTech.id, todo.id, e.target.checked).then(()=>refresh(user.email))} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
                          <span className={`flex-1 text-[12px] font-bold uppercase tracking-widest ${todo.completed ? 'line-through text-white/30' : 'text-white/80'}`}>{todo.task}</span>
                          <button onClick={() => removeTodoFromTech(selectedTech.id, todo.id).then(()=>refresh(user.email))} className="text-white/10 hover:text-red-500 font-black">✕</button>
                        </div>
                      )) : <p className="text-white/20 text-center italic py-4 uppercase tracking-widest text-[10px]">Añade tu primer objetivo</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[12px] font-black uppercase text-indigo-400 italic tracking-[0.2em]">Apuntes</h4>
                    <button onClick={() => setShowNoteForm(true)} className="text-[10px] font-black bg-indigo-500 text-white px-8 py-3 rounded-2xl hover:brightness-110 shadow-xl tracking-widest uppercase">+ NOTA</button>
                  </div>
                  <div className="space-y-4">
                    {Array.isArray(selectedTech.notes) && selectedTech.notes.length > 0 ? selectedTech.notes.map((note: any) => (
                      <div key={note.id} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-xl group">
                        <button onClick={() => setViewingNote(note)} className="flex items-center gap-6 flex-1 text-left">
                          <span className="text-2xl opacity-50 group-hover:opacity-100 transition-all">📝</span>
                          <span className="text-[15px] font-black text-white/70 uppercase truncate">{note.title}</span>
                        </button>
                        <button onClick={() => removeNote(selectedTech.id, note.id).then(() => refresh(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    )) : <p className="text-white/5 text-center italic py-10 uppercase tracking-widest text-[10px]">Sin apuntes</p>}
                  </div>
                </div>

                <div className="space-y-8 border-l border-white/5 pl-12 text-left">

                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 shadow-xl">
                    <h4 className="text-[12px] font-black uppercase text-indigo-400 italic tracking-[0.2em] mb-6">Explorador Rápido</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedTech.name)}+tutorial+español`} target="_blank" rel="noreferrer" className="bg-black/30 hover:bg-[#ff0000]/20 border border-white/5 hover:border-[#ff0000]/50 text-white/70 hover:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-col gap-1 items-center justify-center"><span>🎥</span> YouTube</a>
                      <a href={`https://github.com/search?q=${encodeURIComponent(selectedTech.name)}&type=repositories`} target="_blank" rel="noreferrer" className="bg-black/30 hover:bg-white/20 border border-white/5 hover:border-white/50 text-white/70 hover:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-col gap-1 items-center justify-center"><span>💻</span> GitHub</a>
                      <a href={`https://stackoverflow.com/search?q=${encodeURIComponent(selectedTech.name)}`} target="_blank" rel="noreferrer" className="bg-black/30 hover:bg-[#f48024]/20 border border-white/5 hover:border-[#f48024]/50 text-white/70 hover:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-col gap-1 items-center justify-center"><span>🗂️</span> Stack</a>
                      <a href={`https://devdocs.io/search?q=${encodeURIComponent(selectedTech.name)}`} target="_blank" rel="noreferrer" className="bg-black/30 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/50 text-white/70 hover:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-col gap-1 items-center justify-center"><span>📚</span> DevDocs</a>
                    </div>
                  </div>

                  <h4 className="text-[12px] font-black uppercase text-white/20 italic tracking-[0.2em] text-center">Recursos Extra</h4>
                  <div className="space-y-4">
                    {selectedTech.resources?.map((file: any, idx: number) => (
                      <div key={idx} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
                        <a href={file.url} target="_blank" className="flex items-center gap-6 truncate flex-1 hover:text-indigo-400 transition-colors">
                          <span className="text-3xl opacity-50">📄</span>
                          <span className="text-[13px] font-bold text-white/60 truncate">{file.name}</span>
                        </a>
                        <button onClick={() => removeResource(selectedTech.id, file.url).then(() => refresh(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    ))}
                  </div>
                  <UploadButton endpoint="techAttachment" onClientUploadComplete={(res) => { if (res) addResourceToTech(selectedTech.id, res[0].url, res[0].name).then(() => refresh(user.email)); }} onUploadError={(e) => { Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#1e2227', color: '#fff' }); }} content={{ button: "AÑADIR ARCHIVO" }} appearance={{ button: "w-full bg-white/5 text-white/40 text-[14px] font-black py-10 rounded-[2.5rem] hover:bg-white/10 border border-white/5 transition-all uppercase tracking-widest", allowedContent: "hidden" }} />
                </div>
              </div>


              {relatedHacks.length > 0 && (
                <div className="mt-16 border-t border-white/5 pt-16 text-left">
                  <div className="flex items-center gap-4 mb-12">
                    <span className="h-3 w-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.6)]"></span>
                    <h4 className="text-[13px] font-black uppercase tracking-[0.5em] text-indigo-400 italic">Community Hacks: {selectedTech.name}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10">
                    {relatedHacks.map((hack) => (
                      <div key={hack.id} className="bg-[#1a1d23] rounded-[3.5rem] border border-white/5 p-10 shadow-2xl flex flex-col h-full group hover:border-indigo-500/20 transition-all text-left">
                        <div className="flex justify-between items-start mb-8 text-left">
                          <Link href={`/u/${hack.author_email || hack.author}`} className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.3em] cursor-pointer">
                            Hack by @{hack.author}
                          </Link>
                          <span className="text-2xl opacity-40 group-hover:opacity-100 transition-all">🎥</span>
                        </div>
                        <h5 className="text-2xl font-black italic uppercase text-white/90 mb-8 leading-tight tracking-tighter text-left">{hack.title}</h5>
                        {hack.video_url && (
                          <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/5 bg-black/60 aspect-video shadow-inner relative z-10">
                            <video src={hack.video_url} controls className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <div className="bg-black/20 p-8 rounded-3xl text-slate-400 text-lg italic leading-relaxed mb-8 flex-1 border border-white/5 text-left">"{hack.content}"</div>
                        <div className="flex justify-between items-center text-left">
                          <button onClick={() => toggleLike(hack.id, user.email).then(() => refresh(user.email))} className={`text-[11px] font-black px-8 py-3 rounded-2xl border transition-all uppercase tracking-[0.2em] ${hack.likes?.includes(user?.email) ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'}`}>▲ {hack.likes?.length || 0}</button>
                          <Link href="/community" className="text-[10px] font-black text-white/10 hover:text-indigo-400 transition-all uppercase tracking-widest">Ver original →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

                  <div className="mt-8 flex justify-start">
                    <button onClick={exportMyProgress} className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-inner">
                      ↓ Exportar Datos a CSV
                    </button>
                  </div>
        </div>
      )}

      {/* MODAL CREAR NOTA */}
      {showNoteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95">
          <div className="bg-[#282c34] w-full max-w-2xl p-12 rounded-[4rem] border border-white/10 shadow-2xl text-left">
            <h3 className="text-3xl font-black mb-10 uppercase italic text-indigo-400 text-center tracking-widest text-left">Nueva Nota</h3>
            <input placeholder="TÍTULO" className="w-full bg-[#1a1d23] p-6 rounded-3xl mb-5 outline-none border border-white/5 font-black uppercase text-sm text-white focus:border-indigo-500 transition-all text-left" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <textarea placeholder="Contenido (Markdown)..." className="w-full h-72 bg-[#1a1d23] p-8 rounded-3xl mb-10 outline-none border border-white/5 text-slate-300 resize-none font-medium italic text-lg focus:border-indigo-500 transition-all text-left" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
            <div className="flex gap-4">
                <button onClick={() => setShowNoteForm(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500/20 transition-all text-center leading-none">Cerrar</button>
                <button onClick={() => addNoteToTech(selectedTech.id, noteTitle, noteContent).then(() => { setNoteTitle(""); setNoteContent(""); setShowNoteForm(false); refresh(user.email); })} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all text-center leading-none">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEER NOTA (CON MARKDOWN) */}
      {viewingNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95">
          <div className="bg-[#282c34] w-full max-w-4xl p-16 rounded-[5rem] border border-white/10 shadow-2xl relative text-left flex flex-col max-h-[90vh]">
            <button onClick={() => setViewingNote(null)} className="absolute top-12 right-12 text-white/10 hover:text-white transition-all text-3xl font-light">✕</button>
            <h3 className="text-4xl font-black mb-12 uppercase italic text-indigo-400 border-b border-white/5 pb-10 leading-none tracking-tighter text-left">{viewingNote.title}</h3>
            <div className="flex-1 overflow-y-auto pr-8 scrollbar-hide text-left">
              <NoteRenderer content={viewingNote.content} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERFIL GAMIFICACIÓN (GAMIFICATION HUB 2.0) */}
      {showGamificationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:p-8 bg-[#0f1115]/95 backdrop-blur-sm" onClick={() => setShowGamificationModal(false)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1e2227] overflow-hidden rounded-[3rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            

            <div className="p-8 lg:p-10 border-b border-white/5 relative overflow-hidden flex items-center justify-between shrink-0">
              <div className={`absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-current to-transparent ${gamification.rank.color}`}></div>
              <div className="relative z-10 flex items-center gap-8">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg border ${gamification.rank.bg} ${gamification.rank.border} shadow-current/20`}>
                    {gamification.rank.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-[#1e2227] border border-white/10 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
                    Lvl {gamification.level}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-black text-white/50 tracking-[0.4em] uppercase mb-1 italic">DevTrack Profile</p>
                  <h2 className={`text-5xl font-black italic uppercase tracking-tighter ${gamification.rank.color}`}>{user?.email?.split('@')[0] || 'Developer'}</h2>
                  <p className={`text-sm font-bold uppercase tracking-widest mt-2 ${gamification.rank.color} opacity-80`}>Rango: {gamification.rank.name}</p>
                </div>
              </div>
              <button onClick={() => setShowGamificationModal(false)} className="relative z-10 w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-2xl font-light text-white/50 hover:text-white">✕</button>
            </div>


            <div className="flex px-10 border-b border-white/5 shrink-0 bg-[#16191d]">
               {['stats', 'quests', 'rewards'].map((tab) => (
                 <button 
                   key={tab}
                   onClick={() => setGamiTab(tab)}
                   className={`px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${gamiTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}
                 >
                   {tab === 'stats' ? '📊 Estadísticas' : tab === 'quests' ? '🎯 Misiones' : '🎁 Recompensas'}
                 </button>
               ))}
            </div>
            

            <div className="p-10 lg:p-12 flex-1 overflow-y-auto scrollbar-hide">
              

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
                        <div key={q.id} className={`p-6 rounded-3xl border transition-all flex items-center gap-8 ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-black/20 border-white/5 hover:border-indigo-500/30'}`}>
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#282c34] text-white/50'}`}>
                            {isCompleted ? '✓' : q.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`text-lg font-black uppercase tracking-wider ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h4>
                              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/5 text-indigo-300 uppercase tracking-widest border border-white/10">+{q.xp} XP</span>
                            </div>
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-4">{q.desc}</p>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex-1 bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressPercent}%` }}></div>
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

                          <div className={`absolute -left-[25px] w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-black transition-all ${isUnlocked ? 'bg-amber-500 border-[#1e2227] text-[#1e2227] shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-[#282c34] border-[#1e2227] text-white/30'}`}>
                            {r.level}
                          </div>

                          <div className={`flex-1 p-6 rounded-3xl border flex items-center gap-6 transition-all ${isUnlocked ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10' : 'bg-black/20 border-white/5 opacity-60 grayscale'}`}>
                            <div className="text-4xl">{r.icon}</div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 block mb-1">Recompensa Nvl {r.level} • {r.type}</span>
                              <h4 className={`text-xl font-black uppercase italic tracking-tighter ${isUnlocked ? 'text-amber-400' : 'text-white/50'}`}>{r.name}</h4>
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

      {/* MODAL AÑADIR NUEVA TECNOLOGÍA */}
      {showAddModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#0f1115]/95 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1e2227] w-full max-w-2xl p-10 lg:p-14 rounded-[4rem] border border-white/10 shadow-2xl relative text-left animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-xl font-light text-white/50 hover:text-white">✕</button>
            
            <div className="mb-10">
              <p className="text-[12px] font-black text-indigo-400 tracking-[0.4em] uppercase mb-2 italic">DevTrack Library</p>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Explorar Stack</h2>
            </div>

            <div className="mb-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Sugerencias Populares</p>
              <div className="flex flex-wrap gap-3">
                {['React', 'Node.js', 'Python', 'TypeScript', 'Docker', 'AWS', 'Next.js', 'Go'].map((tech) => (
                  <button 
                    key={tech}
                    onClick={() => {
                      const event = { preventDefault: () => {}, currentTarget: { reset: () => {} } } as any;
                      const formData = new FormData();
                      formData.append('techName', tech);
                      setIsAdding(true);
                      addTechnology(formData, user.email).then(() => {
                        refresh(user.email);
                        setShowAddModal(false);
                        setIsAdding(false);
                      });
                    }}
                    disabled={isAdding}
                    className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase italic tracking-widest text-white/70 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all disabled:opacity-50"
                  >
                    + {tech}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddTech} className="border-t border-white/5 pt-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Añadir Personalizada</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  name="techName" 
                  placeholder={isAdding ? "AÑADIENDO..." : "¿QUÉ QUIERES APRENDER?"} 
                  required 
                  disabled={isAdding} 
                  className="flex-1 bg-black/30 px-8 py-5 rounded-3xl outline-none font-black text-sm placeholder:text-white/20 italic uppercase tracking-widest text-white border border-white/10 focus:border-indigo-500 transition-all shadow-inner disabled:opacity-50" 
                />
                <button 
                  type="submit"
                  disabled={isAdding} 
                  className="bg-indigo-500 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}