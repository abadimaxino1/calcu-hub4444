import React, { useState } from 'react';

export default function TestsPanel(){
  const [out, setOut] = useState('');
  const [running, setRunning] = useState(false);
  
  async function run(){
    setRunning(true);
    setOut('Running tests...');
    try{
      // fetch CSRF from cookie if present
      const token = document.cookie.split('; ').find(s=>s.startsWith('calcu_csrf='))?.split('=')[1];
      const res = await fetch('/api/admin/system/run-tests', { 
        method: 'POST', 
        credentials: 'include', 
        headers: { 'x-csrf-token': token || '' } 
      });
      
      if (res.status === 404) {
        setOut('Tests endpoint not available in production.\n\nTo run tests locally, use: npm test');
        return;
      }
      
      const j = await res.json();
      if (j && j.ok) {
        setOut(j.stdout || j.message || 'Tests completed successfully');
      } else {
        setOut('Failed: ' + (j?.error || j?.message || 'Unknown error'));
      }
    } catch(e: any) { 
      setOut('Tests endpoint not available.\n\nTo run tests locally, use: npm test'); 
    } finally {
      setRunning(false);
    }
  }

  async function triggerError() {
    setRunning(true);
    setOut('Triggering test error...');
    try {
      const res = await fetch('/api/admin/ops/errors/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: "Test error from Admin UI",
          level: "warning"
        })
      });
      const j = await res.json();
      setOut(JSON.stringify(j, null, 2));
    } catch (e: any) {
      setOut('Error: ' + e.message);
    } finally {
      setRunning(false);
    }
  }
  
  return (
    <div className="max-w-4xl">
      <h3 className="text-lg font-semibold mb-4">Run Tests (Admin/IT only)</h3>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Running tests in production is disabled for security reasons. 
          Tests should be run locally during development using <code className="bg-amber-100 px-1 rounded">npm test</code>.
        </p>
      </div>
      
      <div className="flex gap-3 mb-4">
        <button 
          onClick={run} 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={running}
        >
          {running ? 'Running...' : 'Check Test Status'}
        </button>

        <button 
          onClick={triggerError} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={running}
        >
          Trigger Sentry Test Error
        </button>

        <button 
          onClick={async () => {
            setRunning(true);
            setOut('Triggering Diagnostics Job...');
            try {
              const res = await fetch('/api/admin/ops/jobs/DIAGNOSTICS/run', {
                method: 'POST',
                credentials: 'include'
              });
              const j = await res.json();
              setOut(JSON.stringify(j, null, 2));
            } catch (e: any) {
              setOut('Error: ' + e.message);
            } finally {
              setRunning(false);
            }
          }} 
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={running}
        >
          Trigger Diagnostics Job
        </button>
      </div>
      
      <pre className="p-4 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm overflow-auto max-h-64 whitespace-pre-wrap">
        {out || 'Click "Check Test Status" to verify test endpoint availability.'}
      </pre>
      
      <div className="mt-4 text-sm text-slate-600">
        <p className="font-medium mb-2">Local Testing Commands:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-slate-100 px-1 rounded">npm test</code> - Run all unit tests</li>
          <li><code className="bg-slate-100 px-1 rounded">npm run test:watch</code> - Run tests in watch mode</li>
          <li><code className="bg-slate-100 px-1 rounded">npm run test:coverage</code> - Run with coverage report</li>
        </ul>
      </div>
    </div>
  );
}
