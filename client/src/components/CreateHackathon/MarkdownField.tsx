import { useEffect, useState } from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";

type Props = {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  height?: number;
};

export default function MarkdownField({ label = "Description (Markdown)", value, onChange, height = 380 }: Props) {
  const [mdTheme, setMdTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setMdTheme(root.classList.contains("dark") ? "dark" : "light");
    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "class") update();
      }
    });
    observer.observe(root, { attributes: true });
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {mode === "edit" ? "Preview" : "Back to editor"}
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-orange-400">
        <div data-color-mode={mdTheme}>
          <MDEditor
            value={value}
            onChange={(v) => onChange(v || "")}
            height={height}
            visibleDragbar={false}
            preview={mode}
            commands={[
              commands.title,
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.hr,
              commands.code,
              commands.link,
              commands.image,
              commands.unorderedListCommand,
              commands.orderedListCommand,
              commands.checkedListCommand,
            ]}
            extraCommands={[]}
            textareaProps={{ placeholder: "Write the hackathon details in Markdown..." }}
          />
        </div>
      </div>
    </div>
  );
}
