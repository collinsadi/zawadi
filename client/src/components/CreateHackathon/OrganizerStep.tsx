import ImageUpload from "./ImageUpload";

type Organiser = {
  name: string;
  logo: string;
  url: string;
};

type Props = {
  organiser: Organiser;
  onChange: (next: Organiser) => void;
};

export default function OrganizerStep({ organiser, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Organiser Name</label>
        <input
          type="text"
          value={organiser.name}
          onChange={(e) => onChange({ ...organiser, name: e.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g., Zawadi Foundation"
        />
      </div>

      <ImageUpload
        label="Organiser Logo"
        value={organiser.logo}
        onChange={(url) => onChange({ ...organiser, logo: url })}
        buttonText="Upload Logo"
        previewClassName="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Organiser URL</label>
        <input
          type="url"
          value={organiser.url}
          onChange={(e) => onChange({ ...organiser, url: e.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
