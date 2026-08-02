import { Suspense } from "react";
import { MessagesInbox } from "@/components/messages/messages-inbox";

// useSearchParams (read in MessagesInbox) needs a Suspense boundary in Next 16.
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInbox />
    </Suspense>
  );
}
