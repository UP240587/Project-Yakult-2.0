import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthDB } from '../services/db';

export type Usuario = { id: number; nombre: string; correo: string; rol: 'Master' | 'Promotor' };

type AuthContextType = {
  usuario:  Usuario | null;
  cargando: boolean;
  login:    (correo: string, contrasena: string)                    => Promise<{ ok: boolean; error?: string }>;
  registro: (nombre: string, correo: string, contrasena: string)   => Promise<{ ok: boolean; error?: string }>;
  logout:   () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario,  setUsuario]  = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('yakult_usuario')
      .then(data => { if (data) setUsuario(JSON.parse(data)); })
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (u: Usuario) => {
    setUsuario(u);
    await AsyncStorage.setItem('yakult_usuario', JSON.stringify(u));
  };

  const login = async (correo: string, contrasena: string) => {
    try {
      const res = await AuthDB.login({ correo, contrasena });
      if (res.error) return { ok: false, error: res.error };
      await guardar(res.usuario);
      return { ok: true };
    } catch { return { ok: false, error: 'Sin conexión con el servidor.' }; }
  };

  const registro = async (nombre: string, correo: string, contrasena: string) => {
    try {
      const res = await AuthDB.registro({ nombre, correo, contrasena });
      if (res.error) return { ok: false, error: res.error };
      await guardar(res.usuario);
      return { ok: true };
    } catch { return { ok: false, error: 'Sin conexión con el servidor.' }; }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('yakult_usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};