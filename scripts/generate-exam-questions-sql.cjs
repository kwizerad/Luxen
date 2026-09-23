const fs = require('fs');
const path = require('path');

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'parsed-questions.json'), 'utf-8'));

const categoryUuid = process.env.CATEGORY_UUID;
const adminUuid = process.env.ADMIN_UUID || 'NULL';

const columns = [
  'category_id','question','question_image',
  'option_a','option_a_image','option_b','option_b_image',
  'option_c','option_c_image','option_d','option_d_image',
  'correct_answer','explanation','created_by'
];

function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  let s = str.replace(/\\/g, '\\\\').replace(/\$/g, '\$');
  return `$q$${s}$q$`;
}

const categoryName = 'Amategeko y\'umuhanda';

function createdByExpr() {
  if (adminUuid === 'NULL') return 'NULL';
  return `$q$${adminUuid}$q$`;
}

function makeValues(catIdExpr) {
  const creator = createdByExpr();
  return parsed.map((r) => {
    const rowComment = r.issue ? `  -- Q${r.question_number}: ${r.issue}` : '';
    const pictureNote = r.is_picture_question ? `  -- Q${r.question_number}: picture/sign question (image URLs left NULL)` : '';
    const rowValues = [
      catIdExpr,
      esc(r.question),
      'NULL',
      esc(r.option_a),
      'NULL',
      esc(r.option_b),
      'NULL',
      esc(r.option_c),
      'NULL',
      esc(r.option_d),
      'NULL',
      esc(r.correct_answer),
      esc(r.explanation),
      creator,
    ];
    return `${rowComment}${pictureNote ? '\n' + pictureNote : ''}
  (${rowValues.join(',')})`;
  }).join(',\n');
}

// 1. Placeholder version (replace <CATEGORY_UUID>)
let placeholderSql = `-- Bulk insert for standalone exam_questions
-- Generated from scripts/parsed-questions.json
-- IMPORTANT: Replace <CATEGORY_UUID> with the actual exam category UUID before running.

BEGIN;

INSERT INTO exam_questions (${columns.join(',')}) VALUES
${makeValues('$q$<CATEGORY_UUID>$q$')};

COMMIT;
`;

fs.writeFileSync(path.join(__dirname, 'ibibazo-exam-questions.sql'), placeholderSql, 'utf-8');

// 2. Self-contained version (creates the category)
let selfContainedSql = `-- Bulk insert for standalone exam_questions
-- Creates an exam category and inserts all questions into it.
-- This avoids needing to know an existing category UUID.

DO $$
DECLARE
  cat_id UUID;
BEGIN
  INSERT INTO exam_categories (name, is_published, created_by)
  VALUES ('${categoryName}', true, ${createdByExpr()})
  RETURNING id INTO cat_id;

  INSERT INTO exam_settings (category_id, question_count, duration_minutes, sorting_mode, updated_by)
  VALUES (cat_id, 20, 20, 'RANDOM', ${createdByExpr()});

  INSERT INTO exam_questions (${columns.join(',')}) VALUES
${makeValues('cat_id')};
END $$;
`;

fs.writeFileSync(path.join(__dirname, 'ibibazo-exam-questions-with-category.sql'), selfContainedSql, 'utf-8');

// 3. Ready version using provided CATEGORY_UUID (and optional ADMIN_UUID)
if (categoryUuid) {
  let readySql = `-- Bulk insert for standalone exam_questions
-- Generated from scripts/parsed-questions.json
-- Uses category: ${categoryUuid}

BEGIN;

INSERT INTO exam_settings (category_id, question_count, duration_minutes, sorting_mode, updated_by)
VALUES ($q$${categoryUuid}$q$, 20, 20, 'RANDOM', ${createdByExpr()})
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO exam_questions (${columns.join(',')}) VALUES
${makeValues(`$q$${categoryUuid}$q$`)};

COMMIT;
`;
  fs.writeFileSync(path.join(__dirname, 'ibibazo-exam-questions-ready.sql'), readySql, 'utf-8');
}

console.log('Wrote:');
console.log('  scripts/ibibazo-exam-questions.sql');
console.log('  scripts/ibibazo-exam-questions-with-category.sql');
if (categoryUuid) {
  console.log('  scripts/ibibazo-exam-questions-ready.sql');
}
