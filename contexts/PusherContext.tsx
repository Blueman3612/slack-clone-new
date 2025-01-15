'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { pusherClient, isClient } from '@/lib/pusher';
import { Message, Reaction } from '@/types';
import { Channel, PresenceChannel } from 'pusher-js';
import { useSession } from 'next-auth/react';

const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    const message = args[0];
    const isCritical = 
      message.includes('Error:') || 
      message.includes('error subscribing') ||
      message.includes('cleanup') ||
      message.includes('unsubscribing');
      
    if (isCritical) {
      console.debug('[PusherContext]', ...args);
    }
  }
};

export interface PusherContextType {
  subscribeToChannel: (
    channelName: string,
    handlers: {
      onNewMessage?: (data: any) => void;
      onTyping?: (data: any) => void;
      onStopTyping?: (data: any) => void;
      onReaction?: (data: any) => void;
      onThreadUpdate?: (data: any) => void;
    }
  ) => void;
  unsubscribeFromChannel: (channelName: string) => void;
  subscribeToPresenceChannel: (
    channelName: string,
    handlers: {
      onSubscriptionSucceeded?: (members: any) => void;
      onMemberAdded?: (member: any) => void;
      onMemberRemoved?: (member: any) => void;
    }
  ) => void;
}

export const PusherContext = createContext<PusherContextType | null>(null);

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const subscriptionsRef = useRef<Map<string, Channel>>(new Map());

  const unsubscribeFromChannel = useCallback((channelName: string) => {
    debug(`Unsubscribing from channel: ${channelName}`);
    if (!isClient || !pusherClient) return;

    try {
      const channel = subscriptionsRef.current.get(channelName);
      if (channel) {
        channel.unbind_all();
        pusherClient.unsubscribe(channelName);
        subscriptionsRef.current.delete(channelName);
        debug(`Successfully unsubscribed from ${channelName}`);
      }
    } catch (error) {
      console.error(`Error in unsubscribeFromChannel for ${channelName}:`, error);
    }
  }, []);

  const subscribeToChannel = useCallback((
    channelName: string,
    handlers: {
      onNewMessage?: (data: any) => void;
      onTyping?: (data: any) => void;
      onStopTyping?: (data: any) => void;
      onReaction?: (data: any) => void;
      onThreadUpdate?: (data: any) => void;
    }
  ) => {
    if (!pusherClient) {
      console.error('Pusher client is not available');
      return;
    }

    // Clean up any existing subscription
    unsubscribeFromChannel(channelName);

    // Subscribe to the channel
    const channel = pusherClient.subscribe(channelName);

    // Bind to events
    if (handlers.onNewMessage) {
      channel.bind('new-message', handlers.onNewMessage);
    }

    if (handlers.onTyping) {
      channel.bind('client-typing', handlers.onTyping);
    }

    if (handlers.onStopTyping) {
      channel.bind('client-stop-typing', handlers.onStopTyping);
    }

    if (handlers.onReaction) {
      channel.bind('reaction-added', (data: any) => {
        handlers.onReaction?.({
          messageId: data.messageId,
          reaction: data.reaction,
          type: 'add'
        });
      });

      channel.bind('reaction-removed', (data: any) => {
        handlers.onReaction?.({
          messageId: data.messageId,
          reaction: data.reaction,
          type: 'remove'
        });
      });
    }

    if (handlers.onThreadUpdate) {
      channel.bind('thread-update', handlers.onThreadUpdate);
    }

    // Store the subscription
    subscriptionsRef.current.set(channelName, channel);
  }, [unsubscribeFromChannel]);

  const subscribeToPresenceChannel = useCallback((
    channelName: string,
    handlers: {
      onSubscriptionSucceeded?: (members: any) => void;
      onMemberAdded?: (member: any) => void;
      onMemberRemoved?: (member: any) => void;
    }
  ) => {
    if (!isClient || !pusherClient) return;
    if (!session?.user) {
      debug(`Skipping presence channel subscription to ${channelName}: No authenticated user`);
      return;
    }
    
    debug(`Subscribing to presence channel: ${channelName}`);

    try {
      // Check for existing subscription in Pusher
      const existingPusherChannel = pusherClient.channel(channelName);
      if (existingPusherChannel) {
        debug(`Found existing Pusher subscription to ${channelName}, unsubscribing`);
        existingPusherChannel.unbind_all();
        pusherClient.unsubscribe(channelName);
      }

      // Check our local subscriptions
      if (subscriptionsRef.current.has(channelName)) {
        debug(`Found existing local subscription to ${channelName}, cleaning up`);
        unsubscribeFromChannel(channelName);
      }

      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      subscriptionsRef.current.set(channelName, channel);

      if (handlers.onSubscriptionSucceeded) {
        channel.bind('pusher:subscription_succeeded', handlers.onSubscriptionSucceeded);
      }

      if (handlers.onMemberAdded) {
        channel.bind('pusher:member_added', handlers.onMemberAdded);
      }

      if (handlers.onMemberRemoved) {
        channel.bind('pusher:member_removed', handlers.onMemberRemoved);
      }

      channel.bind('pusher:subscription_error', (error: any) => {
        debug(`Error subscribing to presence channel ${channelName}:`, error);
      });
    } catch (error) {
      console.error(`Error in subscribeToPresenceChannel for ${channelName}:`, error);
    }
  }, [unsubscribeFromChannel, session]);

  // Clean up all subscriptions when the provider unmounts
  useEffect(() => {
    return () => {
      if (isClient && pusherClient) {
        subscriptionsRef.current.forEach((_, channelName) => {
          unsubscribeFromChannel(channelName);
        });
      }
    };
  }, [unsubscribeFromChannel]);

  const value = useMemo(() => ({
    subscribeToChannel,
    unsubscribeFromChannel,
    subscribeToPresenceChannel
  }), [subscribeToChannel, unsubscribeFromChannel, subscribeToPresenceChannel]);

  return (
    <PusherContext.Provider value={value}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (!context) {
    throw new Error('usePusher must be used within a PusherProvider');
  }
  return context;
} 