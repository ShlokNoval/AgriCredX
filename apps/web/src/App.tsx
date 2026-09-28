import React from 'react';
import { ReceivableStatus } from '@agricredx/shared-types';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AgriCredX</h1>
        <p className="text-slate-600 mb-8">
          Institutional Trust Operating System for Agricultural Trade Finance
        </p>

        <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Canonical Lifecycle Enforcement</h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(ReceivableStatus).map((status) => (
              <span
                key={status}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700"
              >
                {status}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Lifecycle is shared directly from the <code>@agricredx/shared-types</code> package.
          </p>
        </div>
      </div>
    </div>
  );
}
