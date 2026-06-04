'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { upsertUserProfile } from '../../lib/techActions';
import Link from 'next/link';
import { UploadButton } from "../../lib/uploadthing";

export default function RegistroPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email || '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de nombre de usuario
    if (!username.trim() || username.length < 3 || username.length > 30) {
      setError('El nombre de usuario debe tener entre 3 y 30 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let currentUser = user;
      
      // Si el usuario no viene de Google (no hay sesión aún), creamos su cuenta en Firebase
      if (!currentUser) {
        if (!email || !password) {
          setError('El email y la contraseña son obligatorios para crear la cuenta');
          setIsSubmitting(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
      }

      // NOTA: Si usas UploadThing o Firebase Storage para las imágenes,
      // deberías subir 'avatarFile' aquí a tu Storage y obtener la URL final. 
      // Por ahora usaremos la preview local como placeholder en la base de datos.
      let finalAvatarUrl = currentUser.photoURL || '';
      if (avatarPreview) {
        finalAvatarUrl = avatarPreview;
      }

      // Actualizamos el perfil básico en Firebase Auth
      await updateProfile(currentUser, {
        displayName: username,
        photoURL: finalAvatarUrl
      });

      // Guardamos el perfil permanentemente en Supabase usando tu action
      await upsertUserProfile(currentUser.email, username, finalAvatarUrl);

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Hubo un error al crear la cuenta o perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/[0.02] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl backdrop-blur-3xl">
        <h1 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter italic">
          Completar <span className="text-blue-500">Perfil</span>
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">Personaliza tu cuenta en DevTrack.</p>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-sm font-bold mb-6 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!user && (
            <>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
              <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
            </>
          )}

          <input type="text" placeholder="Nombre de usuario (ej: CodeMaster)" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />

          <div className="flex flex-col items-center gap-4 py-4">
             {avatarPreview ? (
               <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-xl" />
             ) : (
               <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">Avatar</div>
             )}
          <UploadButton 
            endpoint="techAttachment" 
            onClientUploadComplete={(res) => { 
              if (res) { setAvatarPreview(res[0].url); setError(''); }
            }} 
            onUploadError={(e) => setError(e.message)} 
            appearance={{ button: "text-xs bg-blue-500/10 text-blue-400 font-bold px-4 py-3 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-all border border-blue-500/20 w-auto", allowedContent: "hidden" }} 
            content={{ button: "Subir Imagen (Opcional)" }} 
          />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-4">
            {isSubmitting ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </form>
      </div>
    </main>
  );
}