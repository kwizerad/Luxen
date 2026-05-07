(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/auth-utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCurrentUser",
    ()=>getCurrentUser,
    "getCurrentUserWithTimeout",
    ()=>getCurrentUserWithTimeout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
;
let authRequestInProgress = false;
let pendingAuthRequests = [];
async function getCurrentUser(retryCount = 0) {
    // If there's already a request in progress, queue this one
    if (authRequestInProgress) {
        return new Promise((resolve, reject)=>{
            pendingAuthRequests.push({
                resolve,
                reject
            });
        });
    }
    authRequestInProgress = true;
    try {
        console.log(`Getting current user (attempt ${retryCount + 1})`);
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: { user }, error } = await supabase.auth.getUser();
        // Handle auth lock error by retrying
        const isLockError = error && typeof error === 'object' && 'message' in error && (error.message?.includes("lock") || error.message?.includes("stoke") || error.message?.includes("released") || error.message?.includes("stoke"));
        if (isLockError && retryCount < 3) {
            console.log(`Auth lock detected (${error.message}), retrying...`, retryCount + 1);
            authRequestInProgress = false;
            // Wait before retrying
            await new Promise((resolve)=>setTimeout(resolve, 500 * (retryCount + 1)));
            return getCurrentUser(retryCount + 1);
        }
        if (error) {
            console.error("Auth error:", error);
            throw error;
        }
        console.log("User retrieved successfully:", user?.email);
        // Resolve all pending requests with the same result
        const pending = [
            ...pendingAuthRequests
        ];
        pendingAuthRequests = [];
        pending.forEach(({ resolve })=>resolve(user));
        return user;
    } catch (error) {
        console.error("Get current user error:", error);
        const isLockError = error && typeof error === 'object' && 'message' in error && (error.message?.includes("lock") || error.message?.includes("stoke") || error.message?.includes("released") || error.message?.includes("stoke"));
        if (isLockError && retryCount < 3) {
            console.log(`Auth lock in catch block, retrying...`, retryCount + 1);
            authRequestInProgress = false;
            // Wait before retrying
            await new Promise((resolve)=>setTimeout(resolve, 500 * (retryCount + 1)));
            return getCurrentUser(retryCount + 1);
        }
        // Reject all pending requests with the same error
        const pending = [
            ...pendingAuthRequests
        ];
        pendingAuthRequests = [];
        pending.forEach(({ reject })=>reject(error));
        throw error;
    } finally{
        authRequestInProgress = false;
    }
}
async function getCurrentUserWithTimeout(timeoutMs = 5000) {
    return Promise.race([
        getCurrentUser(),
        new Promise((_, reject)=>setTimeout(()=>reject(new Error('Auth request timeout')), timeoutMs))
    ]);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "badgeVariants",
    ()=>badgeVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
    variants: {
        variant: {
            default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
            secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
            destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
            outline: "text-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Badge({ className, variant, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/badge.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}
_c = Badge;
;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/exam-settings.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_EXAM_SETTINGS",
    ()=>DEFAULT_EXAM_SETTINGS,
    "isWithinAvailabilityWindow",
    ()=>isWithinAvailabilityWindow,
    "normalizeExamSettings",
    ()=>normalizeExamSettings,
    "questionHasAnyImage",
    ()=>questionHasAnyImage,
    "shuffle",
    ()=>shuffle
]);
const DEFAULT_EXAM_SETTINGS = {
    question_count: 20,
    duration_minutes: 20,
    sorting_mode: "RANDOM",
    available_from: null,
    available_to: null
};
function normalizeExamSettings(partial) {
    return {
        question_count: partial?.question_count ?? DEFAULT_EXAM_SETTINGS.question_count,
        duration_minutes: partial?.duration_minutes ?? DEFAULT_EXAM_SETTINGS.duration_minutes,
        sorting_mode: partial?.sorting_mode ?? DEFAULT_EXAM_SETTINGS.sorting_mode,
        available_from: partial?.available_from ?? DEFAULT_EXAM_SETTINGS.available_from,
        available_to: partial?.available_to ?? DEFAULT_EXAM_SETTINGS.available_to
    };
}
function hasValue(v) {
    return typeof v === "string" && v.trim().length > 0;
}
function questionHasAnyImage(q) {
    return hasValue(q.question_image) || hasValue(q.option_a_image) || hasValue(q.option_b_image) || hasValue(q.option_c_image) || hasValue(q.option_d_image);
}
function isWithinAvailabilityWindow(now, availableFrom, availableTo) {
    const from = availableFrom ? new Date(availableFrom) : null;
    const to = availableTo ? new Date(availableTo) : null;
    if (!from && !to) return true; // always available
    if (from && now < from) return false;
    if (to && now > to) return false;
    return true;
}
function shuffle(arr) {
    const a = [
        ...arr
    ];
    for(let i = a.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [
            a[j],
            a[i]
        ];
    }
    return a;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/supabase/queries.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkAdminExists",
    ()=>checkAdminExists,
    "createExamAttempt",
    ()=>createExamAttempt,
    "createExamCategory",
    ()=>createExamCategory,
    "createExamQuestion",
    ()=>createExamQuestion,
    "createNotification",
    ()=>createNotification,
    "deleteExamCategory",
    ()=>deleteExamCategory,
    "deleteExamLimit",
    ()=>deleteExamLimit,
    "deleteExamQuestion",
    ()=>deleteExamQuestion,
    "deleteNotification",
    ()=>deleteNotification,
    "getAdminStats",
    ()=>getAdminStats,
    "getExamAttempts",
    ()=>getExamAttempts,
    "getExamAttemptsWithQuestions",
    ()=>getExamAttemptsWithQuestions,
    "getExamCategories",
    ()=>getExamCategories,
    "getExamForTaking",
    ()=>getExamForTaking,
    "getExamLimits",
    ()=>getExamLimits,
    "getExamQuestions",
    ()=>getExamQuestions,
    "getExamSettings",
    ()=>getExamSettings,
    "getNotifications",
    ()=>getNotifications,
    "getPublicExamQuestions",
    ()=>getPublicExamQuestions,
    "getUsers",
    ()=>getUsers,
    "markAllNotificationsAsRead",
    ()=>markAllNotificationsAsRead,
    "markNotificationAsRead",
    ()=>markNotificationAsRead,
    "setupAdmin",
    ()=>setupAdmin,
    "toggleCategoryPublishStatus",
    ()=>toggleCategoryPublishStatus,
    "updateExamCategory",
    ()=>updateExamCategory,
    "updateExamLimit",
    ()=>updateExamLimit,
    "updateExamQuestion",
    ()=>updateExamQuestion,
    "updateExamSettings",
    ()=>updateExamSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/exam-settings.ts [app-client] (ecmascript)");
"use client";
;
;
;
async function getExamCategories() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isUserAdmin = user && (user.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase() || user.user_metadata?.role === "Admin");
    let query = supabase.from("exam_categories").select("*").order("created_at", {
        ascending: false
    });
    if (!isUserAdmin) {
        query = query.eq("is_published", true);
    }
    const { data: categories, error } = await query;
    if (error) throw error;
    return {
        categories: categories || [],
        is_admin: isUserAdmin
    };
}
async function createExamCategory(name, is_published = false) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isPrimaryAdmin = user?.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase();
    if (!user || !isPrimaryAdmin) {
        throw new Error("Unauthorized. Only primary admin can create categories.");
    }
    if (!name || name.trim() === "") {
        throw new Error("Category name is required");
    }
    const { data, error } = await supabase.from("exam_categories").insert([
        {
            name: name.trim(),
            created_by: user.id,
            is_published
        }
    ]).select().single();
    if (error) throw error;
    return {
        category: data
    };
}
async function updateExamCategory(id, name) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isPrimaryAdmin = user?.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase();
    if (!user || !isPrimaryAdmin) {
        throw new Error("Unauthorized. Only primary admin can update categories.");
    }
    if (!id || !name || name.trim() === "") {
        throw new Error("Category ID and name are required");
    }
    const { data, error } = await supabase.from("exam_categories").update({
        name: name.trim(),
        updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) throw error;
    return {
        category: data
    };
}
async function deleteExamCategory(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isPrimaryAdmin = user?.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase();
    if (!user || !isPrimaryAdmin) {
        throw new Error("Unauthorized. Only primary admin can delete categories.");
    }
    if (!id) {
        throw new Error("Category ID is required");
    }
    // First, delete all questions in this category
    const { error: questionsError } = await supabase.from("exam_questions").delete().eq("category_id", id);
    if (questionsError) throw questionsError;
    // Then delete the category
    const { error } = await supabase.from("exam_categories").delete().eq("id", id);
    if (error) throw error;
    return {
        success: true
    };
}
async function toggleCategoryPublishStatus(id, is_published) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isUserAdmin = user && (user.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase() || user.user_metadata?.role === "Admin");
    if (!user || !isUserAdmin) {
        throw new Error("Unauthorized. Admin access required.");
    }
    if (!id || typeof is_published !== "boolean") {
        throw new Error("Category ID and is_published are required");
    }
    const { data, error } = await supabase.from("exam_categories").update({
        is_published,
        updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) throw error;
    return {
        success: true,
        category: data,
        message: is_published ? "Category published" : "Category unpublished"
    };
}
async function getExamQuestions(categoryId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Unauthorized");
    }
    let query = supabase.from("exam_questions").select("*");
    if (categoryId) {
        query = query.eq("category_id", categoryId);
    }
    const { data: questions, error } = await query.order("created_at", {
        ascending: false
    });
    if (error) throw error;
    return {
        questions: questions || []
    };
}
async function getPublicExamQuestions(categoryId, search) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    let query = supabase.from("exam_questions").select("*");
    if (categoryId) {
        query = query.eq("category_id", categoryId);
    }
    if (search) {
        query = query.or(`question.ilike.%${search}%,option_a.ilike.%${search}%,option_b.ilike.%${search}%,option_c.ilike.%${search}%,option_d.ilike.%${search}%,explanation.ilike.%${search}%`);
    }
    const { data: questions, error } = await query.order("created_at", {
        ascending: false
    });
    if (error) throw error;
    return {
        questions: questions || []
    };
}
async function createExamQuestion(questionData) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Unauthorized. You must be an admin to add questions.");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canAddQuestions"])(user)) {
        throw new Error("You don't have permission to add questions");
    }
    const { category_id, question, question_image, option_a, option_a_image, option_b, option_b_image, option_c, option_c_image, option_d, option_d_image, correct_answer, explanation } = questionData;
    if (!category_id || !correct_answer) {
        throw new Error("Missing required fields");
    }
    // Validate that question has at least text OR image
    if ((!question || question.trim() === "") && (!question_image || question_image.trim() === "")) {
        throw new Error("Question must have either text or an image");
    }
    // Validate that each option has at least text OR image
    const validateOption = (text, image, optionName)=>{
        if ((!text || text.trim() === "") && (!image || image.trim() === "")) {
            return `${optionName} must have either text or an image`;
        }
        return null;
    };
    const optionErrors = [
        validateOption(option_a, option_a_image, "Option A"),
        validateOption(option_b, option_b_image, "Option B"),
        validateOption(option_c, option_c_image, "Option C"),
        validateOption(option_d, option_d_image, "Option D")
    ].filter(Boolean);
    if (optionErrors.length > 0) {
        throw new Error(optionErrors.join("; "));
    }
    if (![
        'A',
        'B',
        'C',
        'D'
    ].includes(correct_answer)) {
        throw new Error("Invalid correct answer");
    }
    // Check for duplicate question
    const normalizedQuestion = question?.trim().toLowerCase() || "";
    const { data: existingQuestions, error: checkError } = await supabase.from("exam_questions").select("id, question, option_a, option_b, option_c, option_d").eq("category_id", category_id).ilike("question", normalizedQuestion);
    if (checkError) {
        throw new Error("Error checking for duplicates");
    }
    const isDuplicate = existingQuestions?.some((q)=>{
        const normalize = (str)=>str?.trim().toLowerCase() || "";
        const questionTextMatch = normalize(q.question) === normalizedQuestion;
        const optionAMatch = normalize(q.option_a) === normalize(option_a);
        const optionBMatch = normalize(q.option_b) === normalize(option_b);
        const optionCMatch = normalize(q.option_c) === normalize(option_c);
        const optionDMatch = normalize(q.option_d) === normalize(option_d);
        return questionTextMatch && optionAMatch && optionBMatch && optionCMatch && optionDMatch;
    });
    if (isDuplicate) {
        throw new Error("A question with the same text and identical options already exists in this category");
    }
    const { data, error } = await supabase.from("exam_questions").insert([
        {
            category_id,
            question,
            question_image,
            option_a,
            option_a_image,
            option_b,
            option_b_image,
            option_c,
            option_c_image,
            option_d,
            option_d_image,
            correct_answer,
            explanation,
            created_by: user.id
        }
    ]).select().single();
    if (error) throw error;
    return {
        question: data
    };
}
async function updateExamQuestion(id, updateData) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasReadWriteQuestionAccess"])(user)) {
        throw new Error("You don't have permission to edit questions");
    }
    if (!id) {
        throw new Error("Question ID is required");
    }
    const { data, error } = await supabase.from("exam_questions").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return {
        question: data
    };
}
async function deleteExamQuestion(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasReadWriteQuestionAccess"])(user)) {
        throw new Error("You don't have permission to delete questions");
    }
    if (!id) {
        throw new Error("Question ID is required");
    }
    const { error } = await supabase.from("exam_questions").delete().eq("id", id);
    if (error) throw error;
    return {
        success: true
    };
}
async function getExamAttempts(userId, attemptId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    // If requesting specific attempt
    if (attemptId) {
        const { data: attempt, error } = await supabase.from("exam_attempts").select("*").eq("id", attemptId).single();
        if (error) throw error;
        // Users can only see their own attempts, admins can see all
        if (attempt.user_id !== user.id && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
            throw new Error("Unauthorized");
        }
        return {
            attempt
        };
    }
    // If requesting user's attempts
    if (userId) {
        if (userId !== user.id && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
            throw new Error("Unauthorized");
        }
        const { data: attempts, error } = await supabase.from("exam_attempts").select("*").eq("user_id", userId).order("started_at", {
            ascending: false
        });
        if (error) throw error;
        return {
            attempts: attempts || []
        };
    }
    // Return current user's attempts
    const { data: attempts, error } = await supabase.from("exam_attempts").select("*").eq("user_id", user.id).order("started_at", {
        ascending: false
    });
    if (error) throw error;
    return {
        attempts: attempts || []
    };
}
async function getExamAttemptsWithQuestions(attemptId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (attemptId) {
        // Get the specific attempt
        const { data: attempt, error: attemptError } = await supabase.from("exam_attempts").select("*").eq("id", attemptId).single();
        if (attemptError) throw attemptError;
        // Users can only see their own attempts, admins can see all
        if (attempt.user_id !== user.id && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
            throw new Error("Unauthorized");
        }
        // Get all question IDs from the answers
        const questionIds = attempt.answers.map((answer)=>answer.question_id);
        if (questionIds.length === 0) {
            return {
                attempt: {
                    ...attempt,
                    questions: []
                }
            };
        }
        // Fetch the full question details
        const { data: questions, error: questionsError } = await supabase.from("exam_questions").select("*").in("id", questionIds);
        if (questionsError) throw questionsError;
        // Map questions to answers
        const questionsWithAnswers = attempt.answers.map((answer)=>{
            const question = questions?.find((q)=>q.id === answer.question_id);
            return {
                ...answer,
                question: question || null
            };
        });
        return {
            attempt: {
                ...attempt,
                answers: questionsWithAnswers,
                questions: questions || []
            }
        };
    }
    throw new Error("Attempt ID is required for detailed view");
}
async function createExamAttempt(attemptData) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const { category_id, category_name, total_questions, answers, duration_seconds } = attemptData;
    if (!category_id || !category_name || !total_questions || !answers) {
        throw new Error("Missing required fields");
    }
    // Calculate score
    let correctAnswers = 0;
    const processedAnswers = answers.map((ans)=>({
            question_id: ans.question_id,
            selected_answer: ans.selected_answer,
            is_correct: ans.is_correct || false,
            time_spent_seconds: ans.time_spent_seconds
        }));
    processedAnswers.forEach((ans)=>{
        if (ans.is_correct) correctAnswers++;
    });
    const scorePercentage = Math.round(correctAnswers / total_questions * 100);
    const { data, error } = await supabase.from("exam_attempts").insert([
        {
            user_id: user.id,
            category_id,
            category_name,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_seconds,
            total_questions,
            correct_answers: correctAnswers,
            score_percentage: scorePercentage,
            answers: processedAnswers,
            status: 'completed'
        }
    ]).select().single();
    if (error) throw error;
    return {
        attempt: data
    };
}
async function getExamSettings(categoryId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const { data, error } = await supabase.from("exam_settings").select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to").eq("category_id", categoryId).maybeSingle();
    if (error) {
        const message = error.message || "";
        if (!message.toLowerCase().includes("does not exist") && !message.toLowerCase().includes("could not find the table") && !message.toLowerCase().includes("schema cache")) {
            throw error;
        }
    }
    return {
        categoryId,
        settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeExamSettings"])(data ?? undefined)
    };
}
async function updateExamSettings(categoryId, settings) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canManageExamSettings"])(user)) {
        throw new Error("Unauthorized");
    }
    if (!categoryId) {
        throw new Error("categoryId is required");
    }
    const { question_count, duration_minutes, sorting_mode, available_from, available_to } = settings;
    if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
        throw new Error("question_count must be between 1 and 200");
    }
    if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
        throw new Error("duration_minutes must be between 1 and 300");
    }
    if (![
        "RANDOM",
        "TEXT_ONLY",
        "WITH_PICTURE",
        "MIXED_50"
    ].includes(sorting_mode)) {
        throw new Error("Invalid sorting_mode");
    }
    const { data, error } = await supabase.from("exam_settings").upsert([
        {
            category_id: categoryId,
            question_count,
            duration_minutes,
            sorting_mode,
            available_from,
            available_to,
            updated_by: user.id
        }
    ], {
        onConflict: "category_id"
    }).select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to").single();
    if (error) {
        const message = error.message || "";
        if (message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("could not find the table") || message.toLowerCase().includes("schema cache")) {
            throw new Error("Missing database table exam_settings. Create it in Supabase first.");
        }
        throw error;
    }
    return {
        categoryId,
        settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeExamSettings"])(data)
    };
}
async function getExamLimits(userId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // If userId provided, check permissions
    if (userId) {
        if (userId !== user.id && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
            throw new Error("Unauthorized");
        }
        const { data: limit, error } = await supabase.from("user_exam_limits").select("*").eq("user_id", userId).single();
        if (error && error.code !== "PGRST116") throw error;
        const { count: attemptsToday, error: countError } = await supabase.from("exam_attempts").select("*", {
            count: "exact",
            head: true
        }).eq("user_id", userId).gte("started_at", today.toISOString()).lt("started_at", tomorrow.toISOString());
        if (countError) console.error("Error counting attempts:", countError);
        const isLimited = limit?.is_limited ?? true;
        const dailyLimit = limit?.daily_limit ?? 5;
        const remaining = isLimited ? Math.max(0, dailyLimit - (attemptsToday || 0)) : 999999;
        return {
            user_id: userId,
            daily_limit: dailyLimit,
            is_limited: isLimited,
            attempts_today: attemptsToday || 0,
            remaining_attempts: remaining,
            limit_exists: !!limit,
            unlimited: !isLimited
        };
    }
    // If admin, return all limits
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        const { data: limits, error } = await supabase.from("user_exam_limits").select("*");
        if (error) throw error;
        return {
            limits: limits || []
        };
    }
    // Return current user's limit
    const { data: limit, error } = await supabase.from("user_exam_limits").select("*").eq("user_id", user.id).single();
    if (error && error.code !== "PGRST116") throw error;
    const { count: attemptsToday, error: countError } = await supabase.from("exam_attempts").select("*", {
        count: "exact",
        head: true
    }).eq("user_id", user.id).gte("started_at", today.toISOString()).lt("started_at", tomorrow.toISOString());
    if (countError) console.error("Error counting attempts:", countError);
    const isLimited = limit?.is_limited ?? true;
    const dailyLimit = limit?.daily_limit ?? 5;
    const remaining = isLimited ? Math.max(0, dailyLimit - (attemptsToday || 0)) : 999999;
    return {
        user_id: user.id,
        daily_limit: dailyLimit,
        is_limited: isLimited,
        attempts_today: attemptsToday || 0,
        remaining_attempts: remaining,
        limit_exists: !!limit,
        unlimited: !isLimited
    };
}
async function updateExamLimit(user_id, daily_limit, is_limited) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Admin access required");
    }
    if (!user_id || daily_limit !== undefined && typeof daily_limit !== "number") {
        throw new Error("user_id is required, daily_limit must be a number if provided");
    }
    if (daily_limit !== undefined && (daily_limit < 1 || daily_limit > 100)) {
        throw new Error("daily_limit must be between 1 and 100");
    }
    const upsertData = {
        user_id,
        updated_at: new Date().toISOString()
    };
    if (daily_limit !== undefined) {
        upsertData.daily_limit = daily_limit;
    }
    if (is_limited !== undefined) {
        upsertData.is_limited = is_limited;
    }
    const { data, error } = await supabase.from("user_exam_limits").upsert(upsertData, {
        onConflict: "user_id"
    }).select().single();
    if (error) throw error;
    return {
        success: true,
        message: "Exam limit updated successfully",
        limit: data
    };
}
async function deleteExamLimit(userId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Admin access required");
    }
    if (!userId) {
        throw new Error("userId is required");
    }
    const { error } = await supabase.from("user_exam_limits").delete().eq("user_id", userId);
    if (error) throw error;
    return {
        success: true,
        message: "Exam limit removed. User will use default limit (5)."
    };
}
async function getExamForTaking(categoryId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!categoryId) {
        throw new Error("categoryId is required");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Get user's daily limit and unlimited status
    const { data: userLimit, error: limitError } = await supabase.from("user_exam_limits").select("daily_limit, is_limited").eq("user_id", user.id).single();
    if (limitError && limitError.code !== "PGRST116") {
        console.error("Error fetching user limit:", limitError);
    }
    const isLimited = userLimit?.is_limited ?? true;
    const dailyLimit = userLimit?.daily_limit ?? 5;
    // Count today's attempts
    const { count: attemptsToday, error: countError } = await supabase.from("exam_attempts").select("*", {
        count: "exact",
        head: true
    }).eq("user_id", user.id).gte("started_at", today.toISOString()).lt("started_at", tomorrow.toISOString());
    if (countError) {
        console.error("Error counting attempts:", countError);
    }
    const attemptsCount = attemptsToday || 0;
    // Only enforce limit if user is in limited mode
    if (isLimited && attemptsCount >= dailyLimit) {
        throw new Error(`Daily exam limit reached. You can take ${dailyLimit} exam(s) per day. Please try again tomorrow.`);
    }
    // Load settings
    const { data: rawSettings, error: settingsError } = await supabase.from("exam_settings").select("question_count,duration_minutes,sorting_mode,available_from,available_to").eq("category_id", categoryId).maybeSingle();
    if (settingsError) {
        const message = settingsError.message || "";
        if (!message.toLowerCase().includes("does not exist") && !message.toLowerCase().includes("could not find the table") && !message.toLowerCase().includes("schema cache")) {
            throw settingsError;
        }
    }
    const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeExamSettings"])(rawSettings ?? undefined);
    const now = new Date();
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isWithinAvailabilityWindow"])(now, settings.available_from, settings.available_to)) {
        throw new Error("Exam is not available at this time.");
    }
    const { data: questions, error: qError } = await supabase.from("exam_questions").select("*").eq("category_id", categoryId);
    if (qError) throw qError;
    // Pick questions based on sorting mode
    const typedQuestions = questions || [];
    const withPic = typedQuestions.filter(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["questionHasAnyImage"]);
    const textOnly = typedQuestions.filter((q)=>!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["questionHasAnyImage"])(q));
    let picked = [];
    const mode = settings.sorting_mode;
    const count = settings.question_count;
    if (mode === "TEXT_ONLY") {
        picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])(textOnly).slice(0, count);
    } else if (mode === "WITH_PICTURE") {
        picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])(withPic).slice(0, count);
    } else if (mode === "MIXED_50") {
        const half = Math.floor(count / 2);
        const first = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])(withPic).slice(0, half);
        const second = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])(textOnly).slice(0, count - first.length);
        picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])([
            ...first,
            ...second
        ]).slice(0, count);
    } else {
        // RANDOM
        picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$exam$2d$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shuffle"])(typedQuestions).slice(0, count);
    }
    const remainingAttempts = isLimited ? dailyLimit - attemptsCount - 1 : 999999;
    return {
        categoryId,
        settings,
        totalAvailable: (questions || []).length,
        questions: picked,
        serverTime: now.toISOString(),
        daily_limit: dailyLimit,
        is_limited: isLimited,
        unlimited: !isLimited,
        attempts_today: attemptsCount,
        remaining_attempts: remainingAttempts
    };
}
async function getNotifications(unreadOnly = false, limit = 50) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const userRole = user.user_metadata?.role || "student";
    const isUserAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user);
    let query = supabase.from("notifications").select("*").or(`target_user_id.eq.${user.id},target_role.eq.all`);
    if (userRole !== "Admin" && userRole !== "Teacher") {
        query = query.or("target_role.eq.student");
    }
    if (isUserAdmin) {
        query = query.or("target_role.eq.admin");
    }
    if (userRole === "Teacher") {
        query = query.or("target_role.eq.teacher");
    }
    query = query.or("expires_at.is.null,expires_at.gt.now()");
    query = query.order("created_at", {
        ascending: false
    });
    if (limit > 0) {
        query = query.limit(limit);
    }
    const { data: notifications, error } = await query;
    if (error) throw error;
    // Get read status for each notification
    const { data: readStatuses, error: readError } = await supabase.from("notification_reads").select("notification_id").eq("user_id", user.id).in("notification_id", notifications?.map((n)=>n.id) || []);
    if (readError) {
        console.error("Error fetching read statuses:", readError);
    }
    const readNotificationIds = new Set(readStatuses?.map((r)=>r.notification_id) || []);
    const notificationsWithReadStatus = notifications?.map((n)=>({
            ...n,
            is_read: readNotificationIds.has(n.id)
        })) || [];
    const result = unreadOnly ? notificationsWithReadStatus.filter((n)=>!n.is_read) : notificationsWithReadStatus;
    return {
        notifications: result,
        unread_count: notificationsWithReadStatus.filter((n)=>!n.is_read).length
    };
}
async function createNotification(notification) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Admin access required");
    }
    const { title, message, type = "info", target_role = "all", target_user_id, expires_at, related_entity_type, related_entity_id } = notification;
    if (!title || !message) {
        throw new Error("title and message are required");
    }
    const validRoles = [
        "all",
        "student",
        "admin",
        "teacher"
    ];
    if (!validRoles.includes(target_role)) {
        throw new Error(`target_role must be one of: ${validRoles.join(", ")}`);
    }
    const { data, error } = await supabase.from("notifications").insert([
        {
            title,
            message,
            type,
            target_role,
            target_user_id,
            sender_id: user.id,
            sender_name: user.user_metadata?.full_name || user.email,
            expires_at,
            related_entity_type,
            related_entity_id
        }
    ]).select().single();
    if (error) throw error;
    return {
        success: true,
        message: "Notification created successfully",
        notification: data
    };
}
async function markNotificationAsRead(notificationId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!notificationId) {
        throw new Error("notificationId is required");
    }
    const { error } = await supabase.from("notification_reads").upsert({
        notification_id: notificationId,
        user_id: user.id
    }, {
        onConflict: "notification_id,user_id"
    });
    if (error) throw error;
    return {
        success: true,
        message: "Notification marked as read"
    };
}
async function markAllNotificationsAsRead() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const { data: notifications } = await supabase.from("notifications").select("id").or(`target_user_id.eq.${user.id},target_role.eq.all`).or("expires_at.is.null,expires_at.gt.now()");
    if (!notifications || notifications.length === 0) {
        return {
            success: true,
            marked_count: 0
        };
    }
    const readRecords = notifications.map((n)=>({
            notification_id: n.id,
            user_id: user.id
        }));
    const { error } = await supabase.from("notification_reads").upsert(readRecords, {
        onConflict: "notification_id,user_id"
    });
    if (error) throw error;
    return {
        success: true,
        marked_count: notifications.length
    };
}
async function deleteNotification(notificationId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Admin access required");
    }
    if (!notificationId) {
        throw new Error("notificationId is required");
    }
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (error) throw error;
    return {
        success: true,
        message: "Notification deleted"
    };
}
async function getAdminStats() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const isUserAdmin = user && (user.email?.toLowerCase() === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PRIMARY_ADMIN_EMAIL"].toLowerCase() || user.user_metadata?.role === "Admin");
    if (!user || !isUserAdmin) {
        throw new Error("Unauthorized");
    }
    // Get user counts from Supabase Auth via a function or RPC if available
    // For now, we'll query from a user_profiles table or similar
    // Since we can't use admin client, we rely on RLS and user metadata
    // Get exam categories count
    const { count: categoryCount } = await supabase.from("exam_categories").select("*", {
        count: "exact",
        head: true
    });
    // Get questions count
    const { count: questionCount } = await supabase.from("exam_questions").select("*", {
        count: "exact",
        head: true
    });
    // Get attempts count for stats
    const { count: attemptsCount } = await supabase.from("exam_attempts").select("*", {
        count: "exact",
        head: true
    });
    // Get recent categories
    const { data: recentCategories } = await supabase.from("exam_categories").select("*").order("created_at", {
        ascending: false
    }).limit(5);
    // Get recent questions
    const { data: recentQuestions } = await supabase.from("exam_questions").select("*, exam_categories(name)").order("created_at", {
        ascending: false
    }).limit(5);
    // System status checks
    const systemStatus = {
        database: "healthy",
        supabase: "connected",
        lastUpdated: new Date().toISOString()
    };
    return {
        stats: {
            totalCategories: categoryCount || 0,
            totalQuestions: questionCount || 0,
            totalAttempts: attemptsCount || 0
        },
        recentActivity: {
            categories: recentCategories || [],
            questions: recentQuestions || []
        },
        systemStatus
    };
}
async function getUsers(type = "students") {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAdmin"])(user)) {
        throw new Error("Unauthorized - Admin access required");
    }
    // Note: Without service role, we can only get users from a profiles table
    // or use RPC functions. For now, we'll query a user_profiles table.
    // If no such table exists, this needs to be created in Supabase.
    // Get users from a custom profiles table (you need to create this)
    const { data: profiles, error } = await supabase.from("user_profiles").select("*").eq(type === "admins" ? "role" : "role", type === "admins" ? "Admin" : "Student");
    if (error) {
        console.error("Note: user_profiles table may not exist. Create it in Supabase.", error);
        return {
            users: []
        };
    }
    return {
        users: profiles || []
    };
}
async function checkAdminExists() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    // Check if admin exists by trying to sign in with a known admin
    // or check from a setup status table
    // This is a simplified version - in production you might want to use RPC
    const { data, error } = await supabase.from("admin_setup_status").select("admin_exists").single();
    if (error) {
        // If table doesn't exist, assume setup is needed
        return {
            adminExists: false
        };
    }
    return {
        adminExists: data?.admin_exists ?? false
    };
}
async function setupAdmin(email, password) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    // Create admin user using signUp (will be confirmed via email or auto-confirm)
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: "Admin",
                username: "NavoAdmin"
            }
        }
    });
    if (error) throw error;
    // Mark setup as complete
    await supabase.from("admin_setup_status").upsert({
        id: 1,
        admin_exists: true
    });
    return {
        success: true,
        message: "Admin user created successfully",
        user: data.user
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications-dropdown.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationsDropdown",
    ()=>NotificationsDropdown
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$formatDistanceToNow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/formatDistanceToNow.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/queries.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
const typeIcons = {
    info: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"],
    success: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"],
    warning: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"],
    error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"],
    exam: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
    system: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"]
};
const typeColors = {
    info: "text-blue-500 bg-blue-50",
    success: "text-green-500 bg-green-50",
    warning: "text-amber-500 bg-amber-50",
    error: "text-red-500 bg-red-50",
    exam: "text-purple-500 bg-purple-50",
    system: "text-gray-500 bg-gray-50"
};
function NotificationsDropdown() {
    _s();
    const [notifications, setNotifications] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [unreadCount, setUnreadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const fetchNotifications = async ()=>{
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getNotifications"])();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } catch  {
        // Silently fail - notifications table may not exist yet
        // This is expected until SQL migrations are applied in Supabase
        } finally{
            setLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationsDropdown.useEffect": ()=>{
            fetchNotifications();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return ({
                "NotificationsDropdown.useEffect": ()=>clearInterval(interval)
            })["NotificationsDropdown.useEffect"];
        }
    }["NotificationsDropdown.useEffect"], []);
    const markAsRead = async (notificationId)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markNotificationAsRead"])(notificationId);
            setNotifications((prev)=>prev.map((n)=>n.id === notificationId ? {
                        ...n,
                        is_read: true
                    } : n));
            setUnreadCount((prev)=>Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };
    const markAllAsRead = async ()=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markAllNotificationsAsRead"])();
            setNotifications((prev)=>prev.map((n)=>({
                        ...n,
                        is_read: true
                    })));
            setUnreadCount(0);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };
    const deleteNotification = async (notificationId)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteNotification"])(notificationId);
            setNotifications((prev)=>prev.filter((n)=>n.id !== notificationId));
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Notification deleted");
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenu"], {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                asChild: true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                    variant: "ghost",
                    size: "icon",
                    className: "relative",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/components/notifications-dropdown.tsx",
                            lineNumber: 111,
                            columnNumber: 11
                        }, this),
                        unreadCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                            variant: "destructive",
                            className: "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                            children: unreadCount > 9 ? "9+" : unreadCount
                        }, void 0, false, {
                            fileName: "[project]/components/notifications-dropdown.tsx",
                            lineNumber: 113,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/notifications-dropdown.tsx",
                    lineNumber: 110,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/notifications-dropdown.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                align: "end",
                className: "w-80 max-h-[400px] overflow-y-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between p-3 border-b",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "font-semibold",
                                children: "Notifications"
                            }, void 0, false, {
                                fileName: "[project]/components/notifications-dropdown.tsx",
                                lineNumber: 124,
                                columnNumber: 11
                            }, this),
                            unreadCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "ghost",
                                size: "sm",
                                onClick: markAllAsRead,
                                className: "text-xs h-8",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                        className: "h-3 w-3 mr-1"
                                    }, void 0, false, {
                                        fileName: "[project]/components/notifications-dropdown.tsx",
                                        lineNumber: 132,
                                        columnNumber: 15
                                    }, this),
                                    "Mark all read"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/notifications-dropdown.tsx",
                                lineNumber: 126,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/notifications-dropdown.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-center p-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                            className: "h-5 w-5 animate-spin text-muted-foreground"
                        }, void 0, false, {
                            fileName: "[project]/components/notifications-dropdown.tsx",
                            lineNumber: 140,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/notifications-dropdown.tsx",
                        lineNumber: 139,
                        columnNumber: 11
                    }, this) : notifications.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center p-8 text-muted-foreground",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                className: "h-8 w-8 mx-auto mb-2 opacity-50"
                            }, void 0, false, {
                                fileName: "[project]/components/notifications-dropdown.tsx",
                                lineNumber: 144,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm",
                                children: "No notifications yet"
                            }, void 0, false, {
                                fileName: "[project]/components/notifications-dropdown.tsx",
                                lineNumber: 145,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/notifications-dropdown.tsx",
                        lineNumber: 143,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "divide-y",
                        children: notifications.map((notification)=>{
                            const Icon = typeIcons[notification.type];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                className: `flex flex-col items-start p-3 cursor-pointer ${!notification.is_read ? "bg-muted/50" : ""}`,
                                onClick: ()=>markAsRead(notification.id),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3 w-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `p-2 rounded-full ${typeColors[notification.type]}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/notifications-dropdown.tsx",
                                                lineNumber: 161,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/notifications-dropdown.tsx",
                                            lineNumber: 160,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex-1 min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: `text-sm font-medium ${!notification.is_read ? "font-semibold" : ""}`,
                                                    children: notification.title
                                                }, void 0, false, {
                                                    fileName: "[project]/components/notifications-dropdown.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-muted-foreground line-clamp-2",
                                                    children: notification.message
                                                }, void 0, false, {
                                                    fileName: "[project]/components/notifications-dropdown.tsx",
                                                    lineNumber: 167,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-between mt-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$formatDistanceToNow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDistanceToNow"])(new Date(notification.created_at), {
                                                                addSuffix: true
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/notifications-dropdown.tsx",
                                                            lineNumber: 171,
                                                            columnNumber: 25
                                                        }, this),
                                                        !notification.is_read && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                            variant: "secondary",
                                                            className: "text-xs h-5",
                                                            children: "New"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/notifications-dropdown.tsx",
                                                            lineNumber: 175,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/notifications-dropdown.tsx",
                                                    lineNumber: 170,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/notifications-dropdown.tsx",
                                            lineNumber: 163,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "ghost",
                                            size: "icon",
                                            className: "h-6 w-6 opacity-0 group-hover:opacity-100",
                                            onClick: (e)=>{
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                className: "h-3 w-3 text-muted-foreground"
                                            }, void 0, false, {
                                                fileName: "[project]/components/notifications-dropdown.tsx",
                                                lineNumber: 190,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/notifications-dropdown.tsx",
                                            lineNumber: 181,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/notifications-dropdown.tsx",
                                    lineNumber: 159,
                                    columnNumber: 19
                                }, this)
                            }, notification.id, false, {
                                fileName: "[project]/components/notifications-dropdown.tsx",
                                lineNumber: 152,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/notifications-dropdown.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications-dropdown.tsx",
                lineNumber: 122,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications-dropdown.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_s(NotificationsDropdown, "nKAgexmNwsGEoeGeiDFLgok+RMw=");
_c = NotificationsDropdown;
var _c;
__turbopack_context__.k.register(_c, "NotificationsDropdown");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/Admin/layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$branding$2d$config$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/branding-config.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/panel-left-close.js [app-client] (ecmascript) <export default as PanelLeftClose>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/panel-left-open.js [app-client] (ecmascript) <export default as PanelLeftOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mouse$2d$pointer$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MousePointer2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mouse-pointer-2.js [app-client] (ecmascript) <export default as MousePointer2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2d$dropdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications-dropdown.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const ADMIN_EMAIL = "Navo@admin.jn";
function AdminLayout({ children }) {
    _s();
    const { config } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$branding$2d$config$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBrandingConfig"])();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sidebarOpen, setSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sidebarMode, setSidebarMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("auto");
    const [mobileMenuOpen, setMobileMenuOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showPasswordChange, setShowPasswordChange] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newPassword, setNewPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [confirmPassword, setConfirmPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [changingPassword, setChangingPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isHoveringSidebar, setIsHoveringSidebar] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isNearSidebarEdge, setIsNearSidebarEdge] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const sidebarTimeoutRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminLayout.useEffect": ()=>{
            const checkAdmin = {
                "AdminLayout.useEffect.checkAdmin": async ()=>{
                    try {
                        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])();
                        // Allow access if user is primary admin OR has Admin role
                        const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                        const hasAdminRole = user?.user_metadata?.role === "Admin";
                        if (!user || !isPrimaryAdmin && !hasAdminRole) {
                            console.log("Access denied:", {
                                email: user?.email,
                                role: user?.user_metadata?.role
                            });
                            router.push("/");
                            return;
                        }
                        setUser(user);
                        // Check if password change is required
                        if (user?.user_metadata?.require_password_change && !isPrimaryAdmin) {
                            setShowPasswordChange(true);
                        }
                        setLoading(false);
                    } catch (error) {
                        console.error("Check admin error:", error);
                        router.push("/");
                    }
                }
            }["AdminLayout.useEffect.checkAdmin"];
            checkAdmin();
        }
    }["AdminLayout.useEffect"], [
        router
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminLayout.useEffect": ()=>{
            // Close mobile menu on route change
            setMobileMenuOpen(false);
        }
    }["AdminLayout.useEffect"], [
        pathname
    ]);
    // Sidebar visibility effect based on mode
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminLayout.useEffect": ()=>{
            if (sidebarMode === "expanded") {
                setSidebarOpen(true);
            } else if (sidebarMode === "collapsed") {
                setSidebarOpen(false);
            }
        // "auto" mode is handled by the mouse detection effects
        }
    }["AdminLayout.useEffect"], [
        sidebarMode
    ]);
    // Auto-hide sidebar when cursor leaves sidebar area (only in "auto" mode)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminLayout.useEffect": ()=>{
            if (sidebarMode !== "auto") return;
            const handleMouseEnter = {
                "AdminLayout.useEffect.handleMouseEnter": ()=>{
                    setIsHoveringSidebar(true);
                    if (sidebarTimeoutRef.current) {
                        clearTimeout(sidebarTimeoutRef.current);
                        sidebarTimeoutRef.current = null;
                    }
                    setSidebarOpen(true);
                }
            }["AdminLayout.useEffect.handleMouseEnter"];
            const handleMouseLeave = {
                "AdminLayout.useEffect.handleMouseLeave": ()=>{
                    setIsHoveringSidebar(false);
                    if (sidebarTimeoutRef.current) {
                        clearTimeout(sidebarTimeoutRef.current);
                    }
                    sidebarTimeoutRef.current = setTimeout({
                        "AdminLayout.useEffect.handleMouseLeave": ()=>{
                            setSidebarOpen(false);
                        }
                    }["AdminLayout.useEffect.handleMouseLeave"], 500); // Hide after 500ms of not hovering
                }
            }["AdminLayout.useEffect.handleMouseLeave"];
            const sidebarElement = document.querySelector('[data-sidebar="true"]');
            if (sidebarElement) {
                sidebarElement.addEventListener('mouseenter', handleMouseEnter);
                sidebarElement.addEventListener('mouseleave', handleMouseLeave);
            }
            return ({
                "AdminLayout.useEffect": ()=>{
                    if (sidebarTimeoutRef.current) {
                        clearTimeout(sidebarTimeoutRef.current);
                    }
                    if (sidebarElement) {
                        sidebarElement.removeEventListener('mouseenter', handleMouseEnter);
                        sidebarElement.removeEventListener('mouseleave', handleMouseLeave);
                    }
                }
            })["AdminLayout.useEffect"];
        }
    }["AdminLayout.useEffect"], [
        sidebarMode
    ]);
    // Detect cursor near left edge of screen to show sidebar in auto mode
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminLayout.useEffect": ()=>{
            if (sidebarMode !== "auto") return;
            const handleMouseMove = {
                "AdminLayout.useEffect.handleMouseMove": (e)=>{
                    const isNearEdge = e.clientX < 20; // Within 20px of left edge
                    setIsNearSidebarEdge(isNearEdge);
                    if (isNearEdge && !sidebarOpen) {
                        setSidebarOpen(true);
                    }
                }
            }["AdminLayout.useEffect.handleMouseMove"];
            document.addEventListener('mousemove', handleMouseMove);
            return ({
                "AdminLayout.useEffect": ()=>document.removeEventListener('mousemove', handleMouseMove)
            })["AdminLayout.useEffect"];
        }
    }["AdminLayout.useEffect"], [
        sidebarMode,
        sidebarOpen
    ]);
    const handleLogout = async ()=>{
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
        await supabase.auth.signOut();
        router.push("/");
    };
    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const canViewStudentsTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canViewStudents"])(user);
    const canAddQuestionsTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canAddQuestions"])(user);
    const canViewQuestionsTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canViewQuestions"])(user);
    const handlePasswordChange = async (e)=>{
        e.preventDefault();
        if (newPassword.length < 6) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Passwords do not match");
            return;
        }
        setChangingPassword(true);
        try {
            const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
            // Update password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (passwordError) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(passwordError.message);
                return;
            }
            // Update user metadata to remove require_password_change flag
            const { error: metadataError } = await supabase.auth.updateUser({
                data: {
                    require_password_change: false,
                    role: "Admin",
                    username: user?.user_metadata?.username,
                    gender: user?.user_metadata?.gender
                }
            });
            if (metadataError) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(metadataError.message);
                return;
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Password changed successfully!");
            setShowPasswordChange(false);
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(error.message || "Failed to change password");
        } finally{
            setChangingPassword(false);
        }
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/app/Admin/layout.tsx",
                lineNumber: 223,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/Admin/layout.tsx",
            lineNumber: 222,
            columnNumber: 7
        }, this);
    }
    const navItems = [
        {
            href: "/Admin",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"],
            label: "Dashboard"
        },
        ...canViewStudentsTab ? [
            {
                href: "/Admin/users",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
                label: "Users"
            }
        ] : [],
        ...canAddQuestionsTab ? [
            {
                href: "/Admin/exams",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                label: "Exam Management"
            }
        ] : [],
        ...canViewQuestionsTab ? [
            {
                href: "/Admin/questions",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                label: "Questions"
            }
        ] : []
    ];
    const SidebarContent = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 border-b border-border flex items-center justify-between min-h-[73px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `${sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"} flex-1 min-w-0`,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/Admin",
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden",
                                        children: config.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: config.logoUrl,
                                            alt: config.systemName,
                                            className: "w-full h-full object-cover"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 243,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm font-bold",
                                            children: config.logoText || "N"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 245,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 241,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-xl font-bold text-foreground truncate",
                                                children: config.systemName
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 249,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-muted-foreground mt-1 truncate max-w-[180px]",
                                                children: user?.email
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 250,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 248,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 240,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 239,
                            columnNumber: 9
                        }, this),
                        !mobileMenuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "ghost",
                                        size: "icon",
                                        className: `hidden lg:flex flex-shrink-0 ${!sidebarOpen ? "mx-auto" : ""}`,
                                        children: [
                                            sidebarMode === "expanded" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__["PanelLeftOpen"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 263,
                                                columnNumber: 48
                                            }, this),
                                            sidebarMode === "collapsed" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__["PanelLeftClose"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 264,
                                                columnNumber: 49
                                            }, this),
                                            sidebarMode === "auto" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mouse$2d$pointer$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MousePointer2$3e$__["MousePointer2"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 265,
                                                columnNumber: 44
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 258,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 257,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                    align: "end",
                                    className: "w-48",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                            onClick: ()=>setSidebarMode("expanded"),
                                            className: sidebarMode === "expanded" ? "bg-primary/10" : "",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__["PanelLeftOpen"], {
                                                    className: "mr-2 h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 273,
                                                    columnNumber: 17
                                                }, this),
                                                "Expanded"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 269,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                            onClick: ()=>setSidebarMode("collapsed"),
                                            className: sidebarMode === "collapsed" ? "bg-primary/10" : "",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__["PanelLeftClose"], {
                                                    className: "mr-2 h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 280,
                                                    columnNumber: 17
                                                }, this),
                                                "Collapsed"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 276,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                            onClick: ()=>setSidebarMode("auto"),
                                            className: sidebarMode === "auto" ? "bg-primary/10" : "",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mouse$2d$pointer$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MousePointer2$3e$__["MousePointer2"], {
                                                    className: "mr-2 h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 287,
                                                    columnNumber: 17
                                                }, this),
                                                "Automatic"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 283,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 268,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 256,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            size: "icon",
                            className: "lg:hidden flex-shrink-0",
                            onClick: ()=>setMobileMenuOpen(false),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 300,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 294,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/Admin/layout.tsx",
                    lineNumber: 237,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                    className: "flex-1 p-4 space-y-2 overflow-y-auto",
                    children: [
                        navItems.map((item)=>{
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                className: `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"} ${!sidebarOpen && !mobileMenuOpen ? "lg:justify-center" : ""}`,
                                title: !sidebarOpen && !mobileMenuOpen ? item.label : undefined,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        className: "h-5 w-5 flex-shrink-0"
                                    }, void 0, false, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 319,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 320,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, item.href, true, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 309,
                                columnNumber: 13
                            }, this);
                        }),
                        mobileMenuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "border-t border-border my-2"
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 330,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/Admin/settings",
                                    className: `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${pathname === "/Admin/settings" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                            className: "h-5 w-5 flex-shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 339,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Settings"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 340,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 331,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleLogout,
                                    className: "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left text-destructive hover:bg-destructive/10",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                            className: "h-5 w-5 flex-shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 346,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Logout"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 347,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 342,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/Admin/layout.tsx",
                    lineNumber: 304,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-background",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/Admin",
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden",
                                children: config.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: config.logoUrl,
                                    alt: config.systemName,
                                    className: "w-full h-full object-cover"
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 362,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-sm font-bold",
                                    children: config.logoText || "N"
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 364,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 360,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-lg font-bold text-foreground truncate",
                                children: config.systemName
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 367,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/Admin/layout.tsx",
                        lineNumber: 359,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        variant: "ghost",
                        size: "icon",
                        onClick: ()=>setMobileMenuOpen(true),
                        className: "text-foreground",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                            className: "h-6 w-6"
                        }, void 0, false, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 375,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/Admin/layout.tsx",
                        lineNumber: 369,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/Admin/layout.tsx",
                lineNumber: 358,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex h-[calc(100vh-56px)] lg:h-screen",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        "data-sidebar": "true",
                        className: `hidden lg:flex bg-card border-r border-border flex-col transition-all duration-300 sticky top-0 h-screen ${sidebarOpen ? "w-64" : "w-20"}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarContent, {}, void 0, false, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 387,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/Admin/layout.tsx",
                        lineNumber: 381,
                        columnNumber: 9
                    }, this),
                    mobileMenuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "fixed inset-0 bg-black/50 z-40 lg:hidden",
                                onClick: ()=>setMobileMenuOpen(false)
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 393,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                                className: "fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex-col z-50 lg:hidden flex",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarContent, {}, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 398,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 397,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 overflow-auto bg-background relative isolate",
                        style: {
                            zIndex: 1
                        },
                        onMouseEnter: ()=>{
                            // In auto mode, when entering main content, keep sidebar behavior based on cursor position
                            if (sidebarMode === "auto" && !isHoveringSidebar && !isNearSidebarEdge) {
                                // Only hide if we're not near the edge and not hovering sidebar
                                if (sidebarTimeoutRef.current) {
                                    clearTimeout(sidebarTimeoutRef.current);
                                }
                                sidebarTimeoutRef.current = setTimeout(()=>{
                                    setSidebarOpen(false);
                                }, 300);
                            }
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                className: "hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-card sticky top-0 z-30",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden",
                                                children: config.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: config.logoUrl,
                                                    alt: config.systemName,
                                                    className: "w-full h-full object-cover"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 425,
                                                    columnNumber: 19
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-sm font-bold",
                                                    children: config.logoText || "N"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 427,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 423,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                        className: "text-xl font-bold text-foreground",
                                                        children: config.systemName
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/Admin/layout.tsx",
                                                        lineNumber: 431,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-muted-foreground",
                                                        children: "Admin Panel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/Admin/layout.tsx",
                                                        lineNumber: 432,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 430,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 422,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2d$dropdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationsDropdown"], {}, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 437,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/Admin/settings",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "ghost",
                                                    size: "icon",
                                                    className: "h-9 w-9",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                        className: "h-5 w-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/Admin/layout.tsx",
                                                        lineNumber: 440,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/Admin/layout.tsx",
                                                    lineNumber: 439,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 438,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "ghost",
                                                onClick: handleLogout,
                                                className: "group h-9 px-2 transition-all duration-300 ease-in-out overflow-hidden w-9 hover:w-auto hover:px-3 text-destructive hover:text-destructive hover:bg-destructive/10",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                                        className: "h-5 w-5 flex-shrink-0"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/Admin/layout.tsx",
                                                        lineNumber: 449,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "ml-2 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300",
                                                        children: "Logout"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/Admin/layout.tsx",
                                                        lineNumber: 450,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 444,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 436,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 421,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 lg:p-8",
                                children: children
                            }, void 0, false, {
                                fileName: "[project]/app/Admin/layout.tsx",
                                lineNumber: 457,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/Admin/layout.tsx",
                        lineNumber: 404,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/Admin/layout.tsx",
                lineNumber: 379,
                columnNumber: 7
            }, this),
            showPasswordChange && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3 mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-2 bg-amber-100 rounded-full",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                        className: "h-5 w-5 text-amber-600"
                                    }, void 0, false, {
                                        fileName: "[project]/app/Admin/layout.tsx",
                                        lineNumber: 469,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 468,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-bold",
                                    children: "Change Password Required"
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 471,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 467,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-muted-foreground mb-6",
                            children: "For security reasons, you must change your default password (admin1234) before continuing."
                        }, void 0, false, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 474,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handlePasswordChange,
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            htmlFor: "new-password",
                                            children: "New Password"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 480,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            id: "new-password",
                                            type: "password",
                                            value: newPassword,
                                            onChange: (e)=>setNewPassword(e.target.value),
                                            placeholder: "Enter new password",
                                            required: true,
                                            minLength: 6
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 481,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 479,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            htmlFor: "confirm-password",
                                            children: "Confirm Password"
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 493,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            id: "confirm-password",
                                            type: "password",
                                            value: confirmPassword,
                                            onChange: (e)=>setConfirmPassword(e.target.value),
                                            placeholder: "Confirm new password",
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/app/Admin/layout.tsx",
                                            lineNumber: 494,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 492,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "submit",
                                    className: "w-full",
                                    disabled: changingPassword,
                                    children: changingPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 511,
                                                columnNumber: 21
                                            }, this),
                                            "Changing Password..."
                                        ]
                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                                className: "h-4 w-4 mr-2"
                                            }, void 0, false, {
                                                fileName: "[project]/app/Admin/layout.tsx",
                                                lineNumber: 516,
                                                columnNumber: 21
                                            }, this),
                                            "Change Password"
                                        ]
                                    }, void 0, true)
                                }, void 0, false, {
                                    fileName: "[project]/app/Admin/layout.tsx",
                                    lineNumber: 504,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/Admin/layout.tsx",
                            lineNumber: 478,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/Admin/layout.tsx",
                    lineNumber: 466,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/Admin/layout.tsx",
                lineNumber: 465,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/Admin/layout.tsx",
        lineNumber: 356,
        columnNumber: 5
    }, this);
}
_s(AdminLayout, "TMpqZ+P/SZpxTBLMt3NyOTPyr2o=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$branding$2d$config$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBrandingConfig"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = AdminLayout;
var _c;
__turbopack_context__.k.register(_c, "AdminLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0us5v4t._.js.map