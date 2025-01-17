"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const prisma_adapter_1 = require("@next-auth/prisma-adapter");
const github_1 = __importDefault(require("next-auth/providers/github"));
const prisma_1 = require("./prisma");
exports.authOptions = {
    adapter: (0, prisma_adapter_1.PrismaAdapter)(prisma_1.prisma),
    providers: [
        (0, github_1.default)({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Allow sign in if account exists or create new account
            if (account && profile) {
                const existingUser = await prisma_1.prisma.user.findUnique({
                    where: { email: profile.email },
                    include: { accounts: true },
                });
                if (!existingUser) {
                    // Create new user if doesn't exist
                    return true;
                }
                if (existingUser && !existingUser.accounts.length) {
                    // Link account if user exists but no accounts linked
                    await prisma_1.prisma.account.create({
                        data: {
                            userId: existingUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            token_type: account.token_type,
                            scope: account.scope,
                        },
                    });
                    return true;
                }
                // Allow sign in if account is already linked
                return true;
            }
            return false;
        },
        async session({ session, token }) {
            if (session === null || session === void 0 ? void 0 : session.user) {
                session.user.id = token.sub;
                // Fetch latest user data from database
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: token.sub }
                });
                // Use the latest role from database
                session.user.role = (user === null || user === void 0 ? void 0 : user.role) || 'USER';
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login', // Add this to handle errors
    },
    session: {
        strategy: "jwt",
    },
    debug: process.env.NODE_ENV === 'development',
};
