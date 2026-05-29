import { revalidatePath } from "next/cache";

/** Bust static page cache after admin updates notices or other public DB content. */
export function revalidatePublicNoticePages() {
  revalidatePath("/");
  revalidatePath("/notices");
}
