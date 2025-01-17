"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRole = useRole;
const react_1 = require("next-auth/react");
function useRole() {
    var _a, _b;
    const { data: session } = (0, react_1.useSession)();
    return {
        isAdmin: ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN',
        role: (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role
    };
}
