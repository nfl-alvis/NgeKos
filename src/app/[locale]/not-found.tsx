import messagesId from "../../../messages/id.json";
import NotFoundContent from "@/components/NotFoundContent";

export default function NotFound() {
  // not-found tidak menerima params — pakai locale default (id)
  return <NotFoundContent messages={messagesId} />;
}
