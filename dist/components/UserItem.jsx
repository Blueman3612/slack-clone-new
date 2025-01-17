"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserItem;
const navigation_1 = require("next/navigation");
const UserAvatar_1 = __importDefault(require("./UserAvatar"));
function UserItem({ user }) {
    const router = (0, navigation_1.useRouter)();
    const handleClick = () => {
        router.push(`/chat/dm/${user.id}`);
    };
    return (<button onClick={handleClick} className="w-full flex items-center gap-x-2 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition p-2 rounded-md">
      <UserAvatar_1.default user={user}/>
      <div className="flex flex-col items-start">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {user.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {user.email}
        </p>
      </div>
    </button>);
}
