/**
 * Date and time localization helpers with dedicated official Kinyarwanda calendar terms.
 */

export const KINYARWANDA_DAYS: Record<number, string> = {
  0: "Ku Cyumweru",
  1: "Kuwa Mbere",
  2: "Kuwa Kabiri",
  3: "Kuwa Gatatu",
  4: "Kuwa Kane",
  5: "Kuwa Gatanu",
  6: "Kuwa Gatandatu",
};

export const KINYARWANDA_MONTHS: Record<number, string> = {
  0: "Mutarama",
  1: "Gashyantare",
  2: "Werurwe",
  3: "Mata",
  4: "Gicurasi",
  5: "Kamena",
  6: "Nyakanga",
  7: "Kanama",
  8: "Nzeri",
  9: "Ukwakira",
  10: "Ugushyingo",
  11: "Ukuboza",
};

export function formatLocalizedDate(
  date: Date,
  language: string,
  options?: {
    weekday?: "long" | "short";
    month?: "long" | "short";
    day?: "numeric";
  }
): string {
  const langKey = language?.toLowerCase() || "en";

  if (langKey.includes("kiny") || langKey === "rw") {
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const dayNumber = date.getDate();

    const dayName = KINYARWANDA_DAYS[dayOfWeek] || "";
    const monthName = KINYARWANDA_MONTHS[month] || "";

    if (options?.weekday === "short") {
      return `${dayName}, ${dayNumber}, ${monthName}`;
    }

    // Format: (Day,date, month) e.g. "Kuwa Mbere, 26, Ukwakira"
    return `${dayName}, ${dayNumber}, ${monthName}`;
  }

  if (langKey.includes("fr") || langKey === "french") {
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: options?.weekday || "long",
      month: options?.month || "long",
      day: options?.day || "numeric",
    });
    // Capitalize first letter of weekday in French
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // English fallback
  return date.toLocaleDateString("en-US", {
    weekday: options?.weekday || "long",
    month: options?.month || "long",
    day: options?.day || "numeric",
  });
}
