'use client';
import { useEffect, useState } from 'react';
import { getAllUsersPublic } from '../../../lib/techActions';
import Link from 'next/link';

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllUsersPublic();
      setUsers(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Cargando Comunidad...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans selection:bg-indigo-500/30">
      <nav className="bg-[#16191d]/80 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <Link href="/community" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
           <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform -rotate-3">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-indigo-400">Directory</span></h1>
        </Link>
        <div className="flex gap-4">
          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Hacks</Link>
          <Link href="/dashboard" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-12">
        <header className="text-center mb-16">
          <p className="text-[12px] font-black text-indigo-400/50 tracking-[0.4em] uppercase mb-4 italic">Conecta con otros Devs</p>
          <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-8">Nuestra <span className="text-indigo-400">Comunidad</span></h2>
          
          <div className="max-w-xl mx-auto relative group">
            <input 
              type="text" 
              placeholder="BUSCAR USUARIO POR NOMBRE O EMAIL..." 
              className="w-full bg-[#282c34] p-6 rounded-3xl border border-white/5 font-black uppercase text-sm outline-none focus:border-indigo-500 text-white tracking-widest transition-all pl-14 shadow-2xl"
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.map((u, i) => (
            <Link href={`/u/${u.email}`} key={i} className="group">
              <div className="bg-[#282c34] p-8 rounded-[3rem] border border-white/5 shadow-2xl hover:border-indigo-500/30 transition-all hover:-translate-y-2 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[4rem] -z-0 group-hover:bg-indigo-500/10 transition-colors"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase text-white group-hover:text-indigo-400 transition-colors">@{u.username}</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{u.email.split('@')[1]}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                      <span className="block text-[8px] font-black text-white/20 uppercase mb-1">Level</span>
                      <span className="text-lg font-black text-white">{u.level}</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                      <span className="block text-[8px] font-black text-white/20 uppercase mb-1">Techs</span>
                      <span className="text-lg font-black text-emerald-400">{u.techs}</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                      <span className="block text-[8px] font-black text-white/20 uppercase mb-1">Posts</span>
                      <span className="text-lg font-black text-indigo-400">{u.posts}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-4">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Ver Perfil Público</span>
                   <span className="text-indigo-400 group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-24 text-center opacity-20 font-black uppercase tracking-[0.5em] border-2 border-dashed border-white/5 rounded-[4rem]">
            No se encontraron usuarios
          </div>
        )}
      </main>
    </div>
  );
}