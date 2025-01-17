"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateChannelModal = CreateChannelModal;
const react_1 = require("react");
function CreateChannelModal({ isOpen, onClose, onCreateChannel }) {
    const [channelName, setChannelName] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    if (!isOpen)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onCreateChannel(channelName);
            setChannelName('');
            onClose();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to create channel');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Create New Channel</h2>
        
        {error && (<div className="mb-4 text-red-500 text-sm">
            {error}
          </div>)}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">
              Channel Name
            </label>
            <input type="text" id="channelName" value={channelName} onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="new-channel" required/>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50" disabled={isLoading || !channelName.trim()}>
              {isLoading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
