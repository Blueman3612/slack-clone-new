"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
const google_1 = require("next/font/google");
const theme_provider_1 = require("@/components/providers/theme-provider");
const toaster_1 = require("@/components/ui/toaster");
const UserStatusContext_1 = require("@/contexts/UserStatusContext");
const session_provider_1 = require("@/components/providers/session-provider");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const utils_1 = require("@/lib/utils");
const OnlineUsersContext_1 = require("@/contexts/OnlineUsersContext");
const PusherContext_1 = require("@/contexts/PusherContext");
const inter = (0, google_1.Inter)({ subsets: ['latin'] });
exports.metadata = {
    title: 'Acksle',
    description: 'A real-time chat application',
};
async function RootLayout({ children, }) {
    const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
    return (<html lang="en" suppressHydrationWarning>
      <body className={(0, utils_1.cn)("bg-white dark:bg-gray-900", inter.className)}>
        <session_provider_1.SessionProvider session={session}>
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
        </session_provider_1.SessionProvider>
      </body>
    </html>);
}
