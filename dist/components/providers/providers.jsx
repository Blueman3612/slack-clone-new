"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = Providers;
const theme_provider_1 = require("@/components/providers/theme-provider");
const toaster_1 = require("@/components/ui/toaster");
const UserStatusContext_1 = require("@/contexts/UserStatusContext");
const session_provider_1 = require("@/components/providers/session-provider");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const PusherContext_1 = require("@/contexts/PusherContext");
function Providers({ children, session }) {
    return (<session_provider_1.SessionProvider session={session}>
      <theme_provider_1.ThemeProvider attribute="class" defaultTheme="dark">
        <PusherContext_1.PusherProvider>
          <OnlineUsersContext_1.OnlineUsersProvider>
            <UserStatusContext_1.UserStatusProvider>
              {children}
              <toaster_1.Toaster />
            </UserStatusContext_1.UserStatusProvider>
          </OnlineUsersContext_1.OnlineUsersProvider>
        </PusherContext_1.PusherProvider>
      </theme_provider_1.ThemeProvider>
    </session_provider_1.SessionProvider>);
}
