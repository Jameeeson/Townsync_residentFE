import { redirect } from "next/navigation";

export default function AddResidentPage() {
  redirect("/admin/dashboard?view=add-resident");
}
