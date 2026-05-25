'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (e.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido.');
      } else if (e.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error al intentar crear la cuenta. Inténtalo de nuevo.');
      }
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
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase mt-3">Crear Cuenta</p>
          </header>

          <form onSubmit={handleRegister} className="space-y-4">
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
            <input 
              type="password" 
              placeholder="Confirmar Contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              required
            />
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-[11px] text-red-400 font-semibold text-center tracking-wide leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full h-14 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase text-[11px] tracking-widest"
            >
              Registrarse
            </button>
          </form>

          <footer className="mt-10 pt-8 border-t border-white/5 text-center">
            <div className="flex flex-col items-center gap-4">
              <Link href="/login" className="text-[10px] font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest">
                ¿Ya tienes cuenta? <span className="text-blue-500">Inicia sesión</span>
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}