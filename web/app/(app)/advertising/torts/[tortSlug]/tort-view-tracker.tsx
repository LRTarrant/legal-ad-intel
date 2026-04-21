"use client";

import { useEffect } from "react";
import { trackTortViewed } from "@/lib/analytics";

export function TortViewTracker({ slug, name }: { slug: string; name?: string }) {
  useEffect(() => {
    trackTortViewed({ tort_slug: slug, tort_name: name });
  }, [slug, name]);

  return null;
}
