"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPanel = ServerPanel;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const react_2 = require("next-auth/react");
const utils_1 = require("@/lib/utils");
const navigation_1 = require("next/navigation");
const ServerModal_1 = __importDefault(require("./modals/ServerModal"));
function ServerPanel() {
    const { data: session } = (0, react_2.useSession)();
    console.log('Current session:', session);
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [isCreatingServer, setIsCreatingServer] = (0, react_1.useState)(false);
    const [isJoiningServer, setIsJoiningServer] = (0, react_1.useState)(false);
    const [servers, setServers] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let isSubscribed = true;
        const fetchServers = async () => {
            try {
                const response = await fetch('/api/servers');
                if (response.ok) {
                    const data = await response.json();
                    if (isSubscribed) {
                        setServers(data);
                    }
                }
            }
            catch (error) {
                console.error('Failed to fetch servers:', error);
            }
        };
        fetchServers();
        return () => {
            isSubscribed = false;
        };
    }, []);
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        return null;
    }
    const currentServerId = searchParams.get('serverId');
    return (<>
      <div className="flex flex-col w-20 bg-gray-950 h-full">
        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Home Button */}
          <div className="relative w-14 h-14">
            <image_1.default src="/Acksle Logo.png" alt="Home" width={30} height={30} className="object-contain"/>
          </div>

          <div className="w-14 h-[2px] bg-gray-800 mx-auto my-2"/>

          {/* Server List */}
          {servers.map((server) => (<button key={server.id} className={(0, utils_1.cn)("w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-indigo-500", currentServerId === server.id && "bg-indigo-500")} onClick={() => router.push(`/chat?serverId=${server.id}`)}>
              <span className="text-white font-semibold">
                {server.name.substring(0, 2).toUpperCase()}
              </span>
            </button>))}

          {/* Add Server Button */}
          <div className="space-y-2">
            <button className="w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-green-500 group" onClick={() => setIsCreatingServer(true)}>
              <lucide_react_1.Plus className="text-green-500 group-hover:text-white transition-colors" size={25}/>
            </button>
            <button className="w-14 h-14 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-gray-800 hover:bg-blue-500 group" onClick={() => setIsJoiningServer(true)}>
              <lucide_react_1.Plus className="text-blue-500 group-hover:text-white transition-colors rotate-45" size={25}/>
            </button>
          </div>
        </div>
      </div>

      <ServerModal_1.default isOpen={isCreatingServer} onClose={() => setIsCreatingServer(false)} mode="create" onSuccess={(server) => {
            setServers(prev => [...prev, server]);
            router.push(`/chat?serverId=${server.id}`);
        }}/>

      <ServerModal_1.default isOpen={isJoiningServer} onClose={() => setIsJoiningServer(false)} mode="join" onSuccess={(server) => {
            setServers(prev => [...prev, server]);
            router.push(`/chat?serverId=${server.id}`);
        }}/>
    </>);
}
