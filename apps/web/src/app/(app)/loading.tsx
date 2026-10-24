import { LoadingState } from "@/components/states/loading-state";

/**
 * Suspense boundary inside the signed-in layout. The root `app/loading.tsx`
 * wraps this layout, so without this file a slow page would replace the
 * header and sidebar instead of swapping the content.
 */
export default function Loading() {
  return <LoadingState />;
}
