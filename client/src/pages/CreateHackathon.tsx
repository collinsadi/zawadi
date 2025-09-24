import Navbar from '../components/Navbar';

export default function CreateHackathonPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Create a Hackathon</h1>
        <p className="mt-2 text-slate-600">This is a placeholder page. You can add the form here later.</p>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
          Coming soon...
        </div>
      </main>
    </div>
  );
}
