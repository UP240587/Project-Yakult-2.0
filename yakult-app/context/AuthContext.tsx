import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthDB, setAuthUsuario, setAuthErrorHandler } from '../services/db';

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
    Promise.all([
      AsyncStorage.getItem('yakult_usuario'),
      AsyncStorage.getItem('yakult_token'),
    ])
      .then(async ([data, token]) => {
        if (data && token) {
          const guardado: Usuario = JSON.parse(data);
          setUsuario(guardado);
          setAuthUsuario(guardado, token);
        } else if (data && !token) {
          await AsyncStorage.removeItem('yakult_usuario');
        }
      })
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (u: Usuario, token?: string) => {
    setUsuario(u);
    setAuthUsuario(u, token);
    await AsyncStorage.setItem('yakult_usuario', JSON.stringify(u));
    if (token) await AsyncStorage.setItem('yakult_token', token);
  };

  const login = async (correo: string, contrasena: string) => {
    try {
      const res = await AuthDB.login({ correo, contrasena });
      if (res.error) return { ok: false, error: res.error };
      await guardar(res.usuario, res.token);
      return { ok: true };
    } catch { return { ok: false, error: 'Sin conexión con el servidor.' }; }
  };

  const registro = async (nombre: string, correo: string, contrasena: string) => {
    try {
      const res = await AuthDB.registro({ nombre, correo, contrasena });
      if (res.error) return { ok: false, error: res.error };
      await guardar(res.usuario, res.token);
      return { ok: true };
    } catch { return { ok: false, error: 'Sin conexión con el servidor.' }; }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('yakult_usuario');
    await AsyncStorage.removeItem('yakult_token');
    setAuthUsuario(null);
    setUsuario(null);
  };

  // Si cualquier petición recibe 401 (token expirado/inválido), cerramos sesión
  // para que el usuario vuelva a iniciar sesión y obtenga un token válido.
  useEffect(() => {
    setAuthErrorHandler(() => { logout(); });
    return () => setAuthErrorHandler(null);
  }, []);

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
