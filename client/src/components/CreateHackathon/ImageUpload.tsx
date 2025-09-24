import { useRef, useState } from "react";
import { uploadToCloudinary } from "../../utils/cloudinary";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  buttonText?: string;
  accept?: string;
  previewClassName?: string;
};

export default function ImageUpload({
  label,
  value,
  onChange,
  buttonText = "Upload Image",
  accept = "image/*",
  previewClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : buttonText}
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        {value && (
          <img
            src={value}
            alt="preview"
            className={previewClassName ?? "h-16 w-28 rounded-lg object-cover border border-slate-200 dark:border-slate-700"}
          />
        )}
      </div>
    </div>
  );
}
