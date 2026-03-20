import { redirect } from "next/navigation";

/**
 * /enroll duplicated the homepage hub and confused users.
 * All entry points live on `/` (New enrollment, Verify, Diaspora, portals).
 */
export default function EnrollIndexPage() {
  redirect("/");
}
