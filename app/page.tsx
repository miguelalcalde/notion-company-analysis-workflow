export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workflow: Notion Company Analysis</h1>
      <p className="mb-4 text-gray-600">API endpoint:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <a href="/api/workflows/notion-company-analysis" className="text-blue-600 hover:underline">
            /api/workflows/notion-company-analysis
          </a>
        </li>
      </ul>
    </main>
  );
}
