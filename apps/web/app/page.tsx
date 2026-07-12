import { redirect } from "next/navigation";

export default function Home() {
  // Marketing home + pSEO pages land here later (§10); the editor is the product.
  redirect("/editor");
}
