import { db } from "@/lib/firebaseClient";
import type { SVProperty } from "@/lib/types";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const col = () => collection(db, "properties");

export function watchProperties(onChange: (items: SVProperty[]) => void) {
  const q = query(col(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items: SVProperty[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onChange(items);
  });
}

export async function createProperty(input: {
  name: string;
  address: string;
  imageUrls: string[];
  uid: string;
}) {
  const docRef = await addDoc(col(), {
    name: input.name,
    address: input.address,
    images: input.imageUrls ?? [],
    createdAt: serverTimestamp(),
    createdBy: input.uid,
    isActive: true,
  });
  return docRef.id;
}

export async function updateProperty(
  id: string,
  patch: Partial<Omit<SVProperty, "id">>,
) {
  const ref = doc(db, "properties", id);
  await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
  const fresh = await getDoc(ref);
  return { id, ...(fresh.data() as any) } as SVProperty;
}
