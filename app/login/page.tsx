'use client';
import { auth } from '../../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, getAdditionalUserInfo } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Comprobar si Firebase ya tiene una sesión recordada en este navegador
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (pendingRedirect === '/registro') {
          return; // Esperamos a que el handler decida hacia dónde ir
        }
        router.replace('/dashboard'); // Si hay sesión recurrente, redirigimos sin guardar historial
      } else {
        setIsCheckingAuth(false); // Si no hay sesión, mostramos el formulario
      }
    });
    return () => unsub();
  }, [router, pendingRedirect]);

  const handleGoogle = async () => {
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      setPendingRedirect('/registro');

      const userCredential = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(userCredential);

      if (additionalUserInfo?.isNewUser) {
        router.push('/registro');
      } else {
        setPendingRedirect(null);
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      setPendingRedirect(null);
      alert('Error de autorización. Revisa los dominios en Firebase.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      setPendingRedirect(null);
      if (error.code === 'auth/user-not-found') {
        router.push('/registro');
      } else {
        alert('Credenciales incorrectas o usuario no registrado.');
      }
    }
  };

  // Pantalla de carga mientras Firebase verifica IndexedDB/SessionStorage
  if (isCheckingAuth) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <p className="text-blue-500 font-bold tracking-[0.2em] text-[10px] uppercase animate-pulse">Accediendo...</p>
        </div>
      </main>
    );
  }

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
            
            <div className="flex items-center justify-between">
              {/* Checkbox para "Recordarme" */}
              <label className="flex items-center gap-2 text-white/70 cursor-pointer text-[11px] select-none uppercase tracking-wide">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-1 transition-all"
                />
                Recordarme
              </label>

              <Link href="/recuperar-contrasena" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-all uppercase tracking-wider">
                ¿Olvidaste la contraseña?
              </Link>
            </div>

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

          <footer className="mt-10 pt-8 border-t border-white/5 text-center">
            <div className="flex flex-col items-center gap-4">
              <Link href="/registro" className="text-[10px] font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest">
                ¿No tienes cuenta? <span className="text-blue-500">Regístrate</span>
              </Link>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                Sincronización en la nube activa
              </p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}