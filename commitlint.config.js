export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["update", "add", "fix"]],
    "subject-case": [0], // Allow any case for the subject
  },
};
