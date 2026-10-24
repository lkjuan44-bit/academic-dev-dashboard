export const MAX_GRADE = 5;
export const DEFAULT_MIN_PASSING_GRADE = 3;
export const TOTAL_COURSE_WEIGHT = 100;

export interface WeightedGrade {
  /** Grade from 0 to 5, or null while this assessment is unevaluated. */
  score: number | null;
  /** Percentage points of the course grade, from 0 to 100. */
  weight: number;
}

export type RequirementStatus = "achieved" | "possible" | "impossible";

export interface RequiredAverageResult {
  /** Average required across all unevaluated course weight; null if none remains. */
  requiredAverage: number | null;
  remainingWeight: number;
  status: RequirementStatus;
}

function validateWeight(weight: number, label: string): void {
  if (!Number.isFinite(weight) || weight < 0 || weight > TOTAL_COURSE_WEIGHT) {
    throw new RangeError(`${label} must be a finite percentage between 0 and 100.`);
  }
}

function validateGrades(grades: readonly WeightedGrade[]): void {
  let totalWeight = 0;

  for (const [index, grade] of grades.entries()) {
    validateWeight(grade.weight, `Grade at index ${index} weight`);

    if (
      grade.score !== null &&
      (!Number.isFinite(grade.score) || grade.score < 0 || grade.score > MAX_GRADE)
    ) {
      throw new RangeError(`Grade at index ${index} score must be between 0 and 5.`);
    }

    totalWeight += grade.weight;
  }

  if (totalWeight > TOTAL_COURSE_WEIGHT) {
    throw new RangeError("The sum of grade weights cannot exceed 100.");
  }
}

function validatePassingGrade(minPassingGrade: number): void {
  if (
    !Number.isFinite(minPassingGrade) ||
    minPassingGrade < 0 ||
    minPassingGrade > MAX_GRADE
  ) {
    throw new RangeError("The minimum passing grade must be between 0 and 5.");
  }
}

/**
 * Returns the normalized weighted average of evaluated assessments, or null
 * when no assessment has been evaluated yet.
 */
export function calculateWeightedAverage(
  grades: readonly WeightedGrade[],
): number | null {
  validateGrades(grades);

  let weightedPoints = 0;
  let evaluatedWeight = 0;

  for (const grade of grades) {
    if (grade.score === null) {
      continue;
    }

    weightedPoints += grade.score * grade.weight;
    evaluatedWeight += grade.weight;
  }

  if (evaluatedWeight === 0) {
    return null;
  }

  return weightedPoints / evaluatedWeight;
}

/**
 * Calculates the mean needed across all remaining course weight to reach the
 * minimum final grade. If no weight remains, requiredAverage is null unless the
 * target has already been reached (in which case it is zero).
 */
export function calculateRequiredAverage(
  grades: readonly WeightedGrade[],
  minPassingGrade = DEFAULT_MIN_PASSING_GRADE,
  totalCourseWeight = TOTAL_COURSE_WEIGHT,
): RequiredAverageResult {
  validateGrades(grades);
  validatePassingGrade(minPassingGrade);
  validateWeight(totalCourseWeight, "Total course weight");

  const representedWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
  if (representedWeight > totalCourseWeight) {
    throw new RangeError("Grade weights cannot exceed the total course weight.");
  }

  let earnedWeightedPoints = 0;
  let evaluatedWeight = 0;

  for (const grade of grades) {
    if (grade.score === null) {
      continue;
    }
    earnedWeightedPoints += grade.score * grade.weight;
    evaluatedWeight += grade.weight;
  }

  const remainingWeight = totalCourseWeight - evaluatedWeight;
  const targetWeightedPoints = minPassingGrade * totalCourseWeight;
  const pointsStillNeeded = targetWeightedPoints - earnedWeightedPoints;

  if (pointsStillNeeded <= 0) {
    return { requiredAverage: 0, remainingWeight, status: "achieved" };
  }

  if (remainingWeight === 0) {
    return { requiredAverage: null, remainingWeight, status: "impossible" };
  }

  const requiredAverage = pointsStillNeeded / remainingWeight;
  if (requiredAverage > MAX_GRADE) {
    return { requiredAverage, remainingWeight, status: "impossible" };
  }

  return { requiredAverage, remainingWeight, status: "possible" };
}
