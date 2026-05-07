import { type CreditPack } from "@/models/credit-transaction";
import { DEFAULT_CREDIT_PACKS } from "@/lib/credits/credit-packs";

export const CREDIT_PACKS: CreditPack[] = DEFAULT_CREDIT_PACKS.map((pack) => ({
  id: pack.id,
  name: pack.name,
  credits: pack.credits,
  price: pack.price,
  savings: pack.savings,
}));
