import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRequiredAverage,
  calculateWeightedAverage,
  DEFAULT_MIN_PASSING_GRADE,
  type WeightedGrade,
} from "./grade-calculator";

test("uses the normalized weighted average of evaluated cuts", () => {
  const grades: WeightedGrade[] = [
    { score: 4, weight: 20 },
    { score: 2, weight: 30 },
    { score: null, weight: 50 },
  ];

  assert.equal(calculateWeightedAverage(grades), 2.8);
});

test("calculates the required average over the unevaluated course weight", () => {
  const grades: WeightedGrade[] = [
    { score: 4, weight: 20 },
    { score: 2, weight: 30 },
    { score: null, weight: 50 },
  ];

  assert.deepEqual(calculateRequiredAverage(grades), {
    requiredAverage: 3.2,
    remainingWeight: 50,
    status: "possible",
  });
});

test("uses the default passing grade when all course weight remains", () => {
  const result = calculateRequiredAverage([]);

  assert.equal(DEFAULT_MIN_PASSING_GRADE, 3);
  assert.deepEqual(result, {
    requiredAverage: 3,
    remainingWeight: 100,
    status: "possible",
  });
  assert.equal(calculateWeightedAverage([]), null);
});

test("reports a passing target already reached", () => {
  assert.deepEqual(calculateRequiredAverage([{ score: 3.5, weight: 100 }]), {
    requiredAverage: 0,
    remainingWeight: 0,
    status: "achieved",
  });
});

test("reports when the required remaining average exceeds the 0-5 scale", () => {
  const result = calculateRequiredAverage([{ score: 0, weight: 90 }]);

  assert.equal(result.status, "impossible");
  assert.equal(result.remainingWeight, 10);
  assert.equal(result.requiredAverage, 30);
});

test("rejects scores and weights outside the supported ranges", () => {
  assert.throws(
    () => calculateWeightedAverage([{ score: 5.1, weight: 50 }]),
    RangeError,
  );
  assert.throws(
    () => calculateRequiredAverage([{ score: 4, weight: 101 }]),
    RangeError,
  );
});
