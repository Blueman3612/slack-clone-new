"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
function TestPage() {
    var _a, _b;
    const [result, setResult] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [articles, setArticles] = (0, react_1.useState)([]);
    const { data: session, status } = (0, react_2.useSession)();
    const fetchNews = async () => {
        console.log('Button clicked, starting fetch...');
        setLoading(true);
        try {
            console.log('Making fetch request...');
            const response = await fetch('/api/news/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Response received:', response.status, response.statusText);
            // Handle both JSON and text responses
            const contentType = response.headers.get('content-type');
            console.log('Content type:', contentType);
            let data;
            if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')) {
                data = await response.json();
                console.log('JSON response:', data);
            }
            else {
                data = await response.text();
                console.log('Text response:', data);
            }
            setResult(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
            // Fetch the articles after successful update
            fetchStoredArticles();
        }
        catch (error) {
            console.error('Error in fetchNews:', error);
            setResult(String(error));
        }
        finally {
            setLoading(false);
        }
    };
    const fetchStoredArticles = async () => {
        try {
            const response = await fetch('/api/news/articles');
            if (!response.ok)
                throw new Error('Failed to fetch articles');
            const data = await response.json();
            setArticles(data);
        }
        catch (error) {
            console.error('Error fetching stored articles:', error);
        }
    };
    // Fetch articles on component mount
    (0, react_1.useEffect)(() => {
        fetchStoredArticles();
    }, []);
    console.log('Current session:', session);
    console.log('Auth status:', status);
    return (<div className="p-8 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">News API Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="font-bold mb-2">Auth Status:</h2>
        <div>Status: {status}</div>
        <div>User: {((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name) || 'Not logged in'}</div>
        <div>Role: {((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role) || 'N/A'}</div>
      </div>

      <button onClick={fetchNews} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
        {loading ? 'Fetching...' : 'Fetch NBA News'}
      </button>
      
      {result && (<pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
          {result}
        </pre>)}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Stored Articles ({articles.length})</h2>
        <div className="space-y-4">
          {articles.map((article) => (<div key={article.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <h3 className="font-bold mb-2">{article.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{article.description}</p>
              <div className="text-sm">
                <span className="text-gray-500">Source: {article.source}</span>
                <span className="mx-2">•</span>
                <span className="text-gray-500">
                  Published: {new Date(article.publishedAt).toLocaleString()}
                </span>
              </div>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block">
                Read more →
              </a>
            </div>))}
        </div>
      </div>
    </div>);
}
