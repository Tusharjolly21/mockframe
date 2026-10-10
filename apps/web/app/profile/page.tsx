import { redirect } from "next/navigation";

// /profile is the same page as /account
export default function ProfilePage() {
  redirect("/account");
}
