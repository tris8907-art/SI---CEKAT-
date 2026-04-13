import React, { useState } from 'react';
import { Shield, Lock, User, ChevronRight, AlertCircle, Eye, EyeOff, Flame } from 'lucide-react';
import { auth } from '../services/firebase';
import { signInAnonymously } from 'firebase/auth';

interface Props {
  onLogin: (role: 'admin' | 'petugas') => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const normalizedId = id.trim().toLowerCase();
      const trimmedPassword = password.trim();

      let role: 'admin' | 'petugas' | null = null;

      if (normalizedId === 'admin' && trimmedPassword === 'admin123') {
        role = 'admin';
      } else if (normalizedId === 'petugas' && (trimmedPassword === 'Damkar' || trimmedPassword === 'damkar')) {
        role = 'petugas';
      }

      if (role) {
        // We skip Firebase anonymous auth for now to avoid 'admin-restricted-operation' 
        // if it's not enabled in the Firebase console.
        // The app will still work with local state for the role.
        onLogin(role);
      } else {
        setError('ID Personel atau Kata Sandi salah');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setId(val);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f172a] flex flex-col items-center justify-center p-4 z-[9999] overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <div className="w-full max-w-lg mb-12 relative z-10 flex flex-col items-center">
        <div className="text-center space-y-1">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] select-none leading-none">
            SI-CEKAT
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-red-600"></div>
            <p className="text-sm font-black italic tracking-[0.2em] bg-gradient-to-r from-red-400 via-red-600 to-red-900 bg-clip-text text-transparent uppercase">
              Sistem Ceklis Kendaraan Teknis
            </p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-red-600"></div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] pt-2 opacity-80">
            PEMADAM KEBAKARAN KABUPATEN SELUMA
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-[400px] relative group z-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-25"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="bg-slate-900 py-6 text-center">
            <h2 className="text-lg font-black text-white tracking-tighter uppercase italic">Otoritas Masuk</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Personel</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="petugas / admin"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-slate-900"
                    value={id}
                    onChange={handleIdChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-slate-900 tracking-widest"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={togglePasswordVisibility} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                <AlertCircle size={14} className="shrink-0" />
                <span className="text-[10px] font-black uppercase text-center">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-xl shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'MEMPROSES...' : 'MASUK SISTEM'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Login;