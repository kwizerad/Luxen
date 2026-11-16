// Shared normalization & resilient fallback helpers for all exam pipelines

export function sanitizeImageUrl(img: unknown): string | null {
  if (typeof img !== "string") return null;
  const trimmed = img.trim();
  if (
    !trimmed ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "N/A"
  ) {
    return null;
  }
  return trimmed;
}

export function normalizeChoiceText(val: unknown, fallbackLabel: string): string {
  if (val === null || val === undefined) return fallbackLabel;
  const s = String(val).trim();
  return s.length > 0 ? s : fallbackLabel;
}

export function normalizeExamQuestion<T extends Record<string, any>>(
  q: T,
  index = 0,
  categoryId?: string
): T {
  const id = q.id != null && String(q.id).trim() !== "" ? String(q.id) : `q-${index + 1}`;
  const rawQuestion =
    q.question !== undefined && q.question !== null
      ? String(q.question).trim()
      : q.title !== undefined && q.title !== null
      ? String(q.title).trim()
      : "";

  const normalized: Record<string, any> = {
    ...q,
    id,
    question: rawQuestion || `Question ${index + 1}`,
    question_image: sanitizeImageUrl(q.question_image ?? q.image),
    option_a: normalizeChoiceText(q.option_a, "Option A"),
    option_a_image: sanitizeImageUrl(q.option_a_image),
    option_b: normalizeChoiceText(q.option_b, "Option B"),
    option_b_image: sanitizeImageUrl(q.option_b_image),
    option_c: normalizeChoiceText(q.option_c, "Option C"),
    option_c_image: sanitizeImageUrl(q.option_c_image),
    option_d: normalizeChoiceText(q.option_d, "Option D"),
    option_d_image: sanitizeImageUrl(q.option_d_image),
  };

  if (categoryId && !normalized.category_id) {
    normalized.category_id = categoryId;
  }

  return normalized as T;
}

export function createSeededRng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function seededShuffleArray<T>(array: T[], seed: string): T[] {
  const rng = createSeededRng(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getBuiltinFallbackQuestions(categoryId = "fallback", count = 20) {
  const now = new Date().toISOString();
  const base = [
    {
      id: "fallback-q1",
      question: "What should a driver do when encountering a steady red traffic light?",
      option_a: "Stop completely before the stop line or crosswalk",
      option_b: "Slow down and proceed with caution if road is clear",
      option_c: "Turn right immediately without stopping",
      option_d: "Accelerate to pass through before other cars move",
      correct_answer: "A",
      explanation: "A steady red light requires all drivers to come to a complete stop.",
    },
    {
      id: "fallback-q2",
      question: "What is the general speed limit in built-up urban areas in Rwanda unless otherwise posted?",
      option_a: "30 km/h",
      option_b: "40 km/h",
      option_c: "50 km/h",
      option_d: "60 km/h",
      correct_answer: "C",
      explanation: "In urban areas and built-up zones, the standard speed limit is 50 km/h.",
    },
    {
      id: "fallback-q3",
      question: "When approaching a pedestrian crossing where pedestrians are waiting to cross, what is your obligation?",
      option_a: "Sound your horn to warn them",
      option_b: "Yield right of way and stop to allow them to cross safely",
      option_c: "Maintain your speed if you are closer to the crossing",
      option_d: "Pass behind them quickly",
      correct_answer: "B",
      explanation: "Drivers must always yield right of way to pedestrians at marked crosswalks.",
    },
    {
      id: "fallback-q4",
      question: "What does a triangular yield sign (give way) require you to do?",
      option_a: "Stop completely in all circumstances",
      option_b: "Give right of way to traffic on the major road",
      option_c: "Speed up to merge before other vehicles",
      option_d: "Flash your headlights and proceed",
      correct_answer: "B",
      explanation: "A yield sign requires you to slow down and give right of way to intersecting traffic.",
    },
    {
      id: "fallback-q5",
      question: "Where is overtaking strictly prohibited?",
      option_a: "On multi-lane one-way streets",
      option_b: "On curves, blind summits, and intersections with restricted visibility",
      option_c: "When the vehicle ahead is traveling slowly",
      option_d: "During daytime hours",
      correct_answer: "B",
      explanation: "Overtaking is strictly prohibited where visibility is impaired such as curves and hillcrests.",
    },
    {
      id: "fallback-q6",
      question: "What is the legal blood alcohol concentration (BAC) limit enforced for drivers in Rwanda?",
      option_a: "0.00% (Zero tolerance)",
      option_b: "0.08%",
      option_c: "0.10%",
      option_d: "0.15%",
      correct_answer: "A",
      explanation: "Rwanda enforces strict regulations against driving under the influence of alcohol.",
    },
    {
      id: "fallback-q7",
      question: "What action must you take when an emergency vehicle approaches with flashing lights and sirens?",
      option_a: "Speed up to stay ahead of it",
      option_b: "Pull over safely to the right side of the road and yield",
      option_c: "Brake suddenly in the middle of an intersection",
      option_d: "Ignore it if traffic is moving",
      correct_answer: "B",
      explanation: "Drivers must yield and clear the road for authorized emergency vehicles.",
    },
    {
      id: "fallback-q8",
      question: "What does a solid continuous line along the center of the road mean?",
      option_a: "Overtaking is permitted with caution",
      option_b: "Crossing the line to overtake is prohibited",
      option_c: "Parking is allowed along the median",
      option_d: "Reversing lane",
      correct_answer: "B",
      explanation: "Solid continuous center lines indicate that crossing or overtaking is prohibited.",
    },
    {
      id: "fallback-q9",
      question: "What should you check before starting a journey in your vehicle?",
      option_a: "Tyre pressure, brakes, lights, mirrors, and fluid levels",
      option_b: "Only the radio station",
      option_c: "Passenger seat headrests only",
      option_d: "None of the above",
      correct_answer: "A",
      explanation: "Routine vehicle safety checks ensure roadworthiness and prevent accidents.",
    },
    {
      id: "fallback-q10",
      question: "When entering a roundabout, who normally has priority?",
      option_a: "Vehicles approaching from outside the roundabout",
      option_b: "Vehicles already circulating inside the roundabout",
      option_c: "Heavy trucks only",
      option_d: "Motorcycles only",
      correct_answer: "B",
      explanation: "Traffic entering a roundabout must yield to vehicles already circulating inside it.",
    },
  ];

  return base.slice(0, Math.max(1, Math.min(count, base.length))).map((item) => ({
    ...item,
    category_id: categoryId,
    question_image: null,
    option_a_image: null,
    option_b_image: null,
    option_c_image: null,
    option_d_image: null,
    created_at: now,
    created_by: "system",
  }));
}
