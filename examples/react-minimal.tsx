/**
 * Example: Minimal React Setup
 * 
 * The absolute minimum code to get started with BoltSocket React
 */

import React from 'react';
import { createEventRegistry } from '@bolt-socket/core';
import { SocketProvider, useSocketEvent } from '@bolt-socket/react';
import { z } from 'zod';

// 1. Define your events
const events = createEventRegistry({
  'message.received': z.object({
    text: z.string(),
    sender: z.string(),
  }),
});

// 2. Create a component that listens to events
function MessageListener() {
  useSocketEvent('message.received', (data) => {
    console.log(`${data.sender}: ${data.text}`);
  });

  return <div>Listening for messages...</div>;
}

// 3. Wrap your app with SocketProvider
function App() {
  return (
    <SocketProvider url="http://localhost:3000" events={events}>
      <MessageListener />
    </SocketProvider>
  );
}

export default App;

/**
 * That's it! 🎉
 * 
 * - Type-safe events with autocomplete
 * - Automatic cleanup on unmount
 * - Reconnection handled automatically
 * - No manual socket.io code needed
 */
