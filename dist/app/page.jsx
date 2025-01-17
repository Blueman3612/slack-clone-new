"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const next_auth_1 = require("next-auth");
const navigation_1 = require("next/navigation");
const auth_1 = require("@/lib/auth");
const SignInButton_1 = require("@/components/auth/SignInButton");
async function Home() {
    const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
    if (session) {
        (0, navigation_1.redirect)('/chat');
    }
    return (<div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">Welcome to Chat App</h1>
        <SignInButton_1.SignInButton />
      </div>
    </div>);
}
