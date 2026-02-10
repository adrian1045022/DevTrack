'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  addTechnology, getTechnologies, deleteTechnology, 
  addResourceToTech, removeResource, addNoteToTech, removeNote 
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [techs, setTechs] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [viewingNote, setViewingNote] = useState<any>(null);
  const router = useRouter();

  const refresh = useCallback(async (email: string) => {
    const data = await getTechnologies(email);
    setTechs(data || []);
    if (selectedTech) {
      const updated = data.find((t: any) => t.id === selectedTech.id);
      if (updated) setSelectedTech(updated);
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

  if (loading) return <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-cyan-500 font-black italic">CARGANDO...</div>;

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white pb-20 font-sans relative">
      <nav className="bg-[#121418]/40 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center font-black italic text-black text-2xl transform -rotate-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter">Dev<span className="text-cyan-500">Track</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-cyan-500 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl">Comunidad</Link>
          <button onClick={() => signOut(auth)} className="bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-[10px] font-black px-6 py-2.5 rounded-xl transition-all border border-white/10 uppercase tracking-widest">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-12 text-center">
        <section className="bg-[#1a1d23] p-2 rounded-[2.5rem] max-w-2xl mx-auto mb-20 border border-white/5 shadow-2xl">
          <form action={async (fd) => { await addTechnology(fd, user?.email); refresh(user?.email); }} className="flex gap-2">
            <input name="techName" placeholder="¿QUÉ VAMOS A DOMINAR HOY?" required className="flex-1 bg-transparent px-8 py-4 outline-none font-black text-lg placeholder:text-white/10 italic uppercase tracking-widest text-center" />
            <button className="bg-cyan-500 text-black px-12 py-4 rounded-[1.8rem] font-black text-xs uppercase shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">Añadir</button>
          </form>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {techs.map((t) => (
            <div key={t.id} onClick={() => setSelectedTech(t)} className="bg-[#161920] p-12 rounded-[4rem] border border-white/5 shadow-2xl cursor-pointer hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.15)] transition-all flex flex-col h-[350px] active:scale-95 duration-500 text-left relative overflow-hidden group">
              <div className="flex justify-between items-center mb-8 relative z-10">
                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/5 px-4 py-1.5 rounded-full border border-cyan-500/20 italic">{t.status}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteTechnology(t.id).then(() => refresh(user.email)); }} className="text-white/10 hover:text-red-500 transition-all p-2 text-xl">✕</button>
              </div>
              <h3 className="text-4xl font-black italic uppercase text-white mb-4 leading-tight tracking-tighter group-hover:text-cyan-400 transition-colors">{t.name}</h3>
              <div className="mt-auto flex flex-col gap-4 relative z-10">
                 <div className="flex gap-3 font-black text-[10px] uppercase tracking-widest text-white/30">
                    <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">📄 {t.resources?.length || 0}</span>
                    <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">📝 {t.notes?.length || 0}</span>
                 </div>
                 <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]" style={{ width: t.status === 'Dominado' ? '100%' : '35%' }}></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0c10]/95 backdrop-blur-md" onClick={() => setSelectedTech(null)} />
          <div className="relative w-full max-w-6xl bg-[#1e2229] h-[85vh] overflow-hidden rounded-[4rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-[#121418]/60 text-left">
              <div>
                <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter leading-none">{selectedTech.name}</h2>
                <p className="text-[11px] font-black text-cyan-500 tracking-[0.5em] uppercase mt-3 italic">Estación de Trabajo</p>
              </div>
              <button onClick={() => setSelectedTech(null)} className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-red-500 transition-all text-3xl font-light">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[12px] font-black uppercase text-cyan-500 italic tracking-[0.2em]">Mis Apuntes</h4>
                  <button onClick={() => setShowNoteForm(true)} className="text-[10px] font-black bg-white text-black px-8 py-3 rounded-2xl hover:bg-cyan-500 transition-all uppercase tracking-widest shadow-xl">+ NOTA</button>
                </div>
                <div className="space-y-4">
                  {/* SEGURIDAD CON Array.isArray */}
                  {Array.isArray(selectedTech.notes) ? selectedTech.notes.map((note: any) => (
                    <div key={note.id} className="bg-[#121418] p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-cyan-500/30 transition-all shadow-xl group">
                      <button onClick={() => setViewingNote(note)} className="flex items-center gap-6 flex-1 text-left">
                        <span className="text-2xl opacity-50 group-hover:opacity-100 transition-all">📝</span>
                        <span className="text-[15px] font-black text-white/80 uppercase tracking-tight truncate">{note.title}</span>
                      </button>
                      <button onClick={() => removeNote(selectedTech.id, note.id).then(() => refresh(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                    </div>
                  )) : <p className="text-white/10 text-center italic py-10 uppercase tracking-widest text-[10px]">Sin notas</p>}
                </div>
              </div>
              <div className="space-y-8 border-l border-white/5 pl-12">
                <h4 className="text-[12px] font-black uppercase text-white/20 italic tracking-[0.2em] text-center">DOCUMENTACIÓN</h4>
                <div className="space-y-4">
                  {selectedTech.resources?.map((file: any, idx: number) => (
                    <div key={idx} className="bg-[#121418] p-6 rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
                      <a href={file.url} target="_blank" className="flex items-center gap-6 truncate flex-1 hover:text-cyan-500 transition-colors">
                        <span className="text-3xl opacity-50">📄</span>
                        <span className="text-[13px] font-bold text-white/80 truncate">{file.name}</span>
                      </a>
                      <button onClick={() => removeResource(selectedTech.id, file.url).then(() => refresh(user.email))} className="text-white/20 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                    </div>
                  ))}
                </div>
                <UploadButton
                  endpoint="techAttachment"
                  onClientUploadComplete={(res) => { if (res) addResourceToTech(selectedTech.id, res[0].url, res[0].name).then(() => refresh(user.email)); }}
                  onUploadError={(e) => alert(e.message)}
                  content={{ button: "SUBIR RECURSO" }}
                  appearance={{
                    button: "w-full bg-cyan-500 text-black text-[14px] font-black py-10 rounded-[2.5rem] hover:brightness-110 shadow-lg shadow-cyan-500/20 border-none transition-all uppercase tracking-widest",
                    allowedContent: "hidden" 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NOTA */}
      {showNoteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#1e2229] w-full max-w-2xl p-12 rounded-[4rem] border border-cyan-500/30">
            <h3 className="text-3xl font-black mb-10 uppercase italic text-cyan-500 text-center tracking-widest text-left">Añadir Nota</h3>
            <input placeholder="TÍTULO / ENUNCIADO" className="w-full bg-[#121418] p-6 rounded-3xl mb-5 outline-none border border-white/5 font-black uppercase text-sm tracking-widest text-white text-left focus:border-cyan-500 transition-all" onChange={(e) => setNoteTitle(e.target.value)} />
            <textarea placeholder="Contenido de la nota..." className="w-full h-72 bg-[#121418] p-8 rounded-3xl mb-10 outline-none border border-white/5 text-slate-300 resize-none font-medium italic text-left text-lg focus:border-cyan-500 transition-all" onChange={(e) => setNoteContent(e.target.value)} />
            <div className="flex gap-6">
                <button onClick={() => setShowNoteForm(false)} className="flex-1 py-5 bg-white/5 rounded-3xl font-black text-[10px] uppercase hover:bg-red-500/20 transition-all tracking-widest">Cerrar</button>
                <button onClick={() => addNoteToTech(selectedTech.id, noteTitle, noteContent).then(() => { setShowNoteForm(false); refresh(user.email); })} className="flex-1 py-5 bg-cyan-500 text-black rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all tracking-widest">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEER NOTA */}
      {viewingNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#1e2229] w-full max-w-4xl p-16 rounded-[5rem] border border-white/10 shadow-2xl relative text-left">
            <button onClick={() => setViewingNote(null)} className="absolute top-12 right-12 text-white/30 hover:text-white transition-all text-3xl font-light">✕</button>
            <h3 className="text-4xl font-black mb-12 uppercase italic text-cyan-500 border-b border-white/5 pb-10 tracking-tighter text-left leading-none">{viewingNote.title}</h3>
            <div className="text-slate-300 text-xl leading-relaxed max-h-[50vh] overflow-y-auto pr-8 whitespace-pre-wrap italic font-medium text-left">"{viewingNote.content}"</div>
          </div>
        </div>
      )}
    </div>
  );
}