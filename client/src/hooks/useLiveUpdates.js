import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

const EVENTS = [
  'issue:created',
  'issue:updated',
  'issue:deleted',
  'project:created',
  'project:updated',
  'project:deleted',
];

/**
 * Calls `onChange(eventName, payload)` whenever another user (or this one)
 * changes something on the board. Bursts of events are collapsed into a single
 * callback so the page refetches once, not once per event.
 *
 * Pass `events` to listen to a subset, or `['stats:changed']` for the dashboard.
 */
export default function useLiveUpdates(onChange, events = EVENTS) {
  const { socket } = useSocket();
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!socket) return undefined;

    let timer;
    const listeners = events.map((name) => {
      const listener = (payload) => {
        clearTimeout(timer);
        timer = setTimeout(() => handler.current(name, payload), 150);
      };
      socket.on(name, listener);
      return [name, listener];
    });

    return () => {
      clearTimeout(timer);
      listeners.forEach(([name, listener]) => socket.off(name, listener));
    };
    // `events` is a constant list per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);
}
