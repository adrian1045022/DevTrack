"use client";

import { useState, use, useEffect, useRef, useCallback } from "react";
import NoteRenderer from "../../../components/NoteRenderer";
import { auth } from '../../../lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  getTechnologies, updateTechStatus, addNoteToTech, 
  removeNote, addResourceToTech, removeResource, 
  getRelatedHacks, toggleLike, editNoteInTech
} from '../../../lib/techActions';
import { UploadButton } from "../../../lib/uploadthing";
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function TecnologiaPage({ params }: { params: Promise<{ lenguaje: string }> | { lenguaje: string } }) {
  const isPromise = params instanceof Promise;
  const resolvedParams = isPromise ? use(params as Promise<{ lenguaje: string }>) : (params as { lenguaje: string });
  const lenguaje = resolvedParams?.lenguaje ? decodeURIComponent(resolvedParams.lenguaje) : "Tecnología";
  const router = useRouter();

  // --- ESTADO GENERAL Y FIREBASE ---
  const [user, setUser] = useState<any>(null);
  const [techData, setTechData] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [tabActiva, setTabActiva] = useState<'general' | 'tareas' | 'github'>('general');

  // --- ESTADOS PARA APUNTES Y RECURSOS ---
  const [relatedHacks, setRelatedHacks] = useState<any[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const refreshData = useCallback(async (email: string) => {
    const data = await getTechnologies(email);
    const currentTech = data.find((t: any) => t.name.toLowerCase() === lenguaje.toLowerCase());
    if (currentTech) {
      setTechData(currentTech);
      const hacks = await getRelatedHacks(currentTech.name);
      setRelatedHacks(hacks);
    }
  }, [lenguaje]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) router.replace('/login');
      else {
        setUser(currentUser);
        if (currentUser.email) {
          await refreshData(currentUser.email);
        }
        setLoadingApp(false);
      }
    });
    return () => unsub();
  }, [router, refreshData]);

  // --- Estado para GitHub Projects ---
  const [ghQuery, setGhQuery] = useState("");
  const [ghSort, setGhSort] = useState("stars");
  const [ghLangSearch, setGhLangSearch] = useState("ALL");
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [loadingGh, setLoadingGh] = useState(false);
  const [ghError, setGhError] = useState("");

  const searchGithub = async (sortOverride?: string, langSearchOverride?: string) => {
    if (!ghQuery.trim()) return;
    setLoadingGh(true);
    setGhError("");
    try {
      const activeSort = sortOverride || ghSort;
      const activeLangSearch = langSearchOverride || ghLangSearch;
      
      let queryStr = ghQuery;
      if (activeLangSearch === "ES") queryStr += " en español";
      else if (activeLangSearch === "EN") queryStr += " english";
      
      const query = encodeURIComponent(queryStr);
      const res = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=${activeSort}&order=desc&per_page=15`);
      if (!res.ok) throw new Error("Error fetching from GitHub");
      const data = await res.json();
      setGhRepos(data.items || []);
    } catch (err: any) {
      setGhError("Hubo un problema al buscar en GitHub. Intenta de nuevo más tarde.");
    } finally {
      setLoadingGh(false);
    }
  };

  // --- Estado para Tareas / Roadmap ---
  const [tasks, setTasks] = useState<{id: string, text: string, done: boolean, difficulty: 'Fácil' | 'Medio' | 'Difícil'}[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<'Fácil' | 'Medio' | 'Difícil'>('Medio');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tasks_${lenguaje}`);
      if (saved) setTasks(JSON.parse(saved));
    }
  }, [lenguaje]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tasks_${lenguaje}`, JSON.stringify(tasks));
    }
  }, [tasks, lenguaje]);

  // --- Función para exportar apuntes ---
  const downloadAllNotes = () => {
    if (!techData?.notes || techData.notes.length === 0) return alert('No hay apuntes para descargar');
    let content = `# Apuntes de ${techData.name}\n\n`;
    techData.notes.forEach((n: any) => {
      content += `## ${n.title}\n\n${n.content}\n\n---\n\n`;
    });
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apuntes_${techData.name.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingApp) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Cargando Workspace...</div>;
  if (!techData) return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col gap-6 items-center justify-center text-center p-10 text-white">
      <h2 className="text-3xl font-black italic uppercase">No se encontró la tecnología</h2>
      <p className="text-white/50 mb-4">Asegúrate de que '{lenguaje}' esté añadida a tu stack en el Dashboard.</p>
      <Link href="/dashboard" className="bg-indigo-500 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all">Volver al Dashboard</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 md:p-10 font-sans selection:bg-indigo-500/30 text-left overflow-x-hidden relative">
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <p className="text-[12px] font-black text-indigo-400 tracking-[0.5em] uppercase mb-2 italic">Technical Workspace</p>
            <div className="flex items-center gap-6">
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
                <span className="text-indigo-400">{techData.name}</span>
              </h1>
              <select 
                value={techData.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  if (newStatus === 'Dominado' && techData.status !== 'Dominado') {
                    confetti({
                      particleCount: 150, spread: 100, origin: { y: 0.5 },
                      colors: ['#10b981', '#fbbf24', '#f59e0b']
                    });
                  }
                  await updateTechStatus(techData.id, e.target.value);
                  await refreshData(user.email);
                }}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border bg-transparent outline-none cursor-pointer transition-all ${
                  techData.status === 'Dominado' ? 'border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                  techData.status === 'Practicando' ? 'border-amber-500 text-amber-400' : 
                  'border-indigo-500 text-indigo-400'
                }`}
              >
                <option value="Aprendiendo" className="bg-[#1e2227]">🚀 Aprendiendo</option>
                <option value="Practicando" className="bg-[#1e2227]">🛠️ Practicando</option>
                <option value="Dominado" className="bg-[#1e2227]">🏆 Dominado</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 self-start md:self-auto">
            <button onClick={() => router.push('/profile')} className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 px-6 py-3 rounded-2xl transition-all">
              Mi Perfil
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all">
              ← Dashboard
            </button>
            <button onClick={() => auth.signOut()} className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-2xl transition-all">
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Menú de Pestañas */}
        <div className="flex flex-wrap gap-4 mb-10 pb-6 border-b border-white/5">
          {[
            { id: 'general', icon: '⚡', label: 'Mi Espacio' },
            { id: 'tareas', icon: '📋', label: 'Roadmap' },
            { id: 'github', icon: '📦', label: 'Proyectos GitHub' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all border ${
                tabActiva === tab.id
                  ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105'
                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <span className="text-lg">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de las Pestañas */}
        <div className="w-full">

          {/* Pestaña: General (Notas, Recursos, Hacks) */}
          {tabActiva === 'general' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 bg-[#1a1d24]/60 backdrop-blur-md p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                {/* NOTAS */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[12px] font-black uppercase text-indigo-400 italic tracking-[0.2em]">Mis Apuntes</h4>
                    <div className="flex gap-3">
                      <button onClick={downloadAllNotes} className="text-[10px] font-black bg-white/5 text-white/50 border border-white/5 px-6 py-3 rounded-2xl hover:bg-white/10 hover:text-white shadow-xl tracking-widest uppercase" title="Descargar todos los apuntes en Markdown">↓ Exportar</button>
                      <button onClick={() => { setNoteTitle(""); setNoteContent(""); setEditingNoteId(null); setShowNoteForm(true); }} className="text-[10px] font-black bg-indigo-500 text-white px-8 py-3 rounded-2xl hover:brightness-110 shadow-xl tracking-widest uppercase">+ NOTA</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.isArray(techData.notes) && techData.notes.length > 0 ? techData.notes.map((note: any) => (
                      <div key={note.id} className="bg-black/40 p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-xl group">
                        <button onClick={() => setViewingNote(note)} className="flex items-center gap-6 flex-1 text-left mr-4">
                          <span className="text-2xl opacity-50 group-hover:opacity-100 transition-all">📝</span>
                          <span className="text-[15px] font-black text-white/70 uppercase truncate">{note.title}</span>
                        </button>
                        <button onClick={() => { setNoteTitle(note.title); setNoteContent(note.content); setEditingNoteId(note.id); setShowNoteForm(true); }} className="text-white/10 hover:text-indigo-400 mr-2 font-black text-lg transition-all" title="Editar nota">✎</button>
                        <button onClick={() => removeNote(techData.id, note.id).then(() => refreshData(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    )) : <p className="text-white/20 text-center italic py-10 uppercase tracking-widest text-[10px] border border-dashed border-white/10 rounded-3xl">Aún no has escrito apuntes</p>}
                  </div>
                </div>

                {/* RECURSOS */}
                <div className="space-y-8 lg:border-l border-white/5 lg:pl-12 text-left">
                  <h4 className="text-[12px] font-black uppercase text-white/30 italic tracking-[0.2em] px-2">Recursos Extra</h4>
                  <div className="space-y-4">
                    {techData.resources?.map((file: any, idx: number) => (
                      <div key={idx} className="bg-black/40 p-6 rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
                        <a href={file.url} target="_blank" className="flex items-center gap-6 truncate flex-1 hover:text-indigo-400 transition-colors">
                          <span className="text-3xl opacity-50">📄</span>
                          <span className="text-[13px] font-bold text-white/60 truncate">{file.name}</span>
                        </a>
                        <button onClick={() => removeResource(techData.id, file.url).then(() => refreshData(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    ))}
                    {(!techData.resources || techData.resources.length === 0) && (
                      <p className="text-white/20 text-center italic py-6 uppercase tracking-widest text-[10px] border border-dashed border-white/10 rounded-3xl mb-4">Sin recursos subidos</p>
                    )}
                  </div>
                  <UploadButton 
                    endpoint="techAttachment" 
                    onClientUploadComplete={(res) => { if (res) addResourceToTech(techData.id, res[0].url, res[0].name).then(() => refreshData(user.email)); }} 
                    onUploadError={(e) => alert(e.message)} 
                    content={{ button: "SUBIR ARCHIVO" }} 
                    appearance={{ button: "w-full bg-white/5 text-white/40 text-[14px] font-black py-8 rounded-[2rem] hover:bg-white/10 border border-white/5 transition-all uppercase tracking-widest", allowedContent: "hidden" }} 
                  />
                </div>
              </div>

              {/* HACKS RELACIONADOS INTEGRADOS */}
              {relatedHacks.length > 0 && (
                <div className="mt-10 mb-20 text-left">
                  <div className="flex items-center gap-4 mb-8 pl-4">
                    <span className="h-3 w-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.6)]"></span>
                    <h4 className="text-[13px] font-black uppercase tracking-[0.5em] text-indigo-400 italic">Community Hacks para {techData.name}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {relatedHacks.map((hack) => (
                      <div key={hack.id} className="bg-[#1a1d24]/80 backdrop-blur-md rounded-[3rem] border border-white/5 p-10 shadow-2xl flex flex-col h-full group hover:border-indigo-500/30 transition-all text-left">
                        <div className="flex justify-between items-start mb-8">
                          <Link href={`/u/${hack.author_email || hack.author}`} className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.3em] cursor-pointer">
                            By @{hack.author}
                          </Link>
                          <span className="text-2xl opacity-40 group-hover:opacity-100 transition-all">🎥</span>
                        </div>
                        <h5 className="text-2xl font-black italic uppercase text-white/90 mb-6 leading-tight tracking-tighter line-clamp-2">{hack.title}</h5>
                        {hack.video_url && (
                          <div className="mb-6 rounded-[2rem] overflow-hidden border border-white/5 bg-black/60 aspect-video shadow-inner relative z-10">
                            <video src={hack.video_url} controls className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <div className="bg-black/30 p-6 rounded-3xl text-slate-400 text-sm italic leading-relaxed mb-8 flex-1 border border-white/5 line-clamp-3">"{hack.content}"</div>
                        <div className="flex justify-between items-center">
                          <button onClick={() => toggleLike(hack.id, user.email).then(() => refreshData(user.email))} className={`text-[11px] font-black px-6 py-2.5 rounded-xl border transition-all uppercase tracking-[0.2em] ${hack.likes?.includes(user?.email) ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'}`}>▲ {hack.likes?.length || 0}</button>
                          <Link href="/community" className="text-[9px] font-black text-white/20 hover:text-indigo-400 transition-all uppercase tracking-widest">Ver en Comunidad →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pestaña: Tareas / Roadmap */}
          {tabActiva === 'tareas' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-4xl">📋</span>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Roadmap de Estudio</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Checklist local para {techData.name}</p>
                  </div>
                </div>
                
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-3 px-2">
                    <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Progreso del Roadmap</span>
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_#6366f1]" style={{ width: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0}%` }}></div>
                  </div>
                </div>

                <div className="flex gap-4 mb-10">
                  <input 
                    type="text" 
                    value={newTask} 
                    onChange={(e) => setNewTask(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { setTasks([...tasks, {id: Date.now().toString(), text: newTask, done: false, difficulty: newTaskDifficulty}]); setNewTask(""); } }}
                    placeholder="Añadir un concepto o tema a estudiar..." 
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black uppercase text-white outline-none focus:border-indigo-500 shadow-inner placeholder:text-white/20"
                  />
                  <select 
                    value={newTaskDifficulty} 
                    onChange={(e) => setNewTaskDifficulty(e.target.value as any)} 
                    className="bg-black/40 border border-white/5 text-white font-black uppercase tracking-widest px-6 rounded-2xl outline-none text-xs focus:border-indigo-500"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Medio">Medio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                  <button onClick={() => { if(newTask.trim()) { setTasks([...tasks, {id: Date.now().toString(), text: newTask, done: false, difficulty: newTaskDifficulty}]); setNewTask(""); } }} className="bg-indigo-500 text-white font-black uppercase tracking-widest px-8 rounded-2xl shadow-lg hover:brightness-110 transition-all text-xs">
                    Añadir
                  </button>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center py-10 bg-black/20 rounded-3xl border border-dashed border-white/10">
                      <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No hay tareas. ¡Añade tu primer objetivo!</p>
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const difficultyColors = {
                        'Fácil': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                        'Medio': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                        'Difícil': 'text-red-400 border-red-500/30 bg-red-500/10'
                      };
                      
                      return (
                      <div key={task.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${task.done ? 'bg-emerald-500/5 border-emerald-500/10 opacity-60 grayscale' : 'bg-black/30 border-white/5 hover:border-indigo-500/30'}`}>
                        <button onClick={() => setTasks(tasks.map(t => {
                          if (t.id === task.id) {
                            const isNowDone = !t.done;
                            if (isNowDone) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#10b981', '#f59e0b'] });
                            return {...t, done: isNowDone};
                          }
                          return t;
                        }))} className="flex items-center gap-4 flex-1 text-left">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${task.done ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-black/50 border-white/20 text-transparent'}`}>
                            ✓
                          </div>
                          <span className={`font-black uppercase text-sm transition-all ${task.done ? 'text-emerald-400/50 line-through' : 'text-white/80'}`}>{task.text}</span>
                          {!task.done && <span className={`ml-auto text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${difficultyColors[task.difficulty || 'Medio']}`}>{task.difficulty || 'Medio'}</span>}
                        </button>
                        <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="text-white/10 hover:text-red-500 text-lg ml-4">✕</button>
                      </div>
                    )})
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña: Proyectos GitHub */}
          {tabActiva === 'github' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-4 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={ghQuery}
                  onChange={(e) => setGhQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchGithub()}
                  placeholder={`Buscar repositorios sobre ${techData.name} o lo que quieras...`}
                  className="flex-1 bg-transparent px-8 py-4 text-sm font-black uppercase tracking-widest text-white outline-none placeholder:text-white/20 italic"
                />
                <select 
                  value={ghSort}
                  onChange={(e) => {
                    setGhSort(e.target.value);
                    if (ghQuery.trim()) {
                      searchGithub(e.target.value, ghLangSearch);
                    }
                  }}
                  className="bg-black/30 border border-white/10 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-[1.8rem] outline-none"
                >
                  <option value="stars">Más Estrellas</option>
                  <option value="forks">Más Forks</option>
                </select>
                <select 
                  value={ghLangSearch}
                  onChange={(e) => {
                    setGhLangSearch(e.target.value);
                    if (ghQuery.trim()) {
                      searchGithub(ghSort, e.target.value);
                    }
                  }}
                  className="bg-black/30 border border-white/10 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-[1.8rem] outline-none"
                >
                  <option value="ALL">Todo Idioma</option>
                  <option value="ES">En Español</option>
                  <option value="EN">En Inglés</option>
                </select>
                <button 
                  onClick={() => searchGithub()}
                  disabled={loadingGh}
                  className="bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-[1.8rem] px-12 py-4 text-xs transition-all shadow-lg hover:brightness-110"
                >
                  {loadingGh ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {ghError && <p className="text-red-400 text-center font-bold">{ghError}</p>}

              {ghRepos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {ghRepos.map((repo) => (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="bg-[#1a1d24]/60 backdrop-blur-md border border-white/5 rounded-[3rem] p-8 flex flex-col hover:border-indigo-500/40 hover:shadow-[0_10px_30px_rgba(99,102,241,0.15)] transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white group-hover:text-indigo-400 transition-colors break-words w-[85%]">{repo.name}</h3>
                        <span className="text-white/20 group-hover:text-white/60">↗</span>
                      </div>
                      <p className="text-white/50 text-xs font-medium mb-8 flex-1 leading-relaxed line-clamp-3">
                        {repo.description || "Sin descripción disponible."}
                      </p>
                      <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-sm">⭐</span>
                          <span className="text-[10px] font-black text-white/60">{repo.stargazers_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400 text-sm">🍴</span>
                          <span className="text-[10px] font-black text-white/60">{repo.forks_count}</span>
                        </div>
                        <div className="ml-auto text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-white/40">
                          {repo.language || techData.name}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : !loadingGh && (
                <div className="text-center py-20 bg-black/20 rounded-[3rem] border border-white/5">
                  <p className="text-white/20 font-black uppercase tracking-widest text-sm">Busca un tema para ver repositorios reales de GitHub</p>
                  <p className="text-white/10 text-xs mt-2">Ejemplo: "react dashboard", "api express", etc.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL CREAR NOTA (GLOBAL AL WORKSPACE) */}
      {showNoteForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f1117]/95 backdrop-blur-sm">
          <div className="bg-[#1a1d24] w-full max-w-2xl p-12 rounded-[4rem] border border-white/10 shadow-2xl text-left animate-in zoom-in duration-300">
            <h3 className="text-3xl font-black mb-10 uppercase italic text-indigo-400 text-center tracking-widest text-left">Nueva Nota</h3>
            <input placeholder="TÍTULO" className="w-full bg-black/40 p-6 rounded-3xl mb-5 outline-none border border-white/5 font-black uppercase text-sm text-white focus:border-indigo-500 transition-all text-left shadow-inner" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <textarea placeholder="Contenido (Markdown)..." className="w-full h-72 bg-black/40 p-8 rounded-3xl mb-10 outline-none border border-white/5 text-slate-300 resize-none font-medium italic text-lg focus:border-indigo-500 transition-all text-left shadow-inner" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
            <div className="flex gap-4">
                <button onClick={() => { setShowNoteForm(false); setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500/20 transition-all text-center leading-none">Cancelar</button>
                <button onClick={() => {
                  if (editingNoteId) {
                    editNoteInTech(techData.id, editingNoteId, noteTitle, noteContent).then(() => { setNoteTitle(""); setNoteContent(""); setEditingNoteId(null); setShowNoteForm(false); refreshData(user.email); });
                  } else {
                    addNoteToTech(techData.id, noteTitle, noteContent).then(() => { setNoteTitle(""); setNoteContent(""); setShowNoteForm(false); refreshData(user.email); });
                  }
                }} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all text-center leading-none">{editingNoteId ? 'Actualizar Nota' : 'Guardar Nota'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEER NOTA */}
      {viewingNote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f1117]/95 backdrop-blur-sm">
          <div className="bg-[#1a1d24] w-full max-w-4xl p-16 rounded-[5rem] border border-white/10 shadow-2xl relative text-left flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="absolute top-12 right-12 flex items-center gap-4">
              <button onClick={() => { navigator.clipboard.writeText(viewingNote.content); alert('¡Nota copiada al portapapeles!'); }} className="text-white/20 hover:text-indigo-400 transition-all text-sm font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl">Copiar MD</button>
              <button onClick={() => setViewingNote(null)} className="text-white/20 hover:text-white transition-all text-3xl font-light">✕</button>
            </div>
            <h3 className="text-4xl font-black mb-12 uppercase italic text-indigo-400 border-b border-white/5 pb-10 leading-none tracking-tighter text-left">{viewingNote.title}</h3>
            <div className="flex-1 overflow-y-auto pr-8 scrollbar-hide text-left">
              <NoteRenderer content={viewingNote.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}