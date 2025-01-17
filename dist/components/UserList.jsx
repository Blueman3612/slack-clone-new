"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserList;
const react_1 = require("react");
const utils_1 = require("@/lib/utils");
const StatusTooltip_1 = __importDefault(require("./StatusTooltip"));
const UserStatusContext_1 = require("@/contexts/UserStatusContext");
const lucide_react_1 = require("lucide-react");
const ADMIN_USER_ID = 'cm5ug4h3p0000uj6s1itvm3p7';
const TEST_USER_ID = 'cm5ug4hpp0004uj6spjcdf6sw';
function UserList({ currentUserId, initialUsers = [], onUserClick, selectedUserId, onlineUsers = new Set(), notifications = {} }) {
    const [hoveredUserId, setHoveredUserId] = (0, react_1.useState)(null);
    const userRefs = (0, react_1.useRef)({});
    const { statuses, fetchStatus } = (0, UserStatusContext_1.useUserStatus)();
    (0, react_1.useEffect)(() => {
        let isSubscribed = true;
        const usersToFetch = initialUsers.filter(user => !statuses[user.id]);
        const fetchStatuses = async () => {
            var _a;
            // Fetch in batches with delay to prevent rate limiting
            for (let i = 0; i < usersToFetch.length; i++) {
                if (!isSubscribed)
                    break;
                const user = usersToFetch[i];
                if (!statuses[user.id]) {
                    try {
                        await fetchStatus(user.id);
                        // Add a 500ms delay between requests
                        if (i < usersToFetch.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    catch (error) {
                        // If we hit rate limit, wait longer before retrying
                        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            i--; // Retry this user
                        }
                    }
                }
            }
        };
        if (usersToFetch.length > 0) {
            fetchStatuses();
        }
        return () => {
            isSubscribed = false;
        };
    }, [initialUsers, fetchStatus, statuses]);
    const filteredUsers = initialUsers.filter(user => {
        return user.isAI || (user.id !== ADMIN_USER_ID &&
            user.id !== TEST_USER_ID);
    });
    return (<div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      {filteredUsers.map((user) => {
            var _a, _b;
            const notificationKey = `dm-${user.id}`;
            const notification = notifications[notificationKey];
            return (<button key={user.id} onClick={() => onUserClick(user.id)} className={(0, utils_1.cn)("w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-200", selectedUserId === user.id
                    ? "bg-blue-600/30 border-l-4 border-blue-500"
                    : "hover:bg-gray-700 border-l-4 border-transparent")}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 flex items-center justify-center">
                {user.isAI === true ? (<lucide_react_1.Bot className="w-3 h-3 text-purple-500"/>) : (<div className={(0, utils_1.cn)("w-3 h-3 rounded-full", onlineUsers.has(user.id) ? "bg-green-500" : "bg-gray-500")}/>)}
              </div>
              <div ref={el => userRefs.current[user.id] = el} className="relative flex items-center gap-2" onMouseEnter={() => setHoveredUserId(user.id)} onMouseLeave={() => setHoveredUserId(null)}>
                <div className="relative">
                  <img src={user.image || '/default-avatar.png'} alt={user.name || "User"} className="w-6 h-6 rounded-full"/>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className={(0, utils_1.cn)("text-sm truncate transition-colors duration-200", (notification === null || notification === void 0 ? void 0 : notification.hasUnread) ? "font-bold" : "font-normal", selectedUserId === user.id ? "text-blue-400" : "text-gray-300")}>
                    {user.name || user.email}
                  </span>
                  {user.role === 'ADMIN' && (<lucide_react_1.Shield className="w-4 h-4 text-blue-400 flex-shrink-0" aria-label="Admin"/>)}
                </div>
                {hoveredUserId === user.id && statuses[user.id] && userRefs.current[user.id] && (<StatusTooltip_1.default emoji={(_a = statuses[user.id]) === null || _a === void 0 ? void 0 : _a.emoji} text={(_b = statuses[user.id]) === null || _b === void 0 ? void 0 : _b.text} targetRef={userRefs.current[user.id]}/>)}
              </div>
            </div>
            {(notification === null || notification === void 0 ? void 0 : notification.count) > 0 && (<span className={(0, utils_1.cn)("px-2 py-0.5 text-xs rounded-full", notification.hasMention ? "bg-red-500" : "bg-gray-600")}>
                {notification.count}
              </span>)}
          </button>);
        })}
    </div>);
}
