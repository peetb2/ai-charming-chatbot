import { redirect } from "next/navigation";

export default function ApiKeysNewRedirect() {
  redirect("/dashboard/keys/new");
}
