"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchResults;
const MessageBubble_1 = __importDefault(require("./MessageBubble"));
const react_1 = require("next-auth/react");
function SearchResults({ results, searchQuery, onThreadClick }) {
    const { data: session } = (0, react_1.useSession)();
    // Group messages by channel/DM
    const groupedResults = results.reduce((acc, message) => {
        var _a, _b, _c;
        const key = message.channelId
            ? `channel:${message.channelId}`
            : `dm:${message.receiverId || message.userId}`;
        if (!acc[key]) {
            acc[key] = {
                type: message.channelId ? 'channel' : 'dm',
                name: message.channelId
                    ? (_a = message.channel) === null || _a === void 0 ? void 0 : _a.name
                    : message.receiverId === ((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.id)
                        ? message.user.name
                        : (_c = message.receiver) === null || _c === void 0 ? void 0 : _c.name,
                messages: []
            };
        }
        acc[key].messages.push(message);
        return acc;
    }, {});
    return (<div className="flex-1 overflow-y-auto">
      {Object.entries(groupedResults).map(([key, group]) => (<div key={key} className="mb-6">
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 sticky top-0">
            <h3 className="text-sm font-semibold">
              {group.type === 'channel' ? '#' : '@'} {group.name}
            </h3>
          </div>
          <div>
            {group.messages.map((message) => {
                var _a;
                return (<MessageBubble_1.default key={message.id} message={message} isOwn={message.userId === ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)} chatType={group.type === 'channel' ? 'channel' : 'dm'} chatId={group.type === 'channel' ? message.channelId : message.receiverId} searchQuery={searchQuery} onThreadClick={() => onThreadClick === null || onThreadClick === void 0 ? void 0 : onThreadClick(message)}/>);
            })}
          </div>
        </div>))}
      {results.length === 0 && searchQuery && (<div className="flex items-center justify-center h-full text-gray-500">
          No messages found
        </div>)}
    </div>);
}
