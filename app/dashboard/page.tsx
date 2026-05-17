'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  addTechnology, getTechnologies, deleteTechnology, 
  addResourceToTech, removeResource, addNoteToTech, removeNote,
  getCommunityPosts, toggleLike, globalSearch, updateTechStatus 
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';
import NoteRenderer from '../../components/NoteRenderer';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [techs, setTechs] = useState<any[]>([]);
  
  // ESTADOS DE FILTRADO Y BÚSQUEDA
  const [activeFilter, setActiveFilter] = useState("TODOS"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{myTechs: any[], communityPosts: any[]}>({myTechs: [], communityPosts: []});
  
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [relatedHacks, setRelatedHacks] = useState<any[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  // Función para refrescar datos desde Supabase
  const refresh = useCallback(async (email: string) => {
    if (!email) return;
    const data = await getTechnologies(email);
    setTechs(data || []);
    if (selectedTech) {
      const updated = data.find((t: any) => t.id === selectedTech.id);
      if (updated) setSelectedTech(updated);
    }
  }, [selectedTech]);

  // Manejar cambio de Status (Aprendiendo, Practicando, Dominado)
  const handleStatusChange = async (techId: string, newStatus: string) => {
    const success = await updateTechStatus(techId, newStatus);
    if (success && user?.email) {
      await refresh(user.email);
    }
  };

  // Lógica de filtrado para el Grid principal
  const filteredTechs = techs.filter(t => {
    if (activeFilter === "TODOS") return true;
    // Comparamos el status de la DB con el filtro activo
    return t.status.toUpperCase() === activeFilter;
  });

  // Tecla Escape para cerrar todo
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

  // Buscador Global con Debounce
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

  // Cargar Hacks relacionados al abrir una tecnología
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
        const data = await getTechnologies(currentUser.email || "");
        setTechs(data || []);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

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
      await refresh(user.email);
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Sincronizando Stack...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans relative selection:bg-indigo-500/30 text-left">
      <nav className="bg-[#16191d]/80 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform -rotate-3">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-indigo-400">Track</span></h1>
        </div>
        
        {/* BUSCADOR GLOBAL */}
        <div className="hidden md:block relative w-96 text-left">
          <input 
            type="text"
            placeholder="BUSCAR EN EL STACK..."
            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-white/10 italic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {/* RESULTADOS BUSCADOR */}
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
          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Comunidad</Link>
          <button onClick={() => signOut(auth)} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-black px-6 py-2.5 rounded-xl transition-all border border-white/5 uppercase text-white/40">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-12 text-center">
        {/* INPUT AÑADIR */}
        <section className="bg-[#282c34] p-2 rounded-[2.5rem] max-w-2xl mx-auto mb-10 border border-white/5 shadow-2xl">
          <form onSubmit={handleAddTech} className="flex gap-2">
            <input name="techName" placeholder={isAdding ? "AÑADIENDO..." : "¿QUÉ VAMOS A APRENDER?"} required disabled={isAdding} className="flex-1 bg-transparent px-8 py-4 outline-none font-black text-lg placeholder:text-white/5 italic uppercase tracking-widest text-center text-white disabled:opacity-50" />
            <button disabled={isAdding} className="bg-indigo-500 text-white px-12 py-4 rounded-[1.8rem] font-black text-xs uppercase shadow-lg hover:brightness-110 transition-all disabled:opacity-50">Añadir</button>
          </form>
        </section>

        {/* BARRA DE FILTROS */}
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

        {/* GRID DE TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredTechs.map((t) => (
            <div key={t.id} onClick={() => setSelectedTech(t)} className={`bg-[#282c34] p-12 rounded-[4rem] border transition-all flex flex-col h-[350px] relative overflow-hidden group text-left cursor-pointer animate-in fade-in zoom-in duration-300 ${
              t.status === 'Dominado' ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_20px_50px_rgba(16,185,129,0.05)]' : 
              t.status === 'Practicando' ? 'border-amber-500/20 hover:border-amber-500/40' :
              'border-white/5 hover:border-indigo-500/40'
            }`}>
              <div className="flex justify-between items-center mb-8 relative z-10 text-left">
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border italic ${
                  t.status === 'Dominado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  t.status === 'Practicando' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>{t.status}</span>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar?")) deleteTechnology(t.id).then(() => refresh(user.email)); }} className="text-white/10 hover:text-red-500 transition-all p-2 text-xl">✕</button>
              </div>
              <h3 className="text-4xl font-black italic uppercase text-white/90 mb-4 tracking-tighter group-hover:text-indigo-400 transition-colors text-left">{t.name}</h3>
              <div className="mt-auto flex flex-col gap-4 relative z-10 text-left">
                 <div className="flex gap-3 font-black text-[10px] uppercase tracking-widest text-white/20">
                    <span className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">📄 {t.resources?.length || 0}</span>
                    <span className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">📝 {t.notes?.length || 0}</span>
                 </div>
                 <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        t.status === 'Dominado' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 
                        t.status === 'Practicando' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} 
                      style={{ width: t.status === 'Dominado' ? '100%' : t.status === 'Practicando' ? '60%' : '25%' }}
                    ></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f1115]/95 backdrop-blur-md" onClick={() => setSelectedTech(null)} />
          <div className="relative w-full max-w-6xl bg-[#21252b] h-[90vh] overflow-hidden rounded-[4rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-[#1a1d23]/50 text-left">
              <div className="text-left">
                <div className="flex items-center gap-4 mb-2">
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
                  <UploadButton endpoint="techAttachment" onClientUploadComplete={(res) => { if (res) addResourceToTech(selectedTech.id, res[0].url, res[0].name).then(() => refresh(user.email)); }} onUploadError={(e) => alert(e.message)} content={{ button: "AÑADIR ARCHIVO" }} appearance={{ button: "w-full bg-white/5 text-white/40 text-[14px] font-black py-10 rounded-[2.5rem] hover:bg-white/10 border border-white/5 transition-all uppercase tracking-widest", allowedContent: "hidden" }} />
                </div>
              </div>

              {/* HACKS RELACIONADOS INTEGRADOS */}
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
                          <span className="text-[11px] font-black text-white/10 uppercase tracking-[0.3em]">Hack by @{hack.author}</span>
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
        </div>
      )}

      {/* MODAL CREAR NOTA */}
      {showNoteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm">
          <div className="bg-[#282c34] w-full max-w-4xl p-16 rounded-[5rem] border border-white/10 shadow-2xl relative text-left flex flex-col max-h-[90vh]">
            <button onClick={() => setViewingNote(null)} className="absolute top-12 right-12 text-white/10 hover:text-white transition-all text-3xl font-light">✕</button>
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