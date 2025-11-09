import { db } from "@/lib/firebaseClient";
import type { SVTask } from "@/lib/types";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

const col = () => collection(db, "tasks");

export function watchTasksByProperty(
  propertyId: string,
  onChange: (items: SVTask[]) => void,
) {
  const q = query(col(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((t) => t.propertyId === propertyId) as SVTask[];
    onChange(items);
  });
}

export async function createTask(input: {
  propertyId: string;
  templateId: string;
  name: string;
  assigned_to: "teleoperator" | "human";
  durationMin?: number;
  uid: string;
}) {
  const docRef = await addDoc(col(), {
    propertyId: input.propertyId,
    templateId: input.templateId,
    name: input.name,
    assigned_to: input.assigned_to,
    status: "scheduled",
    durationMin: input.durationMin ?? null,
    createdAt: serverTimestamp(),
    createdBy: input.uid,
  });
  return docRef.id;
}
