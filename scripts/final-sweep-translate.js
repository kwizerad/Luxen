const fs = require("fs");

function parseDict(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const dict = {};
  const regex = /^\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    dict[match[1]] = match[2];
  }
  return dict;
}

const rw = parseDict("lib/translations/rw.ts");
const en = parseDict("lib/translations/en.ts");

const directRwTranslations = {
  "editProfileDescription": "Hindura amakuru y'umwirondoro wawe n'uko ugaragara",
  "enable2FADescription": "Ongerera konti yawe umutekano w'intambwe ebyiri (2FA)",
  "enterVerificationCode": "Shyiramo kode yo kwemeza yoherejwe kuri telefoni cyangwa imeyili",
  "examSubmittedSuccessfully": "Ikizamini cyoherejwe neza!",
  "failedToAuthenticate": "Kwinjira ntibyakunze. Nyamuneka ongera ugerageze.",
  "failedToChangePassword": "Guhindura ijambo ry'ibanga ntibyakunze",
  "failedToFetchData": "Gushaka amakuru ntibyakunze",
  "failedToLoadCertificates": "Gufungura impamyabumenyi ntibyakunze",
  "failedToLoadHistory": "Gufungura amateka ntibyakunze",
  "failedToLoadNotifications": "Gufungura integuza ntibyakunze",
  "failedToLoadProfile": "Gufungura umwirondoro ntibyakunze",
  "failedToLoadResults": "Gufungura ibisubizo ntibyakunze",
  "failedToLoadScores": "Gufungura amanota ntibyakunze",
  "failedToSendCode": "Kohereza kode ntibyakunze",
  "failedToUpdateSettings": "Kuvugurura igenamiterere ntibyakunze",
  "fullscreenExitWarning": "Gusohoka muri ecran yose birabujijwe mu kizamini",
  "insufficientBalance": "Amafaranga afite kuri konti ntahagije",
  "invalidPhoneNumber": "Numero ya telefoni ntiyemewe",
  "invalidVerificationCode": "Kode yo kwemeza ntiyemewe",
  "manageAccount": "Gucunga Konti",
  "manageSecurity": "Gucunga Umutekano",
  "noActiveSubscription": "Nta fatabuguzi ririmo gukora ubu",
  "noCertificatesFound": "Nta mpamyabumenyi ziraboneka",
  "noDataAvailable": "Nta makuru ahari kugeza ubu",
  "noNotificationsFound": "Nta nteguza zihari",
  "noPendingRequests": "Nta busabe butegerejwe buhari",
  "noRecentActivity": "Nta bikorwa biheruka bihari",
  "noTransactionsFound": "Nta mateka yo kwishyura ahari",
  "passwordChangedSuccessfully": "Ijambo ry'ibanga ryahinduwe neza!",
  "passwordRequirements": "Ijambo ry'ibanga rigomba kugira nibura inyuguti 8",
  "paymentProcessing": "Kwishyura birimo gutunganywa...",
  "profilePictureUploaded": "Ifoto y'umwirondoro yashyizweho neza!",
  "resendVerificationCode": "Ongera wohereze kode yo kwemeza",
  "retakeNotAvailable": "Gusubiramo ikizamini ntibiboneka",
  "sessionExpiredLoginAgain": "Igihe cyo gukora cyarangiye, nyamuneka ongera winjire",
  "subscriptionActivated": "Ifatabuguzi ryatangiye gukora neza!",
  "subscriptionCancelled": "Ifatabuguzi ryahagaritswe",
  "subscriptionDetails": "Amakuru y'Ifatabuguzi",
  "twoFactorAuthEnabled": "Umutekano w'intambwe ebyiri (2FA) wafunguwe neza!",
  "unauthorizedAccess": "Ntabwo wemerewe kwinjira hano",
  "updateSuccessful": "Ivugurura ryagenze neza!",
  "userNotFoundWithEmail": "Nta mukoresha ufite iyi meyili wabonetse",
  "verificationCodeSent": "Kode yo kwemeza yoherejwe neza!",
  "viewAuditLogs": "Reba Amateka y'Ibikorwa (Audit Logs)"
};

// Generic phrase translation helper for strings containing known components
function translateEnglishToRw(str) {
  if (!str || typeof str !== "string") return str;
  const trimmed = str.trim();
  
  if (directRwTranslations[trimmed]) return directRwTranslations[trimmed];

  // Specific sentence mappings
  const sentenceMap = {
    "Are you sure you want to delete this?": "Koko urashaka gusiba iki kintu?",
    "This action cannot be undone.": "Iki gikorwa ntigishobora gusubizwa inyuma.",
    "Changes saved successfully!": "Impinduka zabitswe neza!",
    "Failed to save changes": "Kubika impinduka ntibyakunze",
    "Please fill in all required fields": "Nyamuneka uzuza imyanya yose isabwa",
    "Something went wrong, please try again": "Habaye ikibazo, nyamuneka ongera ugerageze",
    "Your progress has been saved": "Aho wageze habitswe neza",
    "You have completed all questions": "Wasoje ibibazo byose",
    "Time is up! Submitting your exam...": "Igihe cyarangiye! Ikizamini kirimo koherezwa...",
    "Click anywhere to continue": "Kanda ahari ho hose kugira ngo ukomeze",
    "Press Enter to continue": "Kanda Enter kugira ngo ukomeze",
    "No items found": "Nta kintu cyabonetse",
    "No results found matching your search": "Nta bisubizo bihuye n'ibyo ushakishije",
    "Select an option to proceed": "Hitamo igisubizo kugira ngo ukomeze",
    "All rights reserved": "Uburenganzira bwose burabitswe",
    "Loading, please wait...": "Birimo gutegurwa, nyamuneka tegereza...",
    "Choose your preferred language": "Hitamo ururimi wifuza gukoresha",
    "Switch to dark mode": "Hindura ujye mu buryo bw'umwijima",
    "Switch to light mode": "Hindura ujye mu buryo bw'urumuri",
    "High contrast mode": "Uburyo bw'amabara agaragara cyane",
    "System default theme": "Insanganyamatsiko isanzwe ya sisitemu"
  };

  if (sentenceMap[trimmed]) return sentenceMap[trimmed];

  // Pattern-based transformations
  let res = trimmed;

  const replacements = [
    [/^Failed to (.+)$/i, (m, p1) => `Ntibyakunze ${translateEnglishToRw(p1)}`],
    [/^Successfully (.+)$/i, (m, p1) => `Byagenze neza ${translateEnglishToRw(p1)}`],
    [/^Add (.+)$/i, (m, p1) => `Kongeramo ${translateEnglishToRw(p1)}`],
    [/^Delete (.+)$/i, (m, p1) => `Gusiba ${translateEnglishToRw(p1)}`],
    [/^Edit (.+)$/i, (m, p1) => `Guhindura ${translateEnglishToRw(p1)}`],
    [/^View (.+)$/i, (m, p1) => `Kureba ${translateEnglishToRw(p1)}`],
    [/^Search (.+)$/i, (m, p1) => `Shakisha ${translateEnglishToRw(p1)}`],
    [/^Manage (.+)$/i, (m, p1) => `Gucunga ${translateEnglishToRw(p1)}`],
    [/^Save (.+)$/i, (m, p1) => `Kubika ${translateEnglishToRw(p1)}`],
    [/^Create (.+)$/i, (m, p1) => `Gukora ${translateEnglishToRw(p1)}`],
    [/^No (.+) found$/i, (m, p1) => `Nta ${translateEnglishToRw(p1)} byabonetse`],
    [/^No (.+) available$/i, (m, p1) => `Nta ${translateEnglishToRw(p1)} bihari`],
    [/^Select (.+)$/i, (m, p1) => `Hitamo ${translateEnglishToRw(p1)}`],
    [/^Enter (.+)$/i, (m, p1) => `Shyiramo ${translateEnglishToRw(p1)}`],
    [/^Please enter (.+)$/i, (m, p1) => `Nyamuneka andika ${translateEnglishToRw(p1)}`],
    [/^Confirm (.+)$/i, (m, p1) => `Kwemeza ${translateEnglishToRw(p1)}`],
    [/^Are you sure you want to (.+)\?$/i, (m, p1) => `Koko urashaka ${translateEnglishToRw(p1)}?`],
  ];

  for (const [re, repl] of replacements) {
    if (re.test(res)) {
      return res.replace(re, repl);
    }
  }

  return res;
}

// Load remaining untranslated list
let rawItems = [];
try {
  rawItems = JSON.parse(fs.readFileSync("/tmp/remaining_untranslated_4.json", "utf8"));
} catch (e) {}

let translatedInLoop = 0;
for (const item of rawItems) {
  const k = item.key;
  const enVal = item.text;
  
  const trans = translateEnglishToRw(enVal);
  if (trans && trans !== enVal) {
    rw[k] = trans;
    translatedInLoop++;
  } else if (directRwTranslations[k]) {
    rw[k] = directRwTranslations[k];
    translatedInLoop++;
  }
}

console.log("Translated items in final sweep:", translatedInLoop);

function serializeDict(dict, name) {
  const sortedKeys = Object.keys(dict).sort();
  let code = `const ${name}: Record<string, string> = {\n`;
  for (const k of sortedKeys) {
    const v = dict[k] || "";
    const escapedVal = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    code += `  "${k}": "${escapedVal}",\n`;
  }
  code += `};\n\nexport default ${name};\n`;
  return code;
}

fs.writeFileSync("lib/translations/rw.ts", serializeDict(rw, "rw"));
console.log("Wrote updated lib/translations/rw.ts");
