"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.canManageUsers = canManageUsers;
exports.canManageChannels = canManageChannels;
function isAdmin(userRole) {
    return userRole === 'ADMIN';
}
function canManageUsers(userRole) {
    return isAdmin(userRole);
}
function canManageChannels(userRole) {
    return isAdmin(userRole);
}
