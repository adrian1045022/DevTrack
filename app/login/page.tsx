'use client';
import { auth } from '../../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (e) { 
      console.error(e);
      alert("Error de autorización. Revisa los dominios en Firebase.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (e) { 
      alert("Credenciales incorrectas o usuario no registrado.");
    }
  };

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#050505] p-4 overflow-hidden selection:bg-blue-500/30">
      
      {/* Glows de fondo para profundidad visual */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-3xl p-10 md:p-12 rounded-[3.5rem] shadow-2xl">
          
          <header className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
              Dev<span className="text-blue-500">Track</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase mt-3">Elite Access Only</p>
          </header>

          {/* Formulario de Email */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              required
            />
            <button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase text-[11px] tracking-widest">
              Iniciar Sesión
            </button>
          </form>

          {/* Separador */}
          <div className="my-8 flex items-center gap-4 text-slate-800">
            <div className="h-[1px] bg-white/5 flex-1" />
            <span className="text-[10px] font-black uppercase">O continuar con</span>
            <div className="h-[1px] bg-white/5 flex-1" />
          </div>

          {/* Botón Google Corregido */}
          <button 
            type="button"
            onClick={handleGoogle}
            className="group w-full h-14 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                className="w-full h-full object-contain" 
                alt="Google" 
              />
            </div>
            <span className="text-xs uppercase tracking-tight">Google</span>
          </button>

          <footer className="mt-10 pt-8 border-t border-white/5">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
              Sincronización en la nube activa
            </p>
          </footer>

        </div>
      </div>
    </main>
  );
}