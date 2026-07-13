import { redirect } from "next/navigation";

/**
 * /calibrate — the user-facing calibration entry. The actual flow lives in the
 * editor's Custom Mockup modal (upload a device photo, mark the 4 screen
 * corners, save as a reusable device); this route deep-links straight into it.
 * The internal template-authoring tool (raw JSON output) moved to /calibrate/dev.
 */
export default function CalibratePage() {
  redirect("/editor?calibrate=1");
}
