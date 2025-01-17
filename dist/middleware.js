"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const jwt_1 = require("next-auth/jwt");
const server_1 = require("next/server");
async function middleware(request) {
    const token = await (0, jwt_1.getToken)({ req: request });
    const { pathname } = request.nextUrl;
    // Allow requests to /login
    if (pathname.startsWith('/login')) {
        return server_1.NextResponse.next();
    }
    // Protect all other routes
    if (!token) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.url));
        return server_1.NextResponse.redirect(url);
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
