import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState({ socket: null, connected: false });

  useEffect(() => {
    if (!token || !isAuthenticated) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, { auth: { token } });
    socket.on('connect', () => setState({ socket, connected: true }));
    socket.on('disconnect', () => setState({ socket, connected: false }));
    setState({ socket, connected: socket.connected });

    return () => {
      socket.disconnect();
      setState({ socket: null, connected: false });
    };
  }, [token, isAuthenticated]);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
