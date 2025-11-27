import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
  avatarFilename?: string; // e.g. '121298_0.jpg' located in /images
  requestedSize?: number; // preferred size in px
};

let _avatarsManifest: Record<string, Record<string, string>> | null = null;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, avatarFilename, requestedSize = 64, ...props }, ref) => {
  const [src, setSrc] = React.useState<string | undefined>(props.src as string | undefined);
  const [srcSet, setSrcSet] = React.useState<string | undefined>(props.srcSet as string | undefined);

  React.useEffect(() => {
    let cancelled = false;

    // If src explicitly provided via props, prefer it
    if (props.src) {
      setSrc(props.src as string);
      setSrcSet(props.srcSet as string | undefined);
      return;
    }

    if (!avatarFilename) return;

    // Immediately set the basic image so we don't show fallback while manifest loads
    setSrc(`/images/${avatarFilename}`);

    async function loadManifestAndSet() {
      try {
        if (!_avatarsManifest) {
          const resp = await fetch('/images/avatars.json');
          if (!resp.ok) throw new Error('manifest not found');
          _avatarsManifest = await resp.json();
        }

        const variants = _avatarsManifest[avatarFilename];
        if (!variants) return; // no variants available

        // choose nearest size >= requestedSize, fallback to largest available
        const sizes = Object.keys(variants).map(s => parseInt(s, 10)).sort((a,b) => a-b);
        const chosen = sizes.find(s => s >= requestedSize) || sizes[sizes.length - 1];

        const srcMain = `/images/${variants[String(chosen)]}`;
        const srcset = sizes.map(s => `/images/${variants[String(s)]} ${s}w`).join(', ');

        if (!cancelled) {
          setSrc(srcMain);
          setSrcSet(srcset);
        }
      } catch (e) {
        // ignore manifest errors and keep base image
      }
    }

    loadManifestAndSet();

    return () => { cancelled = true; };
  }, [avatarFilename, requestedSize, props.src, props.srcSet]);

  return (
    // Pass src and srcSet into the underlying image
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      src={src}
      srcSet={srcSet}
      sizes={props.sizes}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
