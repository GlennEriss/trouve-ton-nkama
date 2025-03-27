import { db, doc, getDoc, setDoc } from "@/firebase/firestore";

type Suggestion = {
    province: string;
    city: string;
    street: string;
}

export const updateOrCreateSuggestion = async ({ province, city, street }: Suggestion) => {
    try {
        const ref = doc(db, "suggestions", "data");
        const docSnap = await getDoc(ref);
        let data: Record<string, Record<string, string[]>> = {};
        if (docSnap.exists()) {
            data = docSnap.data();
        }
        const existingProvince = data[province] || {};
        const existingCities = new Set(existingProvince[city] || []);
        existingCities.add(street);

        const updatedProvince = {
            ...existingProvince,
            [city]: Array.from(existingCities),
        };

        await setDoc(ref, {
            ...data,
            [province]: updatedProvince,
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour ou création de suggestion :", error);
    }
};
