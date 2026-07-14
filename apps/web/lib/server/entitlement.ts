import type { NextRequest } from "next/server";
import { getRequestOwner } from "./requestOwner";
import { isBillingActive, readBilling } from "./razorpay";

/** Server-side Pro check for routes whose features cost real money
 *  (realistic renders, full-page captures). Fails closed. */
export async function requestIsPro(req: NextRequest): Promise<boolean> {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return false;
    return isBillingActive(await readBilling(owner.uid));
  } catch {
    return false;
  }
}
