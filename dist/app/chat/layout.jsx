"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatLayout;
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const navigation_1 = require("next/navigation");
const ChatSidebar_1 = __importDefault(require("@/components/ChatSidebar"));
const ServerPanel_1 = require("@/components/ServerPanel");
async function ChatLayout({ children, }) {
    const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        (0, navigation_1.redirect)("/login");
    }
    return (<main className="flex h-screen w-full">
      <ServerPanel_1.ServerPanel />
      <div className="flex flex-1 min-w-0">
        <ChatSidebar_1.default />
        {children}
      </div>
    </main>);
}
