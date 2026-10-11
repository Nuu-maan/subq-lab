"use client";

import clsx from "clsx";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ACCEPTED_TYPES, prepareImage, type PickedImage } from "@/lib/image";

const MAX_IMAGES = 4;

export function ImagePicker({
  images,
  onChange,
}: {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const room = MAX_IMAGES - images.length;

  async function add(files: File[]) {
    const accepted = files.filter((file) => ACCEPTED_TYPES.includes(file.type));
    if (accepted.length < files.length) toast("Skipped files that aren't PNG, JPEG or WebP.");
    if (accepted.length > room) toast(`SubQ takes up to ${MAX_IMAGES} images per request. Added the first ${room}.`);
    try {
      const prepared = await Promise.all(accepted.slice(0, room).map(prepareImage));
      onChange([...images, ...prepared]);
    } catch {
      toast.error("Unable to read that image. Try a different file.");
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    add([...event.dataTransfer.files]);
  }

  function remove(image: PickedImage) {
    URL.revokeObjectURL(image.url);
    onChange(images.filter((item) => item.id !== image.id));
  }

  return (
    <div className="flex flex-col gap-3">
      {room > 0 && (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx(
            "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-[background-color,border-color] duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-fg",
            dragging ? "border-fg bg-raised" : "border-bar/60 bg-surface hover:bg-raised",
          )}
        >
          <span className="text-ui">
            Drop images here or <span className="font-medium underline decoration-bar underline-offset-4">browse</span>
          </span>
          <span className="text-[13px] text-fg-secondary">
            PNG, JPEG or WebP · {room} of {MAX_IMAGES} slots left · resized to 1280px
          </span>
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(event) => {
              add([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {images.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((image) => (
            <li key={image.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.name}
                className="aspect-square w-full rounded-xl object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
              />
              <button
                type="button"
                onClick={() => remove(image)}
                aria-label={`Remove ${image.name}`}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-canvas/90 text-fg shadow-sm backdrop-blur transition-[scale] duration-150 ease-out motion-safe:active:scale-[0.96]"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
