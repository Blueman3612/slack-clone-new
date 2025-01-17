"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionProvider = SessionProvider;
const react_1 = require("next-auth/react");
function SessionProvider({ children, session }) {
    return (<react_1.SessionProvider session={session}>
      {children}
    </react_1.SessionProvider>);
}
