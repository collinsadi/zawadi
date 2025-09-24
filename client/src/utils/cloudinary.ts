export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const unsignedPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

  if (!cloudName || !unsignedPreset) {
    throw new Error(
      'Missing Cloudinary config. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your client/.env.'
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', unsignedPreset);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}
