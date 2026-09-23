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

const en = parseDict("lib/translations/en.ts");
const rw = parseDict("lib/translations/rw.ts");
const fr = parseDict("lib/translations/fr.ts");

// Load the updates defined earlier
const { updatesRW, updatesEN, updatesFR } = require("./generate-all-translations.js");

// Detailed translation mapping dictionary for all remaining English items in RW
const comprehensiveRwMap = {
  // Appearance & Theme
  "saveChanges": "Bika Impinduka",
  "resetToDefault": "Gusubiza ku Bisanzwe",
  "themeSettingsSaved": "Igenamiterere ry'insanganyamatsiko ryabitswe kandi ryashyizwe mu bikorwa",
  "themeResetToDefault": "Insanganyamatsiko yasubijwe ku bisanzwe",
  "themeColors": "Amabara y'Insanganyamatsiko",
  "customizeColorsForModes": "Gena amabara akoreshwa mu rumuri no mu mwijima",
  "primaryColor": "Ibara ry'Ingenzi",
  "hoverBorderColor": "Ibara ry'Umurongo wo Kwerekana",
  "glowIntensity": "Ubukana bw'Urumuri",
  "adjustGlowEffect": "Gena uko urumuri rutamurura mu nsanganyamatsiko",
  "pleaseSelectImage": "Nyamuneka hitamo dosiye y'ifoto",
  "fileSizeLessThan5MB": "Ingano y'ifoto igomba kuba munsi ya 5MB",
  "imageUploadedSuccess": "Ifoto yashyizweho neza!",
  "failedToUploadImage": "Gushyiraho ifoto ntibyakunze",
  "uploaded": "Byashyizweho",
  "uploading": "Birimo gushyirwaho...",
  "clickOrDragImage": "Kanda cyangwa ukurure ifoto hano",
  "pngJpgGifUpTo5MB": "PNG, JPG, GIF bitarengeje 5MB",

  // System Config
  "failedToLoadSystemConfig": "Gufungura igenamiterere rya sisitemu ntibyakunze",
  "systemConfiguration": "Igenamiterere rya Sisitemu",
  "loadingConfiguration": "Igenamiterere ririmo gufungurwa...",
  "universalExamLimit": "Imipaka Rusange y'Ibizamini",
  "setDailyExamLimit": "Gena umubare ntarengwa w'ibizamini abanyeshuri bakora ku munsi kuri sisitemu yose",
  "dailyExamLimitPerUser": "Umubare ntarengwa w'ibizamini ku munsi (kuri buri mukoresha)",
  "examsPerDayPerUser": "ibizamini ku munsi kuri buri mukoresha",
  "limitAppliedToAllUsers": "Uyu mupaka uzubahirizwa ku bakoresha bose keretse abahawe imipaka yihariye.",
  "saveExamLimit": "Bika Umupaka w'Ibizamini",
  "examSecuritySettings": "Igenamiterere ry'Umutekano w'Ibizamini",
  "enableDisableViolationMeasures": "Fungura cyangwa ufunge ingamba zo kurwanya amakosa mu kizamini",
  "violationMeasures": "Ingamba zo Kurwanya Kwiba mu Kizamini",
  "violationMeasuresDesc": "Guhagarika gukoporora/komeka, kwinjira muri ecran yose, no kureba abava mu kizamini",
  "currentStatus": "Imiterere y'Ubu",
  "securityFeaturesActive": "Umutekano w'ibizamini urakora. Abakora ibizamini baragenzurwa ku makosa yose.",
  "securityFeaturesDisabled": "Umutekano w'ibizamini urafunze. Abanyeshuri bashobora gukora ibizamini nta nkomyi.",
  "saveSecuritySettings": "Bika Igenamiterere ry'Umutekano",
  "invalidNumberRange": "Nyamuneka shyiramo umubare muzima hagati ya 1 na 100",
  "examLimitUpdated": "Umupaka w'ibizamini wavuguruwe neza",
  "perDay": "ku munsi",
  "unlimitedExamAccess": "Umukoresha ashobora gukora ibizamini bitagira umupaka",
  "failedToUpdateExamLimit": "Kuvugurura umupaka w'ibizamini ntibyakunze",
  "setExamLimit": "Gena Umupaka w'Ibizamini",
  "setMaxExamsPerDay": "Gena umubare ntarengwa w'ibizamini uyu mukoresha ashobora gukora ku munsi.",
  "limitedAccess": "Uburyo bufite Umupaka",
  "unlimitedAccess": "Uburyo Butagira Umupaka",
  "userHasDailyLimits": "Uyu mukoresha afite umupaka w'ibizamini ku munsi",
  "userCanTakeUnlimited": "Uyu mukoresha ashobora gukora ibizamini bitagira umupaka",
  "dailyExamLimit": "Umupaka w'Ibizamini ku Munsi",
  "enterNumberBetween": "Shyiramo umubare hagati ya 1 na 100. Ibisanzwe ni ibizamini 5 ku munsi.",
  "note": "Icyitonderwa:",
  "dailyLimitResetsAtMidnight": "Umupaka wo ku munsi wongera gutangira saa sita z'ijoro (UTC). Abakoresha babona ibizamini basigaje.",

  // Exam Details & Review
  "examDetails.yourSelection": "Igisubizo Wahisemo",
  "examDetails.notAnswered": "Nticyasubijwe",
  "examDetails.backToDashboard": "Subira Ahabanza",
  "examDetails.reviewMode": "Gusubiramo Ikizamini",
  "examDetails.questionsCount": "Ibibazo {count}",
  "examDetails.duration": "Igihe Cyakoreshejwe",
  "examDetails.category": "Icyiciro",
  "examDetails.status": "Imiterere",
  "examDetails.completed": "Cyasojwe",
  "examDetails.abandoned": "Cyasizwe Hagati",

  // User Settings & Profile
  "userSettings.failedToSavePreferences": "Kubika ibyo uhitamo ntibyakunze",
  "userSettings.english": "Icyongereza (English)",
  "userSettings.kinyarwanda": "Ikinyarwanda",
  "userSettings.french": "Igifaransa (Français)",
  "userSettings.arabic": "Icyarabu (العربية)",
  "userSettings.profilePictureUpdated": "Ifoto y'umwirondoro yavuguruwe neza!",
  "userSettings.failedToUpdateProfilePicture": "Kuvugurura ifoto y'umwirondoro ntibyakunze",
  "userSettings.profilePictureRemoved": "Ifoto y'umwirondoro yakuweho neza",
  "userSettings.failedToRemoveProfilePicture": "Gukuraho ifoto y'umwirondoro ntibyakunze",
  "userSettings.passwordUpdated": "Ijambo ry'ibanga ryahinduwe neza!",
  "userSettings.failedToUpdatePassword": "Guhindura ijambo ry'ibanga ntibyakunze",
  "userSettings.member": "Umunyamuryango",
  "userSettings.viewProfile": "Reba Umwirondoro",
  "userSettings.changePhoto": "Hindura Ifoto",
  "userSettings.restoreGoogle": "Garura iya Google",
  "userSettings.searchPlaceholder": "Shakisha mu igenamiterere...",
  "userSettings.account": "Konti",
  "userSettings.profileSettings": "Igenamiterere ry'Umwirondoro",
  "userSettings.manageProfileInformation": "Genzura amakuru y'umwirondoro wawe",
  "userSettings.notSet": "Ntibirashyirwaho",
  "userSettings.personalInfo": "Amakuru Yitekerereje",
  "userSettings.incomplete": "Ntibiruzura",
  "userSettings.username": "Izina ry'umukoresha",
  "userSettings.editProfile": "Hindura Umwirondoro",
  "userSettings.privacyData": "Ibanga n'Amakuru Bwite",
  "userSettings.privacyDataDescription": "Gusohora amakuru, gusiba, no kubika amakuru",
  "userSettings.downloadData": "Gukuramo Amakuru Bwite",
  "userSettings.userNotFound": "Umukoresha ntabonetse",
  "userSettings.dataExported": "Amakuru yasohotse neza",
  "userSettings.failedToExportData": "Gusohora amakuru ntibyakunze",
  "userSettings.deleteAccount": "Gusiba Konti Burundu",
  "userSettings.deleteAccountWarning": "Iki gikorwa ntigishobora gusubizwa inyuma. Amakuru yawe yose azasibwa burundu.",
  "userSettings.confirmDeleteAccount": "Koko urashaka gusiba konti yawe burundu?",
  "userSettings.accountDeleted": "Konti yasibwe neza",
  "userSettings.failedToDeleteAccount": "Gusiba konti ntibyakunze",
  "userSettings.enterPasswordToConfirm": "Shyiramo ijambo ry'ibanga kugira ngo wemeze",
  "userSettings.sessions": "Aho Winjiriye (Sessions)",
  "userSettings.activeSessions": "Aho winjiriye hakiri gukora",
  "userSettings.logoutAllDevices": "Sohoka ku bikoresho byose",
  "userSettings.loggedOutAllDevices": "Wasohotse ku bikoresho byose neza",
  "userSettings.failedToLogoutAll": "Gusohoka ku bikoresho byose ntibyakunze",
  "userSettings.twoFactorAuth": "Umutekano w'Intambwe ebyiri (2FA)",
  "userSettings.twoFactorDesc": "Kongera umutekano kuri konti yawe hifashishijwe 2FA",
  "userSettings.enable2FA": "Fungura 2FA",
  "userSettings.disable2FA": "Funga 2FA",
  "userSettings.notificationPreferences": "Ibyo uhitamo ku Nteguza",
  "userSettings.emailNotifications": "Integuza kuri Imeyili",
  "userSettings.smsNotifications": "Integuza kuri SMS",
  "userSettings.pushNotifications": "Integuza kuri Telefoni (Push)",

  // Admin Management & Permissions
  "adminManagement": "Ubuyobozi bw'Urubuga (Admins)",
  "adminManagementDesc": "Kwandika no gucunga abayobozi bafite uburenganzira bwihariye",
  "registerAdminDesc": "Umuyobozi mushya azahabwa ubutumire bwo gushyiraho ijambo ry'ibanga kuri imeyili",
  "sendInvite": "Ohereza Ubutumire",
  "adminInvitedSuccess": "Umuyobozi yatumirwe neza!",
  "failedToInviteAdmin": "Gutumira umuyobozi ntibyakunze",
  "failedToLoadAdmins": "Gufungura urutonde rw'abayobozi ntibyakunze",
  "noAdminsRegistered": "Nta bayobozi banditswe kugeza ubu",
  "editPermissions": "Hindura Uburenganzira",
  "failedToLoadPermissions": "Gufungura uburenganzira ntibyakunze",
  "adminPermissionsUpdated": "Uburenganzira bw'umuyobozi bwaguruye neza",
  "failedToUpdatePermissions": "Kuvugurura uburenganzira ntibyakunze",
  "removeAdmin": "Kura mu Bayobozi",
  "removeAdminConfirm": "Koko urashaka gukura uyu muntu mu buyobozi? Iki gikorwa ntigisubizwa inyuma.",
  "adminRemoved": "Umuyobozi yakuweho neza",
  "failedToRemoveAdmin": "Gukuraho umuyobozi ntibyakunze",
  "noPermissionsSet": "Nta burenganzira bwashyizweho",
  "noAccess": "Nta burenganzira (No access)",
  "fullAccess": "Uburenganzira Busesuye (Full access)",
  "sections": "ibyiciro",
  "permStudents": "Abanyeshuri",
  "permCourseManagement": "Gucunga Amasomo",
  "permCourseStudio": "Icyumba cy'Amasomo (Studio)",
  "permRetake": "Ubusabe bwo Gusubiramo Ikizamini",
  "permExams": "Ibizamini",
  "permSettings": "Igenamiterere",
  "permNotifications": "Integuza",
  "feature": "Igice cy'Urubuga",
  "permNone": "Nta na kimwe",
  "permReadOnly": "Gusoma Gusa (Read Only)",
  "permReadWrite": "Gusoma no Guhindura (Read + Write)",
  "permDrivers": "Abarimu n'Abashoferi",
  "manageDrivers": "Gucunga Abarimu n'Abashoferi",
  "manageReports": "Gucunga Raporo n'Ibirego",
  "filedBy": "Yatanzwe na",
  "noUsersWithId": "Nta mukoresha ufite iyo ndangamuntu wabonetse",
  "adminManualIdPlaceholder": "Shyiramo numero y'indangamuntu y'imibare 16...",
  "adminLookupId": "Shakisha Indangamuntu",
  "safe": "Umutekano Wifashe Neza",
  "critical": "Ikibazo Gikomeye",

  // Course Studio & Question Editor
  "allQuestions": "Ibibazo Byose",
  "addQuestion": "Ongeraho Ikibazo",
  "editQuestion": "Hindura Ikibazo",
  "deleteQuestion": "Siba Ikibazo",
  "questionTitle": "Umutwe w'Ikibazo",
  "enterQuestion": "Andika ikibazo hano...",
  "questionType": "Ubwoko bw'Ikibazo",
  "singleChoice": "Guhitamo Igisubizo Kimwe",
  "multipleChoice": "Guhitamo Ibisubizo Byinshi",
  "matching": "Guhuza Ibihuye (Matching)",
  "trueFalse": "Ukuri cyangwa Ikinyoma",
  "optionText": "Inyandiko y'amahitamo",
  "addOption": "Ongeraho amahitamo",
  "removeOption": "Kuraho amahitamo",
  "isCorrect": "Ni cyo gisubizo cy'ukuri",
  "points": "Amanota",
  "examDuration": "Igihe cy'Ikizamini (Iminota)",
  "passingPercentage": "Amanota yo Gutsinda (%)",
  "maxAttempts": "Inshuro ntarengwa zo kugerageza",
  "randomizeAnswers": "Guhindura gahunda y'amahitamo",
  "randomizeQuestionOrder": "Guhindura gahunda y'ibibazo",
  "showResultsImmediately": "Kwereka amanota ako kanya ikizamini kirangiye",
  "showExplanations": "Kwereka ibisobanuro by'ibisubizo",
  "allowReview": "Kwemera ko asubiramo ibisubizo bye",
  "deleteExam": "Siba Ikizamini",
  "examStudio": "Icyumba cyo Gutegura Ibizamini (Studio)",
  "searchQuestions": "Shakisha ibibazo...",
  "allTypes": "Ubwoko Bwose",
  "noQuestionsMatch": "Nta kibazo gihuye n'ibyo ushakishije",
  "invalid": "Ntibemewe",
  "questionAudio": "Ijwi ry'ikibazo",
  "explainAnswer": "Ibisobanuro by'Igisubizo",
  "tags": "Ibiranga ikibazo (Tags)",
  "answerChoices": "Amahitamo y'Ibisubizo",
  "partialScoring": "Amanota y'igice (Partial Scoring)",
  "matchingPairs": "Ibihembe bihuye",
  "leftItem": "Ikintu cy'ibumoso",
  "rightItem": "Ikintu cy'iburyo",
  "addPair": "Ongeraho ibihuye",
  "lessonContentPlaceholder": "Andika ibikubiye mu isomo hano...",
  "lessonTitle": "Umutwe w'Isomo",
  "moduleTitle": "Umutwe w'Icyiciro (Modire)",
  "courseDescription": "Ibisobanuro by'Amasomo",
  "confirmDeleteExam": "Koko urashaka gusiba iki kizamini?",
  "confirmDeleteExamDesc": "Iki kizamini kizavanwa kuri iyi modire hamwe n'ibibazo byacyo byose.",
  "confirmDeleteModule": "Koko urashaka gusiba iyi modire?",
  "confirmDeleteModuleDesc": "Iyi modire izasibwa hamwe n'amasomo n'ingingo biyikubiyemo byose.",
  "confirmDeleteLesson": "Koko urashaka gusiba iri somo?",
  "confirmDeleteLessonDesc": "Iri somo rizasibwa hamwe n'ingingo zose zirigize.",
  "moduleNamePlaceholder": "Urugero: Ibimenyetso byo ku Muhanda...",
  "newLesson": "Isomo Rishya",
  "newExam": "Ikizamini Gishya",
  "moduleAlreadyHasExam": "Iyi modire isanzwe ifite ikizamini.",
  "addModule": "Ongeraho Modire Nshya",
  "addLesson": "Ongeraho Isomo Rishya",
  "addExam": "Ongeraho Ikizamini Gishya",
  "moduleSettings": "Igenamiterere rya Modire",
  "lessonSettings": "Igenamiterere ry'Isomo",
  "examSettings": "Igenamiterere ry'Ikizamini",
  "saved": "Byabitswe neza",
  "changesSaved": "Impinduka zabitswe neza",
  "failedToLoadCourses": "Gufungura amasomo ntibyakunze",
  "unknownError": "Habaye ikosa ritazwi",
  "noCourseSelected": "Nta somo ryatoranyijwe",
  "noCourseSelectedHint": "Hitamo isomo mu rutonde ruri ibumoso kugira ngo urebe cyangwa uhindure ibirigize.",
  "published": "Byatangajwe (Published)",
  "draft": "Umushinga (Draft)",
  "publishCategory": "Tangaza Icyiciro",
  "unpublishCategory": "Hagarika Icyiciro By'agateganyo",
  "categoryNameRequired": "Izina ry'icyiciro rirasabwa",
  "categoryCreatedSuccess": "Icyiciro cyakozwe neza!",
  "failedToCreateCategory": "Gukora icyiciro ntibyakunze",
  "categoryUpdatedSuccess": "Icyiciro cyavuguruwe neza!",
  "failedToUpdateCategory": "Kuvugurura icyiciro ntibyakunze",
  "confirmDeleteCategory": "Koko urashaka gusiba iki cyiciro?",
  "categoryDeletedSuccess": "Icyiciro cyasibwe neza!",
  "failedToDeleteCategory": "Gusiba icyiciro ntibyakunze"
};

console.log("Applying updates to RW, EN, FR dictionaries...");

// 1. Build unified keys
const allKeys = new Set([
  ...Object.keys(en),
  ...Object.keys(rw),
  ...Object.keys(fr),
  ...Object.keys(updatesRW),
  ...Object.keys(updatesEN),
  ...Object.keys(updatesFR),
  ...Object.keys(comprehensiveRwMap)
]);

// 2. Helper for natural translation fallback
function translateAutoKinyarwanda(key, englishText) {
  if (!englishText) return key;
  
  if (comprehensiveRwMap[key]) return comprehensiveRwMap[key];
  if (updatesRW[key]) return updatesRW[key];
  if (rw[key] && rw[key] !== englishText) return rw[key];

  let t = englishText;
  
  // Clean substitutions
  const patterns = [
    [/^Failed to (.+)$/i, "Ntibyakunze $1"],
    [/^Successfully (.+)$/i, "Byagenze neza $1"],
    [/^Add (.+)$/i, "Kongeramo $1"],
    [/^Delete (.+)$/i, "Gusiba $1"],
    [/^Edit (.+)$/i, "Guhindura $1"],
    [/^View (.+)$/i, "Kureba $1"],
    [/^Search (.+)$/i, "Shakisha $1"],
    [/^Select (.+)$/i, "Hitamo $1"],
    [/^Manage (.+)$/i, "Gucunga $1"],
    [/^Save (.+)$/i, "Bika $1"],
    [/^Create (.+)$/i, "Gukora $1"],
    [/^New (.+)$/i, "Gishya $1"],
    [/^All (.+)$/i, "Byose $1"],
    [/^No (.+) found$/i, "Nta $1 byabonetse"],
    [/^Are you sure you want to (.+)\?$/i, "Koko urashaka $1?"],
  ];

  for (const [p, r] of patterns) {
    if (p.test(t)) {
      return t.replace(p, r);
    }
  }

  return englishText;
}

// 3. Construct clean files
const finalRW = {};
const finalEN = {};
const finalFR = {};

for (const key of allKeys) {
  // EN
  finalEN[key] = updatesEN[key] || en[key] || rw[key] || key;
  
  // RW
  if (comprehensiveRwMap[key]) {
    finalRW[key] = comprehensiveRwMap[key];
  } else if (updatesRW[key]) {
    finalRW[key] = updatesRW[key];
  } else if (rw[key] && rw[key] !== en[key]) {
    finalRW[key] = rw[key];
  } else {
    finalRW[key] = translateAutoKinyarwanda(key, finalEN[key]);
  }

  // FR
  finalFR[key] = updatesFR[key] || fr[key] || finalEN[key];
}

console.log("Writing enhanced translation files...");

function serializeDict(dict, name) {
  const sortedKeys = Object.keys(dict).sort();
  let code = `const ${name}: Record<string, string> = {\n`;
  for (const k of sortedKeys) {
    const escapedVal = dict[k].replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    code += `  "${k}": "${escapedVal}",\n`;
  }
  code += `};\n\nexport default ${name};\n`;
  return code;
}

fs.writeFileSync("lib/translations/rw.ts", serializeDict(finalRW, "rw"));
fs.writeFileSync("lib/translations/en.ts", serializeDict(finalEN, "en"));
fs.writeFileSync("lib/translations/fr.ts", serializeDict(finalFR, "fr"));

console.log("Finished writing! Statistics:", {
  rw: Object.keys(finalRW).length,
  en: Object.keys(finalEN).length,
  fr: Object.keys(finalFR).length,
});
