import ImageUpload from "./ImageUpload";
import MarkdownField from "./MarkdownField";
import type { Hackathon } from "../../types/Hackathon";

type Props = {
  form: Omit<Hackathon, "id">;
  onChange: (next: Omit<Hackathon, "id">) => void;
  titleMax?: number;
};

export default function HackathonStep({ form, onChange, titleMax = 80 }: Props) {
  const titleCharsLeft = titleMax - form.title.length;

  const set = <K extends keyof Omit<Hackathon, "id">>(key: K, val: Omit<Hackathon, "id">[K]) =>
    onChange({ ...form, [key]: val } as Omit<Hackathon, "id">);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
        <input
          type="text"
          value={form.title}
          maxLength={titleMax}
          onChange={(e) => set("title", e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g., ZK Innovators Hackathon 2025"
        />
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{titleCharsLeft} characters left</div>
      </div>

      <ImageUpload
        label="Cover Image"
        value={form.cover}
        onChange={(url) => set("cover", url)}
        buttonText="Upload Image"
      />

      <MarkdownField
        label="Description (Markdown)"
        value={form.description}
        onChange={(v) => set("description", v)}
        height={380}
      />
    </div>
  );
}
