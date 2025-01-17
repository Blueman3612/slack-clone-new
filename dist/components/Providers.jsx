"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Providers;
const next_themes_1 = require("next-themes");
const react_1 = require("next-auth/react");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
function Providers({ children }) {
    return (<react_1.SessionProvider>
      <next_themes_1.ThemeProvider attribute="class">
        <OnlineUsersContext_1.OnlineUsersProvider>
          {children}
        </OnlineUsersContext_1.OnlineUsersProvider>
      </next_themes_1.ThemeProvider>
    </react_1.SessionProvider>);
}
